import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { CopyOptions, CopySummary } from '@main/domain/interfaces/IFileService'
import { IFileScanner } from '@main/domain/interfaces/IFileScanner'
import { BackpressureGate } from './BackpressureGate'
import { AsyncSemaphore } from './AsyncSemaphore'
import { config } from '@main/appConfig'

// Folders and files that won't be shown in the explorer and be excluded from the copy process
const EXCLUDED = new Set<string>([])
const COPY_CONCURRENCY = config.copyConcurrency
const HEAVY_FILE_THRESHOLD = config.heavyFileThresholdMb * 1024 * 1024
const FAIL_INTERVAL_MS = config.failIntervalMs
const FAIL_RETRIES = config.failRetries
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
  const { basePath, excludedFiles, expectedTotal, expectedTotalBytes, signal, onScan, onProgress } =
    options

  const internalController = new AbortController()
  const triggerExternalAbort = (): void => internalController.abort()

  if (signal) {
    if (signal.aborted) {
      return { completedFiles: 0, completedBytes: 0, failedCount: 0, failedFiles: [], totalFiles: 0, totalBytes: 0 }
    }
    signal.addEventListener('abort', triggerExternalAbort)
  }

  const activeSignal = internalController.signal

  const inferredBase =
    basePath ??
    (() => {
      const first = initialPaths[0]
      if (first?.includes(':')) {
        const m = first.match(/^[a-zA-Z]:\\/)
        if (m) return m[0]
      }
      return path.dirname(initialPaths[0] ?? destination)
    })()

  const excludedSet = new Set<string>(excludedFiles ?? [])

  if (initialPaths.length === 0) {
    return { completedFiles: 0, completedBytes: 0, failedCount: 0, failedFiles: [], totalFiles: 0, totalBytes: 0 }
  }

  await fs.promises.mkdir(destination, { recursive: true }).catch(() => {})

  const queue: { src: string; destPath: string }[] = []
  let isScanningDone = false
  let totalDiscovered = 0

  // Backpressure: pause scanner when queue > 10k, resume when < 5k
  const gate = new BackpressureGate(10_000, 5_000)
  const mkdirCache = new Set<string>()

  const failedFiles: { path: string; reason: string }[] = []
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
        queue.push({ src, destPath: path.join(destination, rel) })
      },
      (relDir) => {
        fs.promises.mkdir(path.join(destination, relDir), { recursive: true }).catch(() => {})
      },
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
      const totalFiles = expectedTotal ?? totalDiscovered
      const totalBytes = expectedTotalBytes ?? 0 // Unknown initially if not precalc
      onProgress(
        file,
        pct,
        completedFiles,
        completedBytes,
        failedCount,
        failedFiles,
        totalFiles,
        totalBytes
      )
    } else if (!reportTimer) {
      reportTimer = setTimeout(
        () => {
          reportTimer = null
          lastBroadcastTime = Date.now()
          const totalFiles = expectedTotal ?? totalDiscovered
          const totalBytes = expectedTotalBytes ?? 0
          onProgress(
            lastReportFile,
            lastReportPct,
            completedFiles,
            completedBytes,
            failedCount,
            failedFiles,
            totalFiles,
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

      // Notify the backpressure gate that an item was consumed
      gate.notify(queue.length)

      const { src, destPath } = item
      let attempt = 0
      let success = false

      let lastError: string | undefined
      while (attempt < FAIL_RETRIES && !success) {
        if (activeSignal.aborted) break

        let partialBytes = 0
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS * attempt))
          const dir = path.dirname(destPath)
          if (!mkdirCache.has(dir)) {
            await fs.promises.mkdir(dir, { recursive: true }).catch(() => {})
            mkdirCache.add(dir)
          }

          const st = await fs.promises.stat(src).catch(() => null)
          const expectedFileSize = st && st.size > 0 ? st.size : 1

          await copyOneFast(
            src, 
            destPath, 
            activeSignal,
            (chunkSize) => {
              partialBytes += chunkSize
              completedBytes += chunkSize
              const pct = Math.min(100, Math.floor((partialBytes / expectedFileSize) * 100))
              throttledReport(src, pct)
            }
          )
          success = true
        } catch (err: any) {
          completedBytes -= partialBytes // Rollback partial progress
          lastError = err.message || 'Unknown copy error'
          attempt++
        }
      }

      if (activeSignal.aborted) break

      if (success) {
        completedFiles++
        throttledReport(src, 100)
      } else {
        failedCount++
        if (failedCount <= MAX_REPORTED_FAILURES) {
          failedFiles.push({ path: src, reason: lastError || 'Copy failed after 5 retries' })
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
  const finalTotalBytes = expectedTotalBytes ?? completedBytes

  // Notify progress handler so it can update session state.
  // The done notification to the renderer is deferred to UploadManager,
  // which fires it only after the staging folder is successfully moved.
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
    totalFiles: finalTotalFiles,
    totalBytes: finalTotalBytes
  }
}
