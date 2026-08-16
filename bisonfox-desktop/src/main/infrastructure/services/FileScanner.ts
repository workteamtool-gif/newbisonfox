import type { FileScanner as IFileScanner } from '@main/domain/interfaces/FileScanner'
import { PathResult } from '@main/domain/entities/PathResult'
import { BackpressureGate } from './BackpressureGate'
import { expandPaths } from './expandPaths'
import { countFiles } from './countFiles'

/**
 * Service class that acts as the entry point and delegator for file discovery,
 * crawling, and batched size analysis operations.
 */
export class FileScanner implements IFileScanner {
  /**
   * Converts a list of folder paths into a flat list of every nested file path.
   * Can pause crawling via a `BackpressureGate` parameter when consumers are overwhelmed.
   *
   * @param inputs Array of files/folders to search.
   * @param basePath Base directory for resolving relative paths.
   * @param excludedDirectories Set of folder names to completely skip.
   * @param parallelWorkers Count of workers crawling directories concurrently.
   * @param onScan Callback triggered every 500 files to broadcast current progress.
   * @param excludedPaths Set of exact paths to exclude.
   * @param onFile Callback invoked for each resolved child file.
   * @param onDir Callback invoked for each resolved child directory.
   * @param onScanError Callback invoked upon filesystem read/permission failure.
   * @param signal AbortSignal to cancel scanning midway.
   * @param backpressureGate Optional flow gate to pause when queue is full.
   * @returns A promise resolving to a PathResult array if onFile is not used.
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
    backpressureGate?: BackpressureGate
  ): Promise<PathResult[]> {
    return expandPaths(
      inputs,
      basePath,
      excludedDirectories,
      parallelWorkers,
      onScan,
      excludedPaths,
      onFile,
      onDir,
      onScanError,
      signal,
      backpressureGate
    )
  }

  /**
   * Performs a fast, concurrent file count and size calculation over selected paths.
   * Batches filesystem stat calls to prevent OS thread starvation or excessive stack memory usage.
   *
   * @param initialPaths Array of paths to examine.
   * @param excludedDirectories Names of folders to skip.
   * @param parallelWorkers Count of concurrent workers scanning folders.
   * @param excludedFiles Specific file paths to skip.
   * @param onCount Periodic progress callback for current file count and byte totals.
   * @param signal AbortSignal to abort counting.
   * @returns A promise resolving to the final counts and sizes.
   */
  async countFiles(
    initialPaths: string[],
    excludedDirectories: Set<string>,
    parallelWorkers = 1,
    excludedFiles: string[] = [],
    onCount: (c: number, s: number) => void,
    signal: AbortSignal
  ): Promise<{ count: number; size: number }> {
    return countFiles(
      initialPaths,
      excludedDirectories,
      parallelWorkers,
      excludedFiles,
      onCount,
      signal
    )
  }
}

export { BackpressureGate }
