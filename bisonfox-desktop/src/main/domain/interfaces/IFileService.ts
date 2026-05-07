import { FileNode } from '@shared/entities/FileNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'

/** Options for configuring the high-speed copy engine */
export interface CopyOptions {
  basePath?: string
  excludedFiles?: string[]
  expectedTotal?: number
  expectedTotalBytes?: number
  signal?: AbortSignal
  onScan: (count: number) => void
  onProgress: (
    file: string,
    percent: number,
    completedFiles: number,
    completedBytes: number,
    failedCount: number,
    failedFiles: { path: string; reason: string }[],
    totalFiles: number,
    totalBytes: number
  ) => void
}

export interface IFileService {
  /** Paginated shallow directory listing. */
  listDir(dirPath: string, page?: number, limit?: number): Promise<PaginatedResult<FileNode[]>>

  /** Finds which page an item appears on within a directory listing. */
  findItemPage(dirPath: string, query: string, limit?: number): Promise<number | null>

  /** Deep-searches all subdirectories for an exact filename match. */
  deepFindItem(
    basePath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null>

  /** Copies files using the CopyOptions configuration object. */
  copyFiles(files: string[], destination: string, options: CopyOptions): Promise<void>

  /** Counts total files across the given paths without copying. */
  countFiles(
    files: string[],
    excludedFiles?: string[],
    onCount?: (count: number, size: number) => void,
    signal?: AbortSignal
  ): Promise<{ count: number; size: number }>
}
