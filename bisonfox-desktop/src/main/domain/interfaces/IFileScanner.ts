export interface IFileScanner {
  /**
   * Recursively scans directories to build a list of all files to copy.
   */
  expandPaths(
    inputs: string[],
    basePath: string,
    excludedDirectories: Set<string>,
    parallelWorkers: number,
    onScan?: (count: number) => void,
    excludedPaths?: Set<string>,
    onFile?: (src: string, rel: string) => void,
    onDir?: (relDir: string) => void,
    onScanError?: (filePath: string, errorMessage: string) => void,
    signal?: AbortSignal
  ): Promise<{ src: string; rel: string }[]>

  /**
   * Performs a rapid, read-only scan to get the total number of files.
   */
  countFiles(
    initialPaths: string[],
    excludedDirectories: Set<string>,
    parallelWorkers: number,
    excludedFiles?: string[],
    onCount?: (count: number) => void,
    signal?: AbortSignal
  ): Promise<number>
}
