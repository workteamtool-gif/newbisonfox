import { BackpressureGate } from '@main/infrastructure/services/BackpressureGate'

export interface FileScanner {
  expandPaths(
    inputs: string[],
    basePath: string,
    excludedDirectories: Set<string>,
    parallelWorkers: number,
    onScan: (count: number, size?: number) => void,
    excludedPaths: Set<string>,
    onFile: (fullPath: string, relativePath: string) => void,
    onDir: (relDir: string) => void,
    onScanError: (filePath: string, errorMessage: string) => void,
    signal: AbortSignal,
    backpressureGate?: BackpressureGate
  ): Promise<{ fullPath: string; relativePath: string }[]>

  countFiles(
    initialPaths: string[],
    excludedDirectories: Set<string>,
    parallelWorkers: number,
    excludedFiles: string[],
    onCount: (count: number, size: number) => void,
    signal: AbortSignal
  ): Promise<{ count: number; size: number }>
}
