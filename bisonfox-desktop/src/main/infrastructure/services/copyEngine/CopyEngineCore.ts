import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { FileScanner } from '@main/domain/interfaces/FileScanner'
import { CopyOptions, CopySummary } from '@main/domain/interfaces/FileService'
import { BackpressureGate } from '../BackpressureGate'
import { config } from '@main/appConfig'
import { atomicMoveWithHandles } from '../../utils/fsUtils'
import { copyOneFast } from './copyOneFast'
import { CopyProgressReporter } from './CopyProgressReporter'

interface CopyQueueItem {
  src: string
  destPath: string
  finalPath: string
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
  private readonly mkdirCache = new Set<string>()
  private readonly gate = new BackpressureGate(10_000, 5_000)

  private isScanningDone = false
  private totalDiscovered = 0
  private activeCopies = 0

  private readonly internalController = new AbortController()
  private readonly reporter: CopyProgressReporter

  constructor(
    private readonly scanner: FileScanner,
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

    const activeSignal = this.internalController.signal
    const inferredBase = this.getInferredBase()
    const excludedSet = new Set<string>(this.options.excludedFiles ?? [])

    await fs.promises.mkdir(this.destination, { recursive: true }).catch(() => {})

    const scanPromise = this.scanner
      .expandPaths(
        this.initialPaths,
        inferredBase,
        EXCLUDED,
        COPY_CONCURRENCY,
        (count: number) => {
          this.totalDiscovered = count
          if (this.options.onScan) this.options.onScan(count)
        },
        excludedSet,
        (src, rel) => {
          this.totalDiscovered++
          const stagingPath = path.join(this.destination, rel)
          const trueFinalPath = this.options.finalDest ? path.join(this.options.finalDest, rel) : stagingPath
          this.queue.push({ src, destPath: stagingPath, finalPath: trueFinalPath })
        },
        () => {},
        (failedPath, errorMsg) => {
          this.reporter.failedCount++
          if (this.reporter.failedFiles.length < MAX_REPORTED_FAILURES) {
            this.reporter.failedFiles.push({ path: failedPath, reason: errorMsg })
          }
          logger.error('FileService', `Scan failure: ${failedPath}`, { error: errorMsg })
        },
        activeSignal,
        this.gate
      )
      .then(() => {
        this.isScanningDone = true
      })

    const workers = Array.from({ length: COPY_CONCURRENCY }, () => this.runWorker(activeSignal))
    await Promise.all([scanPromise, ...workers])

    if (this.options.signal) {
      this.options.signal.removeEventListener('abort', triggerExternalAbort)
    }

    return this.reporter.reportDone()
  }

  private async runWorker(activeSignal: AbortSignal): Promise<void> {
    while (true) {
      if (activeSignal.aborted) break

      const item = this.queue.shift()
      if (!item) {
        if (this.isScanningDone) break
        await new Promise((r) => setTimeout(r, 50))
        continue
      }

      this.gate.notify(this.queue.length)

      const { src, destPath, finalPath } = item
      let success = false
      let fileSize = 0

      const statForSize = await fs.promises.stat(src).catch(() => null)
      if (statForSize?.isFile()) fileSize = statForSize.size

      let lastError: string | undefined

      this.activeCopies++
      const workerBuffer = Math.max(
        64 * 1024,
        Math.floor(TOTAL_BUFFER_BUDGET / this.activeCopies)
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
          
          if (stagingDir !== this.destination && !this.mkdirCache.has(stagingDir)) {
            await fs.promises.mkdir(stagingDir, { recursive: true }).catch(() => {})
            this.mkdirCache.add(stagingDir)
          }

          // Touch the staging file to anchor the directory
          await fs.promises.writeFile(destPath, '', { flag: 'a' }).catch(() => {})

          await copyOneFast(src, destPath, workerBuffer, activeSignal, (chunkSize) => {
            partialBytes += chunkSize
            this.reporter.completedBytes += chunkSize
            const pct = Math.min(100, Math.floor((partialBytes / expectedFileSize) * 100))
            this.reporter.reportProgress(src, pct)
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
          if (activeSignal.aborted) break
          try {
            if (moveAttempt > 0) await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS))
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
      } else if (copiedToStaging && !this.options.finalDest) {
        success = true
      }

      if (activeSignal.aborted) break

      if (success) {
        this.reporter.completedFiles++
        this.reporter.reportProgress(src, 100)
      } else {
        this.reporter.failedCount++
        if (this.reporter.failedCount <= MAX_REPORTED_FAILURES) {
          this.reporter.failedFiles.push({
            path: src,
            reason: lastError || 'Copy failed after 5 retries',
            sizeInBytes: fileSize
          })
        }
        this.reporter.reportProgress(src, -1)
      }
    }
  }

  private getInferredBase(): string {
    if (this.options.basePath) return this.options.basePath

    const first = this.initialPaths[0]
    if (first) {
      const parsedRoot = path.parse(first).root
      if (parsedRoot) return parsedRoot
    }
    return path.dirname(this.initialPaths[0] ?? this.destination)
  }
}
