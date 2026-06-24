import * as fs from 'original-fs'
import * as path from 'path'

export async function countFiles(
  initialPaths: string[],
  excludedDirectories: Set<string>,
  parallelWorkers = 1,
  excludedFiles: string[] = [],
  onCount: (c: number, s: number) => void,
  signal: AbortSignal
): Promise<{ count: number; size: number }> {
  if (!initialPaths || initialPaths.length === 0) return { count: 0, size: 0 }

  const excludedFilesSet = new Set<string>(excludedFiles)
  let count = 0
  let size = 0
  let lastReport = Date.now()
  let isDone = false
  let activeReads = 0
  let activeStatBatches = 0

  const queue: string[] = []

  await Promise.all(
    initialPaths.map(async (currentPath) => {
      if (!excludedFilesSet.has(currentPath) && !excludedFilesSet.has(path.basename(currentPath))) {
        try {
          const stat = await fs.promises.stat(currentPath)
          if (stat.isDirectory()) {
            queue.push(currentPath)
          } else {
            count++
            size += stat.size
          }
        } catch {}
      }
    })
  )

  if (queue.length === 0) {
    if (!signal.aborted) {
      onCount(count, size)
    }
    return { count, size }
  }

  return new Promise((resolve) => {
    const checkDone = (): void => {
      if (queue.length === 0 && activeReads === 0 && activeStatBatches === 0 && !isDone) {
        isDone = true
        if (!signal.aborted) {
          onCount(count, size)
        }
        resolve({ count, size })
      }
    }

    const reportProgress = (): void => {
      if (onCount) {
        const now = Date.now()
        if (now - lastReport > 500) {
          lastReport = now
          onCount(count, size)
        }
      }
    }

    /** Stat files with strict concurrency limits to prevent event loop blocking. */
    const statBatch = async (files: string[]): Promise<void> => {
      activeStatBatches++
      let index = 0

      const statWorker = async () => {
        while (index < files.length && !signal.aborted) {
          const filePath = files[index++]
          try {
            const stats = await fs.promises.stat(filePath)
            size += stats.size
          } catch {
            // ignore inaccessible files
          }
          if (index % 500 === 0) {
            reportProgress()
          }
        }
      }

      // Use up to 50 concurrent fs.stat calls per directory batch
      const maxWorkers = Math.min(50, files.length)
      const workers = Array.from({ length: maxWorkers }, statWorker)

      await Promise.all(workers)

      activeStatBatches--
      reportProgress()
      checkDone()
    }

    const processQueue = (): void => {
      if (isDone || signal.aborted) {
        if (!isDone) {
          isDone = true
          resolve({ count, size })
        }
        return
      }

      while (queue.length > 0 && activeReads < parallelWorkers) {
        const currentDir = queue.shift()!
        activeReads++

        fs.readdir(currentDir, { withFileTypes: true }, (err, entries) => {
          activeReads--

          if (!err && entries) {
            const filesToStat: string[] = []

            for (let i = 0; i < entries.length; i++) {
              if (signal.aborted) break

              const entry = entries[i]
              if (excludedDirectories.has(entry.name)) continue

              const fullPath = path.join(currentDir, entry.name)
              if (excludedFilesSet.has(fullPath)) continue

              if (entry.isDirectory()) {
                queue.push(fullPath)
              } else if (entry.isFile()) {
                count++
                filesToStat.push(fullPath)
              }

              if (i % 500 === 0) {
                reportProgress()
              }
            }

            if (filesToStat.length > 0) {
              statBatch(filesToStat)
            }

            reportProgress()
          }

          processQueue()
          checkDone()
        })
      }
      checkDone()
    }

    processQueue()
  })
}
