import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { CopyOptions, CopySummary } from '@main/domain/interfaces/FileService'
import { FileScanner } from '@main/domain/interfaces/FileScanner'
import { BackpressureGate } from './BackpressureGate'
import { AsyncSemaphore } from './AsyncSemaphore'
import { config } from '@main/appConfig'
import { FailedFile } from '@shared/entities/FailedFile'
import { atomicMoveWithHandles } from '../utils/fsUtils'

const EXCLUDED = new Set<string>([])
const COPY_CONCURRENCY = config.copyConcurrency
const HEAVY_FILE_THRESHOLD = config.heavyFileThresholdMb * 1024 * 1024
const TOTAL_BUFFER_BUDGET = config.totalChunksSizeMB * 1024 * 1024
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
  bufferSize: number,
  signal?: AbortSignal,
  onProgressBytes?: (chunkSize: number) => void
): Promise<number> {
  const st = await fs.promises.stat(src).catch(() => null)
  if (!st) throw new Error('File not accessible')

  if (signal?.aborted) return 0

  const doCopy = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let aborted = false
      let stallTimer: NodeJS.Timeout | null = null

      const clearStall = () => {
        if (stallTimer) {
          clearTimeout(stallTimer)
          stallTimer = null
        }
      }

      const onAbort = () => {
        aborted = true
        clearStall()
        readStream.destroy()
        writeStream.destroy()
        reject(new Error('Aborted'))
      }

      if (signal) {
        if (signal.aborted) return reject(new Error('Aborted'))
        signal.addEventListener('abort', onAbort)
      }

      const FILE_FLAG_SEQUENTIAL_SCAN = 0x08000000
      const readStream = fs.createReadStream(src, {
        flags: (fs.constants.O_RDONLY | FILE_FLAG_SEQUENTIAL_SCAN) as unknown as string,
        highWaterMark: bufferSize
      })
      const writeStream = fs.createWriteStream(dest, {
        flags: (fs.constants.O_WRONLY |
          fs.constants.O_CREAT |
          fs.constants.O_TRUNC |
          FILE_FLAG_SEQUENTIAL_SCAN) as unknown as string,
        highWaterMark: bufferSize
      })

      const resetStall = () => {
        clearStall()
        stallTimer = setTimeout(() => {
          if (aborted) return
          aborted = true
          readStream.destroy()
          writeStream.destroy()
          reject(new Error('Copy stalled - no data transferred for 30 seconds'))
        }, 10000)
      }

      // Start the timer immediately in case the stream hangs on initial open
      resetStall()

      readStream.on('data', (chunk) => {
        if (aborted) return
        resetStall()
        if (onProgressBytes) onProgressBytes(chunk.length)
      })

      readStream.on('error', (err) => {
        clearStall()
        if (signal) signal.removeEventListener('abort', onAbort)
        writeStream.destroy()
        reject(err)
      })

      writeStream.on('error', (err) => {
        clearStall()
        if (signal) signal.removeEventListener('abort', onAbort)
        readStream.destroy()
        reject(err)
      })

      writeStream.on('finish', () => {
        clearStall()
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
 * Executes a concurrent, throttled copy sequence that migrates selected paths to a target directory.
 * Utilizes `FileScanner` to continuously discover paths in the background while workers process the queue.
 * Integrates `BackpressureGate` to limit memory growth and applies automatic retries on worker failures.
 *
 * @param scanner The scanner implementation used to walk directories in parallel.
 * @param initialPaths Array of file or directory paths to copy.
 * @param destination Target directory to copy files to.
 * @param options Copy options and progress/scanning callback configuration.
 */
export async function copyFiles(
  scanner: FileScanner,
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
      if (first) {
        const parsedRoot = path.parse(first).root
        if (parsedRoot) return parsedRoot
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

  let activeCopies = 0

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
      // Compute buffer once for this file — stays the same across retries
      activeCopies++
      const workerBuffer = Math.max(
        64 * 1024,
        Math.floor(TOTAL_BUFFER_BUDGET / activeCopies)
      )

      let copyAttempt = 0
      let copiedToStaging = false
      let partialBytes = 0
      while (copyAttempt < FAIL_RETRIES && !copiedToStaging) {
        if (activeSignal.aborted) break

        partialBytes = 0
        try {
          if (copyAttempt > 0)
            await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS * copyAttempt))

          const expectedFileSize = fileSize > 0 ? fileSize : 1

          const stagingDir = path.dirname(destPath)
          if (stagingDir !== destination && !mkdirCache.has(stagingDir)) {
            await fs.promises.mkdir(stagingDir, { recursive: true }).catch(() => {})
            mkdirCache.add(stagingDir)
          }

          // Touch the staging file to anchor the directory against empty-folder cleaners
          await fs.promises.writeFile(destPath, '', { flag: 'a' }).catch(() => {})

          await copyOneFast(src, destPath, workerBuffer, activeSignal, (chunkSize) => {
            partialBytes += chunkSize
            completedBytes += chunkSize
            const pct = Math.min(100, Math.floor((partialBytes / expectedFileSize) * 100))
            throttledReport(src, pct)
          })

          copiedToStaging = true
        } catch (err: unknown) {
          completedBytes -= partialBytes // Rollback partial progress
          partialBytes = 0
          lastError = (err instanceof Error ? err.message : String(err)) || 'Unknown copy error'
          copyAttempt++
        }
      }

      activeCopies--

      // ── Stage 2: Move staging → final
      if (copiedToStaging && finalDest) {
        let moveAttempt = 0
        while (moveAttempt < MOVE_RETRIES) {
          if (activeSignal.aborted) break
          try {
            if (moveAttempt > 0)
              await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS))
            await atomicMoveWithHandles(destPath, finalPath)
            success = true
            if (moveAttempt > 0) {
              logger.warn('FileCopyEngine', `Move succeeded after ${moveAttempt + 1} attempts`, {
                src,
                dest: finalPath
              })
            }
            break
          } catch (err: unknown) {
            lastError = (err instanceof Error ? err.message : String(err)) || 'Unknown move error'
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
