import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { CopyOptions, CopySummary } from '@main/domain/interfaces/FileService'
import { config } from '@main/appConfig'
import { atomicMoveWithHandles } from '@main/infrastructure/utils/fsUtils'
import { BackpressureGate } from '@main/infrastructure/services/BackpressureGate'
import { copyOneFast } from '@main/infrastructure/services/copyEngine/copyOneFast'
import { CopyProgressReporter } from '@main/infrastructure/services/copyEngine/CopyProgressReporter'
import { expandPaths } from '@main/infrastructure/services/expandPaths'

interface CopyQueueItem {
  sourcePath: string
  stagingPath: string
  finalDestinationPath: string
}

const EXCLUDED = new Set<string>([])
const COPY_CONCURRENCY = config.copyConcurrency
const TOTAL_BUFFER_BUDGET = config.totalChunksSizeMB * 1024 * 1024
const FAIL_INTERVAL_MS = config.failIntervalMs
const FAIL_RETRIES = config.failRetries
const MOVE_RETRIES = config.moveRetries
const MAX_REPORTED_FAILURES = config.maxReportedFailures

export class CopyEngineCore {
  private readonly queue: CopyQueueItem[] = []
  private readonly emptyDirs: { stagingPath: string; finalDestPath: string | null }[] = []
  private readonly mkdirCache = new Set<string>()
  private readonly backpressureGate = new BackpressureGate(10_000, 5_000)

  private isScanComplete = false
  private totalDiscovered = 0
  private activeCopies = 0

  private readonly internalController = new AbortController()
  private readonly reporter: CopyProgressReporter

  constructor(
    private readonly initialPaths: string[],
    private readonly destination: string,
    private readonly options: CopyOptions
  ) {
    this.reporter = new CopyProgressReporter(
      this.options.onProgress,
      () => this.options.expectedTotal ?? this.totalDiscovered,
      () => this.options.expectedTotalBytes || 0
    )
  }

  public async start(): Promise<CopySummary> {
    if (this.initialPaths.length === 0 || this.options.signal?.aborted) {
      return this.reporter.reportDone()
    }

    const triggerExternalAbort = (): void => this.internalController.abort()
    if (this.options.signal) {
      this.options.signal.addEventListener('abort', triggerExternalAbort)
    }

    const abortSignal = this.internalController.signal
    const inferredBasePath = this.getInferredBasePath()
    const excludedPathsSet = new Set<string>(this.options.excludedFiles ?? [])

    await fs.promises.mkdir(this.destination, { recursive: true }).catch(() => {})

    const scanPromise = expandPaths(
      this.initialPaths,
      inferredBasePath,
      EXCLUDED,
      COPY_CONCURRENCY,
      (count: number) => {
        this.totalDiscovered = count
        if (this.options.onScan) this.options.onScan(count)
      },
      excludedPathsSet,
      (sourcePath, relativePath) => {
        this.totalDiscovered++
        const stagingPath = path.join(this.destination, relativePath)
        const finalDestinationPath = this.options.finalDest
          ? path.join(this.options.finalDest, relativePath)
          : stagingPath
        this.queue.push({ sourcePath, stagingPath, finalDestinationPath })
        this.backpressureGate.update(this.queue.length)
      },
      () => {},
      (failedPath, errorMessage) => {
        this.reporter.failedCount++
        if (this.reporter.failedFiles.length < MAX_REPORTED_FAILURES) {
          this.reporter.failedFiles.push({ path: failedPath, reason: errorMessage })
        }
        logger.error('FileService', `Scan failure: ${failedPath}`, { error: errorMessage })
      },
      abortSignal,
      this.backpressureGate,
      (relativeDirectoryPath) => {
        const stagingPath = path.join(this.destination, relativeDirectoryPath)
        const finalDestPath = this.options.finalDest
          ? path.join(this.options.finalDest, relativeDirectoryPath)
          : null
        this.emptyDirs.push({ stagingPath, finalDestPath })
      }
    ).then(() => {
      this.isScanComplete = true
    })

    const workers = Array.from({ length: COPY_CONCURRENCY }, () => this.runWorker(abortSignal))
    await Promise.all([scanPromise, ...workers])

    // Create empty directories that were discovered during the scan
    if (!abortSignal.aborted && this.emptyDirs.length > 0) {
      await Promise.all(
        this.emptyDirs.map(async ({ stagingPath, finalDestPath }) => {
          await fs.promises.mkdir(stagingPath, { recursive: true }).catch(() => {})
          if (finalDestPath) {
            await fs.promises.mkdir(finalDestPath, { recursive: true }).catch(() => {})
          }
        })
      )
    }

    if (this.options.signal) {
      this.options.signal.removeEventListener('abort', triggerExternalAbort)
    }

    return this.reporter.reportDone()
  }

  private async runWorker(abortSignal: AbortSignal): Promise<void> {
    while (true) {
      if (abortSignal.aborted) break

      const item = this.queue.pop()
      if (!item) {
        if (this.isScanComplete) break
        await new Promise((resolve) => setTimeout(resolve, 50))
        continue
      }

      this.backpressureGate.update(this.queue.length)

      const { sourcePath, stagingPath, finalDestinationPath } = item
      let success = false
      let fileSize = 0

      const fileStat = await fs.promises.stat(sourcePath).catch(() => null)
      if (fileStat?.isFile()) fileSize = fileStat.size

      let lastError: string | undefined

      this.activeCopies++
      const streamBufferSize = Math.max(
        64 * 1024,
        Math.floor(TOTAL_BUFFER_BUDGET / this.activeCopies)
      )

      let copyAttempt = 0
      let copiedToStaging = false
      let partialBytes = 0

      while (copyAttempt < FAIL_RETRIES && !copiedToStaging) {
        if (abortSignal.aborted) break

        partialBytes = 0
        try {
          if (copyAttempt > 0)
            await new Promise((resolve) => setTimeout(resolve, FAIL_INTERVAL_MS * copyAttempt))

          const expectedFileSize = fileSize > 0 ? fileSize : 1
          const stagingDir = path.dirname(stagingPath)

          if (stagingDir !== this.destination && !this.mkdirCache.has(stagingDir)) {
            await fs.promises.mkdir(stagingDir, { recursive: true }).catch(() => {})
            this.mkdirCache.add(stagingDir)
          }

          // Touch the staging file to anchor the directory
          await fs.promises.writeFile(stagingPath, '', { flag: 'a' }).catch(() => {})

          await copyOneFast(sourcePath, stagingPath, streamBufferSize, abortSignal, (chunkSize) => {
            partialBytes += chunkSize
            this.reporter.completedBytes += chunkSize
            const progressPercent = Math.min(
              100,
              Math.floor((partialBytes / expectedFileSize) * 100)
            )
            this.reporter.reportProgress(sourcePath, progressPercent)
          })

          copiedToStaging = true
        } catch (err: unknown) {
          this.reporter.completedBytes -= partialBytes
          partialBytes = 0
          lastError = (err instanceof Error ? err.message : String(err)) || 'Unknown copy error'
          copyAttempt++
        }
      }

      this.activeCopies--

      // Stage 2: Move staging -> final
      if (copiedToStaging && this.options.finalDest) {
        let moveAttempt = 0
        while (moveAttempt < MOVE_RETRIES) {
          if (abortSignal.aborted) break
          try {
            if (moveAttempt > 0)
              await new Promise((resolve) => setTimeout(resolve, FAIL_INTERVAL_MS))
            await atomicMoveWithHandles(stagingPath, finalDestinationPath)
            success = true
            if (moveAttempt > 0) {
              logger.warn('FileCopyEngine', `Move succeeded after ${moveAttempt + 1} attempts`, {
                sourcePath,
                destinationPath: finalDestinationPath
              })
            }
            break
          } catch (err: unknown) {
            lastError = (err instanceof Error ? err.message : String(err)) || 'Unknown move error'
            moveAttempt++
          }
        }
        if (!success && !abortSignal.aborted) {
          logger.error('FileCopyEngine', `Move gave up after ${MOVE_RETRIES} retries`, {
            sourcePath,
            destinationPath: finalDestinationPath,
            lastError
          })
        }
      } else if (copiedToStaging && !this.options.finalDest) {
        success = true
      }

      if (abortSignal.aborted) break

      if (success) {
        this.reporter.completedFiles++
        this.reporter.reportProgress(sourcePath, 100)
      } else {
        this.reporter.failedCount++
        if (this.reporter.failedCount <= MAX_REPORTED_FAILURES) {
          this.reporter.failedFiles.push({
            path: sourcePath,
            reason: lastError || 'Copy failed after 5 retries',
            sizeInBytes: fileSize
          })
        }
        this.reporter.reportProgress(sourcePath, -1)
      }
    }
  }

  private getInferredBasePath(): string {
    if (this.options.basePath) return this.options.basePath

    const firstPath = this.initialPaths[0]
    if (firstPath) {
      const driveRoot = path.parse(firstPath).root
      if (driveRoot) return driveRoot
    }
    return path.dirname(this.initialPaths[0] ?? this.destination)
  }
}
