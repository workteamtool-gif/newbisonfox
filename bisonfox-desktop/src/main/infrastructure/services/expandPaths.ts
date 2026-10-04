import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { PathResult } from '@main/domain/entities/PathResult'
import { BackpressureGate } from '@main/infrastructure/services/BackpressureGate'
import { normalizeDriveCase } from '@main/infrastructure/services/pathUtils'

/**
 * Converts a list of folders into a flat list of every nested file.
 * Uses a worker-queue pattern
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
  onDirectoryFound: (relativeDirectoryPath: string) => void,
  onScanError: (filePath: string, errorMessage: string) => void,
  signal: AbortSignal,
  backpressureGate?: BackpressureGate,
  onEmptyDirectory?: (relativeDirectoryPath: string) => void
): Promise<PathResult[]> {
  const results: PathResult[] = []
  let foundCount = 0
  const normalizedBase = normalizeDriveCase(basePath)

  const normalizeForSet = (filePath: string) => path.normalize(filePath).toLowerCase()
  const normalizedExcludedPaths = new Set<string>([...excludedPaths].map(normalizeForSet))

  const queue: { path: string; isDir?: boolean }[] = inputs.map((filePath) => ({ path: filePath }))

  // Track how many workers are actively processing a directory.
  // A worker increments this BEFORE pulling from the queue and decrements
  // after fully processing the item. This prevents the race where two idle
  // workers both see activeWorkers===0 and terminate prematurely.
  let activeWorkers = 0
  let resolveAllIdle: (() => void) | null = null

  const processFile = (fullPath: string): void => {
    const normalizedFilePath = normalizeDriveCase(fullPath)
    let relativePath = path.relative(normalizedBase, normalizedFilePath)

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
      const item = queue.pop()

      if (!item) {
        if (activeWorkers === 0 && queue.length === 0) {
          if (resolveAllIdle) resolveAllIdle()
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
        continue
      }

      activeWorkers++
      const currentPath = item.path

      if (normalizedExcludedPaths.has(normalizeForSet(currentPath))) {
        activeWorkers--
        continue
      }

      try {
        let isDirectory = item.isDir
        if (isDirectory === undefined) {
          const pathStat = await fs.promises.stat(currentPath)
          isDirectory = pathStat.isDirectory()
        }

        if (isDirectory) {
          const normalizedDirPath = normalizeDriveCase(currentPath)
          let relativeDirectoryPath = path.relative(normalizedBase, normalizedDirPath)

          if (path.isAbsolute(relativeDirectoryPath) || relativeDirectoryPath.startsWith('..')) {
            relativeDirectoryPath = path.basename(currentPath)
          }

          onDirectoryFound(relativeDirectoryPath)

          const openedDir = await fs.promises.opendir(currentPath)
          let hasChildren = false
          for await (const entry of openedDir) {
            if (signal.aborted) break
            if (excludedDirectories.has(entry.name)) continue

            const fullChildPath = path.join(currentPath, entry.name)
            const normalizedChild = normalizeForSet(fullChildPath)
            if (normalizedExcludedPaths.has(normalizedChild)) {
              logger.info(
                'expandPaths',
                `Skipping excluded path: ${fullChildPath} (normalized: ${normalizedChild})`
              )
              continue
            }

            hasChildren = true
            if (entry.isDirectory()) {
              queue.push({ path: fullChildPath, isDir: true })
            } else {
              if (backpressureGate) {
                await backpressureGate.waitIfNeeded(signal)
              }
              processFile(fullChildPath)
            }
          }

          if (!hasChildren && onEmptyDirectory) {
            onEmptyDirectory(relativeDirectoryPath)
          }
        } else {
          if (backpressureGate) {
            await backpressureGate.waitIfNeeded(signal)
          }
          processFile(currentPath)
        }
      } catch (err: unknown) {
        logger.warn(
          'FileScanner',
          `Skipping ${currentPath}: ${err instanceof Error ? err.message : String(err)}`
        )
        onScanError(currentPath, err instanceof Error ? err.message : String(err))
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
