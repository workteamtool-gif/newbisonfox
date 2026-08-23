import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { FailedFile } from '@shared/entities/FailedFile'

export interface CopyOptions {
  basePath?: string
  finalDest?: string
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
    failedFiles: FailedFile[],
    totalFilesAmount: number,
    totalBytes: number
  ) => void
}
export interface CopySummary {
  completedFiles: number
  completedBytes: number
  failedCount: number
  failedFiles: FailedFile[]
  totalFilesAmount: number
  totalBytes: number
}

export interface FileService {
  paginatedListDir(dirPath: string, page?: number, limit?: number): Promise<PaginatedResult<ItemNode[]>>

  getDirCount(dirPath: string): Promise<number>

  findPageOfItem(dirPath: string, query: string, limit?: number): Promise<number | null>

  deepFindItem(
    basePath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null>

  copyFiles(files: string[], destination: string, options: CopyOptions): Promise<CopySummary>

  countFiles(
    files: string[],
    excludedFiles?: string[],
    onCount?: (count: number, size: number) => void,
    signal?: AbortSignal
  ): Promise<{ count: number; size: number }>

  deleteDir(dirPath: string): Promise<void>
}
