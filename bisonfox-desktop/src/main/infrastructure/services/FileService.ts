import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../Logger'
import { FileNode } from '@shared/entities/FileNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { IFileService, CopyOptions } from '../../domain/interfaces/IFileService'
import { FileScanner } from './FileScanner'

const EXCLUDED = new Set(['$RECYCLE.BIN', 'System Volume Information', '.git', 'node_modules'])
const COPY_CONCURRENCY = Number(process.env.COPY_CONCURRENCY) || 64
const DEEP_SEARCH_CONCURRENCY = Number(process.env.DEEP_SEARCH_CONCURRENCY) || 64
const HEAVY_FILE_THRESHOLD = (Number(process.env.HEAVY_FILE_THRESHOLD_MB) || 100) * 1024 * 1024
const ITEMS_IN_ONE_PAGE = Number(process.env.VITE_ITEMS_IN_ONE_PAGE) || 48
const FAIL_INTERVAL_MS = Number(process.env.FAIL_INTERVAL_MS) || 500
const FAIL_RETRIES = Number(process.env.FAIL_RETRIES) || 5
const REPORT_COPIED_FILES_INTERVAL_MS = Number(process.env.REPORT_COPIED_FILES_INTERVAL_MS) || 500

/**
 * A custom Semaphore to strictly limit how many massive files can copy concurrently.
 * This prevents the USB drive read-head from thrashing on large video files.
 */
class AsyncSemaphore {
  private permits: number
  private queue: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return Promise.resolve()
    }
    return new Promise((resolve) => this.queue.push(resolve))
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      if (next) next()
    } else {
      this.permits++
    }
  }
}

// Only allow 4 massive files (>100MB) to copy simultaneously
const heavyLock = new AsyncSemaphore(4)

export class FileService implements IFileService {
  private readonly scanner = new FileScanner()

  // ────────────────────────────────── TREE BROWSING ──────────────────────────

  async listDir(
    dirPath: string,
    page: number = 1,
    limit: number = ITEMS_IN_ONE_PAGE
  ): Promise<PaginatedResult<FileNode[]>> {
    try {
      // ── Pass 1: Count dirs & files (O(1) memory) ──
      let dirCount = 0,
        fileCount = 0
      const dir1 = await fs.promises.opendir(dirPath)
      for await (const e of dir1) {
        if (EXCLUDED.has(e.name)) continue
        if (e.isDirectory()) dirCount++
        else fileCount++
      }

      const totalItems = dirCount + fileCount
      const totalPages = Math.max(1, Math.ceil(totalItems / limit))
      const startIndex = (page - 1) * limit
      const endIndex = Math.min(page * limit, totalItems)

      if (startIndex >= totalItems) {
        return { nodes: [], hasMore: false, totalPages }
      }

      // Which slice of dirs / files do we need for this page?
      // Virtual order: [all dirs] [all files]
      const dirSliceStart = Math.min(startIndex, dirCount)
      const dirSliceEnd = Math.min(endIndex, dirCount)
      const fileSliceStart = Math.max(0, startIndex - dirCount)
      const fileSliceEnd = Math.max(0, endIndex - dirCount)

      // ── Pass 2: Collect only the page entries (O(page_size) memory) ──
      const pageDirs: string[] = []
      const pageFiles: string[] = []
      let di = 0,
        fi = 0

      const dir2 = await fs.promises.opendir(dirPath)
      for await (const e of dir2) {
        if (EXCLUDED.has(e.name)) continue

        if (e.isDirectory()) {
          if (di >= dirSliceStart && di < dirSliceEnd) pageDirs.push(e.name)
          di++
        } else {
          if (fi >= fileSliceStart && fi < fileSliceEnd) pageFiles.push(e.name)
          fi++
        }

        // Early exit once we've collected everything this page needs
        if (di >= dirSliceEnd && fi >= fileSliceEnd) break
      }

      // Build result: dirs first, then files
      const pageEntries: { name: string; isDirectory: boolean }[] = [
        ...pageDirs.map((name) => ({ name, isDirectory: true })),
        ...pageFiles.map((name) => ({ name, isDirectory: false }))
      ]

      const enriched = await Promise.all(
        pageEntries.map(async (entry): Promise<FileNode> => {
          const fullPath = path.join(dirPath, entry.name)
          const node: FileNode = {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory
          }

          if (entry.isDirectory) {
            node.hasChildren = true
          } else {
            try {
              const st = await fs.promises.stat(fullPath)
              node.size = st.size
            } catch {
              node.size = 0
            }
          }
          return node
        })
      )

      return { nodes: enriched, hasMore: endIndex < totalItems, totalPages }
    } catch (err: any) {
      logger.warn('FileService', `Access denied or failed to read dir: ${dirPath}`, {
        error: err.message
      })
      return { nodes: [], hasMore: false, totalPages: 1 }
    }
  }

  async findItemPage(
    dirPath: string,
    query: string,
    limit: number = ITEMS_IN_ONE_PAGE
  ): Promise<number | null> {
    try {
      const lowerQuery = query.toLowerCase()
      let dirCount = 0,
        fileCount = 0
      let foundDirIndex = -1,
        foundFileIndex = -1

      // Single pass: count everything and find the target (O(1) memory)
      const dir = await fs.promises.opendir(dirPath)
      for await (const e of dir) {
        if (EXCLUDED.has(e.name)) continue

        if (e.isDirectory()) {
          if (foundDirIndex === -1 && e.name.toLowerCase().includes(lowerQuery)) foundDirIndex = dirCount
          dirCount++
        } else {
          if (foundFileIndex === -1 && e.name.toLowerCase().includes(lowerQuery))
            foundFileIndex = fileCount
          fileCount++
        }
      }

      // Dirs occupy virtual indices [0, dirCount), files occupy [dirCount, dirCount + fileCount)
      if (foundDirIndex !== -1) return Math.floor(foundDirIndex / limit) + 1
      if (foundFileIndex !== -1) return Math.floor((dirCount + foundFileIndex) / limit) + 1
      return null
    } catch {
      return null
    }
  }

  async deepFindItem(
    basePath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null> {
    const lowerQuery = query.toLowerCase()

    const exactPath = await new Promise<string | null>((resolve) => {
      let isDone = false
      let running = 0
      const queued: string[] = [basePath]

      const tryNext = (): void => {
        while (running < DEEP_SEARCH_CONCURRENCY && queued.length > 0 && !isDone) {
          const dir = queued.shift()!
          running++
          crawl(dir)
        }
        if (running === 0 && queued.length === 0 && !isDone) {
          isDone = true
          resolve(null)
        }
      }

      const crawl = async (dirPath: string): Promise<void> => {
        if (isDone) {
          running--
          tryNext()
          return
        }
        try {
          const dir = await fs.promises.opendir(dirPath)
          for await (const e of dir) {
            if (isDone) break
            if (EXCLUDED.has(e.name)) continue

            if (e.name.toLowerCase().includes(lowerQuery)) {
              isDone = true
              resolve(path.join(dirPath, e.name))
              return
            }
            if (e.isDirectory()) queued.push(path.join(dirPath, e.name))
          }
        } catch {
          /* skip permission errors */
        }
        running--
        tryNext()
      }

      tryNext()
    })

    if (!exactPath) return null

    const pages: Record<string, number> = {}
    let current = exactPath

    while (current !== basePath && current.length > basePath.length) {
      const parentDir = path.dirname(current)
      const itemName = path.basename(current)
      const page = await this.findItemPage(parentDir, itemName)
      if (page) pages[parentDir] = page

      current = parentDir
      if (current === path.dirname(current)) break
    }

    return { path: exactPath, pages }
  }

  // ────────────────────────────────── DELEGATED SCANNING ─────────────────────

  async countFiles(
    files: string[],
    excludedFiles?: string[],
    onCount?: (count: number) => void,
    signal?: AbortSignal
  ): Promise<number> {
    return this.scanner.countFiles(files, excludedFiles, onCount, signal)
  }

  // ────────────────────────────────── COPY ENGINE ────────────────────────────

  async copyFiles(
    initialPaths: string[],
    destination: string,
    options: CopyOptions
  ): Promise<void> {
    const { basePath, excludedFiles, expectedTotal, signal, onScan, onProgress } = options

    const internalController = new AbortController()
    const triggerExternalAbort = (): void => internalController.abort()

    if (signal) {
      if (signal.aborted) return
      signal.addEventListener('abort', triggerExternalAbort)
    }

    const activeSignal = internalController.signal
    let consecutiveFailures = 0
    const HARD_FAIL_LIMIT = 20

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
    logger.info('FileService', `Streaming copy of ${initialPaths.length} root path(s).`, {
      excluded: excludedSet.size
    })

    if (initialPaths.length === 0) return

    await fs.promises.mkdir(destination, { recursive: true }).catch(() => {})

    const queue: { src: string; destPath: string }[] = []
    let isScanningDone = false
    let totalDiscovered = 0
    const mkdirCache = new Set<string>()

    const failedFiles: string[] = []

    const scanPromise = this.scanner
      .expandPaths(
        initialPaths,
        inferredBase,
        (count) => {
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
          failedFiles.push(failedPath)
          logger.error('FileService', `Scan failure: ${failedPath}`, { error: errorMsg })
        },
        activeSignal
      )
      .then(() => {
        isScanningDone = true
      })

    let completed = 0
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
        const total = expectedTotal ?? totalDiscovered
        onProgress(file, pct, completed, failedFiles, total)
      } else if (!reportTimer) {
        reportTimer = setTimeout(
          () => {
            reportTimer = null
            lastBroadcastTime = Date.now()
            const total = expectedTotal ?? totalDiscovered
            onProgress(lastReportFile, lastReportPct, completed, failedFiles, total)
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

        const { src, destPath } = item
        let attempt = 0
        let success = false

        while (attempt < FAIL_RETRIES && !success) {
          if (activeSignal.aborted) break

          try {
            if (attempt > 0) await new Promise((r) => setTimeout(r, FAIL_INTERVAL_MS * attempt))
            const dir = path.dirname(destPath)
            if (!mkdirCache.has(dir)) {
              await fs.promises.mkdir(dir, { recursive: true }).catch(() => {})
              mkdirCache.add(dir)
            }

            await this.copyOneFast(src, destPath, activeSignal)
            success = true
          } catch {
            attempt++
          }
        }

        if (activeSignal.aborted) break

        if (success) {
          completed++
          consecutiveFailures = 0
          throttledReport(src, 100)
        } else {
          failedFiles.push(src)
          throttledReport(src, -1)

          consecutiveFailures++
          if (consecutiveFailures >= HARD_FAIL_LIMIT) {
            logger.error(
              'FileService',
              'Circuit Breaker Tripped! Assuming source drive disconnected.'
            )
            internalController.abort()
          }
        }
      }
    }

    const workers = Array.from({ length: COPY_CONCURRENCY }, worker)
    await Promise.all([scanPromise, ...workers])

    if (signal) signal.removeEventListener('abort', triggerExternalAbort)
    if (reportTimer) clearTimeout(reportTimer)

    const finalTotal = expectedTotal ?? totalDiscovered
    onProgress('__done__', 100, completed, failedFiles, finalTotal)
  }

  private async copyOneFast(src: string, dest: string, signal?: AbortSignal): Promise<void> {
    const st = await fs.promises.stat(src).catch(() => null)
    if (!st) throw new Error('File not accessible')

    if (signal?.aborted) return

    if (st.size > HEAVY_FILE_THRESHOLD) {
      await heavyLock.acquire()
      try {
        if (signal?.aborted) return
        await fs.promises.copyFile(src, dest)
      } finally {
        heavyLock.release()
      }
      return
    }

    await fs.promises.copyFile(src, dest)
  }
}
