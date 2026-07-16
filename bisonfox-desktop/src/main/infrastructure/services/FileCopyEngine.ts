import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { CopyOptions, CopySummary } from '@main/domain/interfaces/IFileService'
import { IFileScanner } from '@main/domain/interfaces/IFileScanner'
import { BackpressureGate } from './BackpressureGate'
import { AsyncSemaphore } from './AsyncSemaphore'
import { config } from '@main/appConfig'
import { FailedFile } from '@shared/entities/FailedFile'

const EXCLUDED = new Set<string>([])
const COPY_CONCURRENCY = config.copyConcurrency
const HEAVY_FILE_THRESHOLD = config.heavyFileThresholdMb * 1024 * 1024
const FAIL_INTERVAL_MS = config.failIntervalMs
const FAIL_RETRIES = config.failRetries
const MOVE_RETRIES = config.moveRetries
const REPORT_COPIED_FILES_INTERVAL_MS = config.reportCopiedFilesIntervalMs
const MAX_REPORTED_FAILURES = config.maxReportedFailures

// Only allow 4 massive files (>100MB) to copy simultaneously
const heavyLock = new AsyncSemaphore(4)

/**
 * Copies a single file from the source path to the destination path.
 * Checks file size first, and if it exceeds the heavy threshold, acquires a permit
 * from `heavyLock` to limit simultaneous large-file network and disk I/O.
 *
 * @param src The source file path.
 * @param dest The destination file path.
 * @param signal Optional AbortSignal to cancel the copy.
 * @returns A promise resolving to the file size in bytes upon success.
 */
async function copyOneFast(
  src: string,
  dest: string,
  signal?: AbortSignal,
  onProgressBytes?: (chunkSize: number) => void
): Promise<number> {
  const st = await fs.promises.stat(src).catch(() => null)
  if (!st) throw new Error('File not accessible')

  if (signal?.aborted) return 0

  const doCopy = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let aborted = false
      const onAbort = () => {
        aborted = true
        readStream.destroy()
        writeStream.destroy()
        reject(new Error('Aborted'))
      }

      if (signal) {
        if (signal.aborted) return reject(new Error('Aborted'))
        signal.addEventListener('abort', onAbort)
      }

      const readStream = fs.createReadStream(src)
      const writeStream = fs.createWriteStream(dest)

      readStream.on('data', (chunk) => {
        if (aborted) return
        if (onProgressBytes) onProgressBytes(chunk.length)
      })

      readStream.on('error', (err) => {
        if (signal) signal.removeEventListener('abort', onAbort)
        writeStream.destroy()
        reject(err)
      })

      writeStream.on('error', (err) => {
        if (signal) signal.removeEventListener('abort', onAbort)
        readStream.destroy()
        reject(err)
      })

      writeStream.on('finish', () => {
        if (signal) signal.removeEventListener('abort', onAbort)
        resolve()
      })

      readStream.pipe(writeStream)
    })
  }

  if (st.size > HEAVY_FILE_THRESHOLD) {
    await heavyLock.acquire()
    try {
      if (signal?.aborted) return 0
      await doCopy()
    } finally {
      heavyLock.release()
    }
    return st.size
  }

  await doCopy()
  return st.size
}

/**
 * Moves a staged file to its final destination while holding open OS-level handles
 * on both the source file and every directory segment from uploadBaseDir down to
 * the file's immediate parent directory.
 *
 * Holding those handles means:
 *   - The staging file cannot be deleted by another process during the move.
 *   - The newly-created destination directories cannot be rmdir'd between mkdir and rename.
 *
 * All handles are released only after the rename succeeds or throws.
 *
 * @param srcPath      Absolute path of the staged file (in tempBaseDir).
 * @param destPath     Absolute path of the final file (in uploadBaseDir).
 * @param uploadBaseDir Root of the upload destination tree — handles are opened from here down.
 */
async function atomicMoveWithHandles(
  srcPath: string,
  destPath: string,
  uploadBaseDir: string
): Promise<void> {
  const destDir = path.dirname(destPath)
  const dirHandles: fs.promises.FileHandle[] = []

  // 1. Acquire handle on the staging file. Held open through the rename so
  //    no external process can delete it while we are working.
  const fileHandle = await fs.promises.open(srcPath, 'r')

  try {
    // 2. Create all missing destination directory segments.
    await fs.promises.mkdir(destDir, { recursive: true }).catch((err) => {
      logger.error('FileCopyEngine', `Failed to make directory in destination directory: ${destDir}`, { error: err.message })
    })

    // 3. Open a handle on every directory segment from uploadBaseDir → destDir.
    //    On Windows, fs.promises.open on a dir uses FILE_FLAG_BACKUP_SEMANTICS
    //    and returns a real directory handle. Holding it blocks rmdir on that dir.
    const baseNorm = path.resolve(uploadBaseDir)
    const destDirNorm = path.resolve(destDir)

    if (destDirNorm.toLowerCase().startsWith(baseNorm.toLowerCase())) {
      let cursor = baseNorm
      try { 
        dirHandles.push(await fs.promises.open(cursor, 'r')) 
      } catch (err: any) {
        logger.error('FileCopyEngine', `Failed to acquire handle for directory: ${cursor}`, { error: err.message })
      }

      const relative = path.relative(baseNorm, destDirNorm)
      for (const part of relative.split(path.sep).filter(Boolean)) {
        cursor = path.join(cursor, part)
        try { 
          dirHandles.push(await fs.promises.open(cursor, 'r')) 
        } catch (err: any) {
          logger.error('FileCopyEngine', `Failed to acquire handle for directory: ${cursor}`, { error: err.message })
        }
      }
    }

    // 4. Atomic rename — the file handle survives this on NTFS because handles
    //    are bound to the file object (file ID), not to the path.
    await fs.promises.rename(srcPath, destPath)

  } catch (err: any) {
    logger.error('FileCopyEngine', `Failed to atomically move staged file: ${srcPath} -> ${destPath}`, { error: err.message })
    throw err
  } finally {
    // 5. Release all handles. If rename succeeded the file now lives at destPath;
    //    if it failed nothing was moved.
    if (fileHandle) {
      await fileHandle.close().catch(() => {})
    }
    for (const dh of dirHandles) {
      await dh.close().catch(() => {})
    }
  }
}

/**
 * Executes a concurrent, throttled copy sequence that migrates selected paths to a target directory.
 * Utilizes `IFileScanner` to continuously discover paths in the background while workers process the queue.
 * Integrates `BackpressureGate` to limit memory growth and applies automatic retries on worker failures.
 *
 * @param scanner The scanner implementation used to walk directories in parallel.
 * @param initialPaths Array of file or directory paths to copy.
 * @param destination Target directory to copy files to.
 * @param options Copy options and progress/scanning callback configuration.
 */
export async function copyFiles(
  scanner: IFileScanner,
  initialPaths: string[],
  destination: string,
  options: CopyOptions
): Promise<CopySummary> {
  const {
    basePath,
    finalDest,
    excludedFiles,
    expectedTotal,
    expectedTotalBytes,
    signal,
    onScan,
    onProgress
  } = options

  const internalController = new AbortController()
  const triggerExternalAbort = (): void => internalController.abort()

  if (signal) {
    if (signal.aborted) {
      return {
        completedFiles: 0,
        completedBytes: 0,
        failedCount: 0,
        failedFiles: [],
        totalFilesAmount: 0,
        totalBytes: 0
      }
    }
    signal.addEventListener('abort', triggerExternalAbort)
  }

  const activeSignal = internalController.signal

  const inferredBase =
    basePath ??
    (() => {
      const first = initialPaths[0]
      if (first?.includes(':')) {
        const driveMatch = first.match(/^[a-zA-Z]:\\/)
        if (driveMatch) return driveMatch[0]
      }
      return path.dirname(initialPaths[0] ?? destination)
    })()

  const excludedSet = new Set<string>(excludedFiles ?? [])

  if (initialPaths.length === 0) {
    return {
      completedFiles: 0,
      completedBytes: 0,
      failedCount: 0,
      failedFiles: [],
      totalFilesAmount: 0,
      totalBytes: 0
    }
  }

  await fs.promises.mkdir(destination, { recursive: true }).catch(() => {})

  const resolvedTotalBytes = expectedTotalBytes || 0

  const queue: { src: string; destPath: string; finalPath: string }[] = []
  let isScanningDone = false
  let totalDiscovered = 0

  // Backpressure: pause scanner when queue > 10k, resume when < 5k
  const gate = new BackpressureGate(10_000, 5_000)
  const mkdirCache = new Set<string>()

  const failedFiles: FailedFile[] = []
  let failedCount = 0

  const scanPromise = scanner
    .expandPaths(
      initialPaths,
      inferredBase,
      EXCLUDED,
      COPY_CONCURRENCY,
      (count: number) => {
        totalDiscovered = count
        if (onScan) onScan(count)
      },
      excludedSet,
      (src, rel) => {
        totalDiscovered++
        const stagingPath = path.join(destination, rel)
        const trueFinalPath = finalDest ? path.join(finalDest, rel) : stagingPath
        queue.push({ src, destPath: stagingPath, finalPath: trueFinalPath })
      },
      () => {},
      (failedPath, errorMsg) => {
        failedCount++
        if (failedFiles.length < MAX_REPORTED_FAILURES) {
          failedFiles.push({ path: failedPath, reason: errorMsg })
        }
        logger.error('FileService', `Scan failure: ${failedPath}`, { error: errorMsg })
      },
      activeSignal,
      gate
    )
    .then(() => {
      isScanningDone = true
    })

  let completedFiles = 0
  let completedBytes = 0
  let lastBroadcastTime = Date.now()

  let reportTimer: NodeJS.Timeout | null = null
  let lastReportFile = ''
  let lastReportPct = 0

  const throttledReport = (file: string, pct: number): void => {
    lastReportFile = file
    lastReportPct = pct

    const now = Date.now()
    if (now - lastBroadcastTime >= REPORT_COPIED_FILES_INTERVAL_MS) {
      if (reportTimer) {
        clearTimeout(reportTimer)
        reportTimer = null
      }
      lastBroadcastTime = now
      const totalFilesAmount = expectedTotal ?? totalDiscovered
      const totalBytes = resolvedTotalBytes
      onProgress(
        file,
        pct,
        completedFiles,
        completedBytes,
        failedCount,
        failedFiles,
        totalFilesAmount,
        totalBytes
      )
    } else if (!reportTimer) {
      reportTimer = setTimeout(
        () => {
          reportTimer = null
          lastBroadcastTime = Date.now()
          const totalFilesAmount = expectedTotal ?? totalDiscovered
          const totalBytes = resolvedTotalBytes
          onProgress(
            lastReportFile,
            lastReportPct,
            completedFiles,
            completedBytes,
            failedCount,
            failedFiles,
            totalFilesAmount,
            totalBytes
          )
        },
        REPORT_COPIED_FILES_INTERVAL_MS - (now - lastBroadcastTime)
      )
    }
  }

  const worker = async (): Promise<void> => {
    while (true) {
      if (activeSignal.aborted) break

      const item = queue.shift()
      if (!item) {
        if (isScanningDone) break
        await new Promise((r) => setTimeout(r, 50))
        continue
      }

      gate.notify(queue.length)

      const { src, destPath, finalPath } = item
      let success = false
      let fileSize = 0

      const statForSize = await fs.promises.stat(src).catch(() => null)
      if (statForSize?.isFile()) fileSize = statForSize.size

      let lastError: string | undefined

      // ── Stage 1: Copy to staging (retries up to FAIL_RETRIES) ──────────────
      let copyAttempt = 0
      let copiedToStaging = false
      let partialBytes = 0
      while (copyAttempt < FAIL_RETRIES && !copiedToStaging) {
        if (activeSignal.aborted) break

        partialBytes = 0
        try {
          if (copyAttempt > 0) await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS * copyAttempt))

          const expectedFileSize = fileSize > 0 ? fileSize : 1

          const stagingDir = path.dirname(destPath)
          if (stagingDir !== destination && !mkdirCache.has(stagingDir)) {
            await fs.promises.mkdir(stagingDir, { recursive: true }).catch(() => {})
            mkdirCache.add(stagingDir)
          }

          await copyOneFast(src, destPath, activeSignal, (chunkSize) => {
            partialBytes += chunkSize
            completedBytes += chunkSize
            const pct = Math.min(100, Math.floor((partialBytes / expectedFileSize) * 100))
            throttledReport(src, pct)
          })

          copiedToStaging = true
        } catch (err: any) {
          completedBytes -= partialBytes // Rollback partial progress
          partialBytes = 0
          lastError = err.message || 'Unknown copy error'
          copyAttempt++
        }
      }

      // ── Stage 2: Move staging → final (retries up to MOVE_RETRIES) ─────────
      if (copiedToStaging && finalDest) {
        let moveAttempt = 0
        while (moveAttempt < MOVE_RETRIES) {
          if (activeSignal.aborted) break
          try {
            if (moveAttempt > 0) await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS * moveAttempt))
            await atomicMoveWithHandles(destPath, finalPath, config.uploadBaseDir)
            success = true
            if (moveAttempt > 0) {
              logger.warn('FileCopyEngine', `Move succeeded after ${moveAttempt + 1} attempts`, {
                src,
                dest: finalPath
              })
            }
            break
          } catch (err: any) {
            lastError = err.message || 'Unknown move error'
            moveAttempt++
          }
        }
        if (!success && !activeSignal.aborted) {
          logger.error('FileCopyEngine', `Move gave up after ${MOVE_RETRIES} retries`, {
            src,
            dest: finalPath,
            lastError
          })
        }
      } else if (copiedToStaging && !finalDest) {
        // No move needed — copy to destination was the final step.
        success = true
      }

      if (activeSignal.aborted) break

      if (success) {
        completedFiles++
        throttledReport(src, 100)
      } else {
        failedCount++
        if (failedCount <= MAX_REPORTED_FAILURES) {
          failedFiles.push({
            path: src,
            reason: lastError || 'Copy failed after 5 retries',
            sizeInBytes: fileSize
          })
        }
        throttledReport(src, -1)
      }
    }
  }

  const workers = Array.from({ length: COPY_CONCURRENCY }, worker)
  await Promise.all([scanPromise, ...workers])

  if (signal) signal.removeEventListener('abort', triggerExternalAbort)
  if (reportTimer) clearTimeout(reportTimer)

  const finalTotalFiles = expectedTotal ?? totalDiscovered
  const finalTotalBytes = resolvedTotalBytes || completedBytes

  onProgress(
    '__done__',
    100,
    completedFiles,
    completedBytes,
    failedCount,
    failedFiles,
    finalTotalFiles,
    finalTotalBytes
  )

  return {
    completedFiles,
    completedBytes,
    failedCount,
    failedFiles,
    totalFilesAmount: finalTotalFiles,
    totalBytes: finalTotalBytes
  }
}
