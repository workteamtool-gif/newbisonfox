import { ItemNode } from '@shared/entities/ItemNode'
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

/** Final result returned once the copy engine finishes all workers */
export interface CopySummary {
  completedFiles: number
  completedBytes: number
  failedCount: number
  failedFiles: { path: string; reason: string }[]
  totalFiles: number
  totalBytes: number
}

export interface IFileService {
  /** Paginated shallow directory listing. */
  listDir(dirPath: string, page?: number, limit?: number): Promise<PaginatedResult<ItemNode[]>>

  /** Gets the total count of items in a directory without retrieving them. */
  getDirCount(dirPath: string): Promise<number>

  /** Finds which page an item appears on within a directory listing. */
  findItemPage(dirPath: string, query: string, limit?: number): Promise<number | null>

  /** Deep-searches all subdirectories for an exact filename match. */
  deepFindItem(
    basePath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null>

  /** Copies files using the CopyOptions configuration object. Returns a summary of results. */
  copyFiles(files: string[], destination: string, options: CopyOptions): Promise<CopySummary>

  /** Counts total files across the given paths without copying. */
  countFiles(
    files: string[],
    excludedFiles?: string[],
    onCount?: (count: number, size: number) => void,
    signal?: AbortSignal
  ): Promise<{ count: number; size: number }>

  /**
   * Moves a directory from src to dest.
   * Tries fs.rename first (fast, atomic on same drive).
   * Falls back to recursive copy + delete for cross-device moves.
   */
  moveDir(src: string, dest: string): Promise<void>

  /** Deletes a directory and all its contents recursively. */
  deleteDir(dirPath: string): Promise<void>
}
