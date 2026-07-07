import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { PathResult } from '@main/domain/entities/PathResult'
import { BackpressureGate } from './BackpressureGate'
import { normalizeDriveCase } from './pathUtils'

/**
 * Converts a list of folders into a flat list of every nested file.
 * Uses a worker-queue pattern to avoid recursion depth limits and maximize I/O.
 *
 * Supports backpressure: if the onFile callback is provided and the consumer
 * queue grows beyond the high-water mark, the scanner pauses until it drains.
 */
export async function expandPaths(
  inputs: string[],
  basePath: string,
  excludedDirectories: Set<string>,
  parallelWorkers: number,
  onScan: (count: number) => void,
  excludedPaths: Set<string>,
  onFile: (fullPath: string, relativePath: string) => void,
  onDir: (relDir: string) => void,
  onScanError: (filePath: string, errorMessage: string) => void,
  signal: AbortSignal,
  backpressureGate?: BackpressureGate
): Promise<PathResult[]> {
  const results: PathResult[] = []
  let foundCount = 0
  const normalizedBase = normalizeDriveCase(basePath)

  const queue: { path: string; isDir?: boolean }[] = inputs.map((p) => ({ path: p }))

  // Track how many workers are actively processing a directory.
  // A worker increments this BEFORE pulling from the queue and decrements
  // after fully processing the item. This prevents the race where two idle
  // workers both see activeWorkers===0 and terminate prematurely.
  let activeWorkers = 0
  let resolveAllIdle: (() => void) | null = null

  const processFile = (fullPath: string): void => {
    const normalizedPath = normalizeDriveCase(fullPath)
    let relativePath = path.relative(normalizedBase, normalizedPath)

    if (path.isAbsolute(relativePath) || relativePath.startsWith('..')) {
      relativePath = path.basename(fullPath)
    }

    if (onFile) {
      onFile(fullPath, relativePath)
    } else {
      results.push({ fullPath, relativePath })
    }

    foundCount++
    if (foundCount % 500 === 0) onScan(foundCount)
  }

  const worker = async (): Promise<void> => {
    while (!signal.aborted) {
      const item = queue.shift()

      if (!item) {
        if (activeWorkers === 0 && queue.length === 0) {
          if (resolveAllIdle) resolveAllIdle()
          break
        }
        await new Promise((r) => setTimeout(r, 10))
        continue
      }

      activeWorkers++
      const currentPath = item.path

      if (excludedPaths.has(currentPath)) {
        activeWorkers--
        continue
      }

      try {
        let isDirectory = item.isDir
        if (isDirectory === undefined) {
          const stat = await fs.promises.stat(currentPath)
          isDirectory = stat.isDirectory()
        }

        if (isDirectory) {
          const normalizedPath = normalizeDriveCase(currentPath)
          let relativePath = path.relative(normalizedBase, normalizedPath)

          if (path.isAbsolute(relativePath) || relativePath.startsWith('..')) {
            relativePath = path.basename(currentPath)
          }

          onDir(relativePath)

          const dir = await fs.promises.opendir(currentPath)
          for await (const entry of dir) {
            if (signal.aborted) break
            if (excludedDirectories.has(entry.name)) continue

            const fullChildPath = path.join(currentPath, entry.name)
            if (excludedPaths.has(fullChildPath)) continue

            if (entry.isDirectory()) {
              queue.push({ path: fullChildPath, isDir: true })
            } else {
              if (backpressureGate) {
                await backpressureGate.waitIfNeeded(queue.length)
              }
              processFile(fullChildPath)
            }
          }
        } else {
          if (backpressureGate) {
            await backpressureGate.waitIfNeeded(queue.length)
          }
          processFile(currentPath)
        }
      } catch (err: any) {
        logger.warn('FileScanner', `Skipping ${currentPath}: ${err.message}`)
        onScanError(currentPath, err.message)
      } finally {
        activeWorkers--
      }
    }
  }

  const donePromise = new Promise<void>((resolve) => {
    resolveAllIdle = resolve
  })

  const workers = Array.from({ length: parallelWorkers }, worker)
  await Promise.race([Promise.all(workers), donePromise])

  onScan(foundCount)
  return results
}
