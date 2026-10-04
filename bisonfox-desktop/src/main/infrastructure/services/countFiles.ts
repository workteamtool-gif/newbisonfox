import * as fs from 'original-fs'
import * as path from 'path'
import { config } from '@main/appConfig'

export async function countFiles(
  initialPaths: string[],
  excludedDirectories: Set<string>,
  parallelWorkers = 1,
  excludedFiles: string[] = [],
  onCount: (fileCount: number, totalBytes: number) => void,
  signal: AbortSignal
): Promise<{ count: number; size: number }> {
  if (!initialPaths || initialPaths.length === 0) return { count: 0, size: 0 }

  const normalizeForSet = (filePath: string) => path.normalize(filePath).toLowerCase()
  const excludedFilesSet = new Set<string>(excludedFiles.map(normalizeForSet))
  let totalFileCount = 0
  let totalBytes = 0
  let lastReportTimestamp = Date.now()
  let isComplete = false
  let activeDirectoryReads = 0
  let activeStatBatches = 0

  const queue: string[] = []

  await Promise.all(
    initialPaths.map(async (currentPath) => {
      if (
        !excludedFilesSet.has(normalizeForSet(currentPath)) &&
        !excludedFilesSet.has(normalizeForSet(path.basename(currentPath)))
      ) {
        try {
          const pathStat = await fs.promises.stat(currentPath)
          if (pathStat.isDirectory()) {
            queue.push(currentPath)
          } else {
            totalFileCount++
            totalBytes += pathStat.size
          }
        } catch {}
      }
    })
  )

  if (queue.length === 0) {
    if (!signal.aborted) {
      onCount(totalFileCount, totalBytes)
    }
    return { count: totalFileCount, size: totalBytes }
  }

  return new Promise((resolve) => {
    const checkIfComplete = (): void => {
      if (
        queue.length === 0 &&
        activeDirectoryReads === 0 &&
        activeStatBatches === 0 &&
        !isComplete
      ) {
        isComplete = true
        if (!signal.aborted) {
          onCount(totalFileCount, totalBytes)
        }
        resolve({ count: totalFileCount, size: totalBytes })
      }
    }

    const reportProgress = (): void => {
      if (onCount) {
        const now = Date.now()
        if (now - lastReportTimestamp > 500) {
          lastReportTimestamp = now
          onCount(totalFileCount, totalBytes)
        }
      }
    }

    // Stat files with strict concurrency limits to prevent event loop blocking
    const runStatBatch = async (pendingStatFiles: string[]): Promise<void> => {
      activeStatBatches++
      let index = 0

      const statWorker = async () => {
        while (index < pendingStatFiles.length && !signal.aborted) {
          const filePath = pendingStatFiles[index++]
          try {
            const fileStat = await fs.promises.stat(filePath)
            totalBytes += fileStat.size
          } catch {}
          if (index % 500 === 0) {
            reportProgress()
          }
        }
      }

      const maxCountWorkers = Math.min(config.maxCountWorkers, pendingStatFiles.length)
      const workers = Array.from({ length: maxCountWorkers }, statWorker)

      await Promise.all(workers)

      activeStatBatches--
      reportProgress()
      checkIfComplete()
    }

    const processQueue = (): void => {
      if (isComplete || signal.aborted) {
        if (!isComplete) {
          isComplete = true
          resolve({ count: totalFileCount, size: totalBytes })
        }
        return
      }

      while (queue.length > 0 && activeDirectoryReads < parallelWorkers) {
        const currentDir = queue.pop()!

        if (excludedFilesSet.has(normalizeForSet(currentDir))) {
          checkIfComplete()
          continue
        }

        activeDirectoryReads++

        fs.readdir(currentDir, { withFileTypes: true }, (err, entries) => {
          activeDirectoryReads--

          if (!err && entries) {
            const pendingStatFiles: string[] = []

            for (let i = 0; i < entries.length; i++) {
              if (signal.aborted) break

              const entry = entries[i]
              if (excludedDirectories.has(entry.name)) continue

              const fullPath = path.join(currentDir, entry.name)
              if (excludedFilesSet.has(normalizeForSet(fullPath))) continue

              if (entry.isDirectory()) {
                queue.push(fullPath)
              } else if (entry.isFile()) {
                totalFileCount++
                pendingStatFiles.push(fullPath)
              }

              if (i % 500 === 0) {
                reportProgress()
              }
            }

            if (pendingStatFiles.length > 0) {
              runStatBatch(pendingStatFiles)
            }

            reportProgress()
          }

          processQueue()
          checkIfComplete()
        })
      }
      checkIfComplete()
    }

    processQueue()
  })
}
