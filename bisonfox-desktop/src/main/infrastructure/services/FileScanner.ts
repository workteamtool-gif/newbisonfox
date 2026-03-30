import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/Logger'
import { IFileScanner } from '@main/domain/interfaces/IFileScanner'

/** System directories to always skip during scanning. */
const EXCLUDED = new Set(['$RECYCLE.BIN', 'System Volume Information', '.git'])

/** How many parallel workers for directory scanning/counting. */
const SCAN_CONCURRENCY = 50

/** Normalise Windows drive letter to uppercase for consistent path.relative calls. */
function normalizeDriveCase(p: string): string {
  if (p.charAt(1) === ':') return p.charAt(0).toUpperCase() + p.slice(1)
  return p
}

export class FileScanner implements IFileScanner {
  async expandPaths(
    inputs: string[],
    basePath: string,
    onScan?: (count: number) => void,
    excludedPaths?: Set<string>,
    onFile?: (src: string, rel: string) => void,
    onDir?: (relDir: string) => void,
    onScanError?: (filePath: string, errorMessage: string) => void,
    signal?: AbortSignal
  ): Promise<{ src: string; rel: string }[]> {
    const results: { src: string; rel: string }[] = [];
    let foundCount = 0;
    const normBase = normalizeDriveCase(basePath);
    const queue: { p: string; isDir?: boolean }[] = inputs.map((p) => ({ p }));
    let activeWorkers = 0;
    let isDone = false;

    const processFile = (fullPath: string) => {
      const normSrc = normalizeDriveCase(fullPath);
      let rel = path.relative(normBase, normSrc);
      if (path.isAbsolute(rel) || rel.startsWith('..')) rel = path.basename(fullPath);

      if (onFile) {
        onFile(fullPath, rel);
      } else {
        results.push({ src: fullPath, rel });
      }

      foundCount++;
      if (onScan && foundCount % 500 === 0) onScan(foundCount);
    };

    const worker = async (): Promise<void> => {
      while (true) {
        if (signal?.aborted || isDone) break;

        const item = queue.shift();
        if (!item) {
          if (activeWorkers === 0) {
            isDone = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }

        activeWorkers++;
        const p = item.p;

        if (excludedPaths?.has(p)) {
          activeWorkers--;
          continue;
        }

        try {
          let isDirectory = item.isDir;
          if (isDirectory === undefined) {
            const stat = await fs.promises.stat(p);
            isDirectory = stat.isDirectory();
          }

          if (isDirectory) {
            const normSrc = normalizeDriveCase(p);
            let rel = path.relative(normBase, normSrc);
            if (path.isAbsolute(rel) || rel.startsWith('..')) rel = path.basename(p);
            if (onDir) onDir(rel);

            const dir = await fs.promises.opendir(p);
            for await (const e of dir) {
              if (signal?.aborted) break;
              if (EXCLUDED.has(e.name)) continue;

              const fullChildPath = path.join(p, e.name);
              if (excludedPaths?.has(fullChildPath)) continue;

              if (e.isDirectory()) {
                queue.push({ p: fullChildPath, isDir: true });
              } else {
                processFile(fullChildPath);
              }
            }
          } else {
            processFile(p);
          }
        } catch (err: any) {
          logger.warn('FileScanner', `Skipping ${p}: ${err.message}`);
          if (onScanError) onScanError(p, err.message);
        } finally {
          activeWorkers--;
        }
      }
    };

    const workers = Array.from({ length: SCAN_CONCURRENCY }, worker);
    await Promise.all(workers);

    if (onScan && !onFile) onScan(foundCount);
    return results;
  }

  async countFiles(
    initialPaths: string[],
    excludedFiles?: string[],
    onCount?: (c: number) => void,
    signal?: AbortSignal
  ): Promise<number> {
    if (!initialPaths || initialPaths.length === 0) return 0;

    const excluded = new Set<string>(excludedFiles ?? []);
    let count = 0;
    let lastReport = Date.now();
    let isDone = false;
    let activeReads = 0;

    // The engine's raw directory queue
    const queue: string[] = [];
    const MAX_CONCURRENT_READS = 100; // Sweet spot for saturating Windows I/O without crashing it

    // 1. Initial Sorting: Separate direct files from directories
    await Promise.all(
      initialPaths.map(async (p) => {
        if (excluded.has(p) || excluded.has(path.basename(p))) return;
        try {
          const stat = await fs.promises.stat(p);
          if (stat.isDirectory()) {
            queue.push(p);
          } else {
            count++;
          }
        } catch {
        }
      })
    );

    if (queue.length === 0) {
      if (onCount && !signal?.aborted) onCount(count);
      return count;
    }

    return new Promise((resolve) => {

      const checkDone = () => {
        if (queue.length === 0 && activeReads === 0 && !isDone) {
          isDone = true;
          if (onCount && !signal?.aborted) onCount(count);
          resolve(count);
        }
      };

      const processQueue = () => {
        if (isDone || signal?.aborted) {
          if (!isDone) {
            isDone = true;
            resolve(count);
          }
          return;
        }

        while (queue.length > 0 && activeReads < MAX_CONCURRENT_READS) {
          const currentDir = queue.shift()!;
          activeReads++;

          fs.readdir(currentDir, { withFileTypes: true }, (err, entries) => {
            activeReads--;

            if (!err && entries) {
              for (let i = 0; i < entries.length; i++) {
                if (signal?.aborted) break;

                const ent = entries[i];
                if (EXCLUDED.has(ent.name)) continue;

                const fullPath = path.join(currentDir, ent.name);
                if (excluded.has(fullPath)) continue;

                if (ent.isDirectory()) {
                  queue.push(fullPath);
                } else if (ent.isFile()) {
                  count++;
                }
              }

              if (onCount) {
                const now = Date.now();
                if (now - lastReport > 500) {
                  lastReport = now;
                  onCount(count);
                }
              }
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
