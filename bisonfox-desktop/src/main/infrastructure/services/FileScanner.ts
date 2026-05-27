import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { IFileScanner } from '@main/domain/interfaces/IFileScanner'
import { PathResult } from '@main/domain/entities/PathResult'

/** Normalise Windows drive letter to uppercase for consistent path.relative calls. */
function normalizeDriveCase(p: string): string {
  if (p.charAt(1) === ':') return p.charAt(0).toUpperCase() + p.slice(1)
  return p
}

export class FileScanner implements IFileScanner {
  /**
   * RECURSIVE SCANNER
   * Converts a list of folders into a flat list of every nested file.
   * Uses a Worker-Queue pattern to avoid recursion depth limits and maximize I/O.
   */
  async expandPaths(
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
  ): Promise<PathResult[]> {
    const results: PathResult[] = [];
    let foundCount = 0;
    const normalizedBase = normalizeDriveCase(basePath);

    // The Queue: Holds folders that still need to be explored.
    const queue: { path: string; isDir?: boolean }[] = inputs.map((path) => ({ path }));

    let activeWorkers = 0;
    let isDone = false;

    // Helper: Formats the file path and triggers the callback
    const processFile = (fullPath: string) => {
      const normalizedPath = normalizeDriveCase(fullPath);
      let relativePath = path.relative(normalizedBase, normalizedPath);

      // Safety: If relative path fails, just use the filename
      if (path.isAbsolute(relativePath) || relativePath.startsWith('..')) {
        relativePath = path.basename(fullPath);
      }

      if (onFile) {
        // Stream the file out immediately (good for RAM)
        onFile(fullPath, relativePath);
      } else {
        // Collect in memory (Warning: will use lots of RAM if millions of files)
        results.push({ fullPath, relativePath });
      }

      foundCount++;

      // Notify UI every 500 files to keep the progress bar moving without flooding IPC
      if (foundCount % 500 === 0) onScan(foundCount);
    };

    /**
     * Picks a folder from the queue, reads it, and adds sub-folders back to the queue.
     */
    const worker = async (): Promise<void> => {
      while (!signal.aborted && !isDone) {
        // Get next folder to scan
        const item = queue.shift();

        if (!item) {
          if (activeWorkers === 0) {
            // No more work and no workers busy
            isDone = true;
            break;
          }
          // Wait a moment for other workers to potentially add items to the queue
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }

        activeWorkers++;
        const currentPath = item.path;

        if (excludedPaths.has(currentPath)) {
          activeWorkers--;
          continue;
        }

        try {
          let isDirectory = item.isDir;
          if (isDirectory === undefined) {
            const stat = await fs.promises.stat(currentPath);
            isDirectory = stat.isDirectory();
          }

          if (isDirectory) {
            const normalizedPath = normalizeDriveCase(currentPath);
            let relativePath = path.relative(normalizedBase, normalizedPath);

            if (path.isAbsolute(relativePath) || relativePath.startsWith('..')) {
              relativePath = path.basename(currentPath);
            }

            onDir(relativePath);

            const dir = await fs.promises.opendir(currentPath);
            for await (const item of dir) {
              if (signal.aborted) break;
              if (excludedDirectories.has(item.name)) continue;

              const fullChildPath = path.join(currentPath, item.name);
              if (excludedPaths.has(fullChildPath)) continue;

              if (item.isDirectory()) {
                queue.push({ path: fullChildPath, isDir: true });
              } else {
                processFile(fullChildPath);
              }
            }
          } else {
            processFile(currentPath);
          }
        } catch (err: any) {
          logger.warn('FileScanner', `Skipping ${currentPath}: ${err.message}`);
          onScanError(currentPath, err.message);
        } finally {
          activeWorkers--;
        }
      }
    };

    const workers = Array.from({ length: parallelWorkers }, worker);
    await Promise.all(workers);

    onScan(foundCount);

    return results;
  }

  async countFiles(
    initialPaths: string[],
    excludedDirectories: Set<string>,
    parallelWorkers = 1,
    excludedFiles: string[] = [],
    onCount: (c: number, s: number) => void,
    signal: AbortSignal
  ): Promise<{ count: number; size: number }> {
    if (!initialPaths || initialPaths.length === 0) return { count: 0, size: 0 };

    const excludedFilesSet = new Set<string>(excludedFiles);
    let count = 0;
    let size = 0;
    let lastReport = Date.now();
    let isDone = false;
    let activeReads = 0;
    let activeStats = 0;

    // The engine's raw directory queue
    const queue: string[] = [];

    // 1. Initial Sorting: Separate direct files from directories
    await Promise.all(
      initialPaths.map(async (currentPath) => {
        if ((!excludedFilesSet.has(currentPath) && !excludedFilesSet.has(path.basename(currentPath)))) {
          try {
            const stat = await fs.promises.stat(currentPath);
            if (stat.isDirectory()) {
              queue.push(currentPath);
            } else {
              count++;
              size += stat.size;
            }
          } catch {
          }
        }
      })
    );

    if (queue.length === 0) {
      if (!signal.aborted) {
        onCount(count, size);
      }

      return { count, size };
    }

    return new Promise((resolve) => {

      const checkDone = () => {
        if (queue.length === 0 && activeReads === 0 && activeStats === 0 && !isDone) {
          isDone = true;
          if (!signal.aborted) {
            onCount(count, size);
          }

          resolve({ count, size });
        }
      };

      const reportProgress = () => {
        if (onCount) {
          const now = Date.now();
          if (now - lastReport > 500) {
            lastReport = now;
            onCount(count, size);
          }
        }
      };

      const processQueue = () => {
        if (isDone || signal.aborted) {
          if (!isDone) {
            isDone = true;
            resolve({ count, size });
          }
          return;
        }

        while (queue.length > 0 && activeReads < parallelWorkers) {
          const currentDir = queue.shift()!;
          activeReads++;

          fs.readdir(currentDir, { withFileTypes: true }, (err, entries) => {
            activeReads--;

            if (!err && entries) {
              const filesToStat: string[] = [];

              for (let i = 0; i < entries.length; i++) {
                if (signal.aborted) break;

                const entry = entries[i];
                if (excludedDirectories.has(entry.name)) continue;

                const fullPath = path.join(currentDir, entry.name);
                if (excludedFilesSet.has(fullPath)) continue;

                if (entry.isDirectory()) {
                  queue.push(fullPath);
                } else if (entry.isFile()) {
                  count++;
                  filesToStat.push(fullPath);
                }
              }

              for (let i = 0; i < filesToStat.length; i++) {
                activeStats++;
                fs.stat(filesToStat[i], (errStat, stats) => {
                  activeStats--;
                  if (!errStat) size += stats.size;
                  reportProgress();
                  checkDone();
                });
              }

              reportProgress();
            }

            processQueue();
            checkDone();
          });
        }
        checkDone();
      };

      processQueue();
    });
  }
}
