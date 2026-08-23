import * as fs from 'original-fs'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import type {
  FileService as IFileService,
  CopyOptions,
  CopySummary
} from '@main/domain/interfaces/FileService'
import { FileScanner } from '@main/infrastructure/services/FileScanner'
import { listDir, getDirCount, findItemPage as findPageOfItem, deepFindItem } from '@main/infrastructure/services/DirectoryExplorer'
import { copyFiles } from '@main/infrastructure/services/FileCopyEngine'

const EXCLUDED = new Set<string>([])

/**
 * Service that acts as the coordinator and entry point for all high-level file operations.
 * Implements FileService to interface tree browsing, size counting, and copying modules.
 */
export class FileService implements IFileService {
  private readonly scanner = new FileScanner()

  // ────────────────────────────────── TREE BROWSING ──────────────────────────

  /**
   * Retrieves a paginated listing of a directory, enriching entries with filesystem node metadata.
   * Delegates the actual retrieval to `DirectoryExplorer.ts`.
   *
   * @param dirPath Absolute folder path to read.
   * @param page Target page number (starts at 1).
   * @param limit Maximum nodes per page.
   * @returns Paginated result list.
   */
  async paginatedListDir(
    dirPath: string,
    page?: number,
    limit?: number
  ): Promise<PaginatedResult<ItemNode[]>> {
    return listDir(dirPath, page, limit)
  }

  /**
   * Counts the immediate children inside a folder.
   * Delegates count execution to `DirectoryExplorer.ts`.
   *
   * @param dirPath The folder to count items in.
   * @returns Total number of immediate non-excluded children.
   */
  async getDirCount(dirPath: string): Promise<number> {
    return getDirCount(dirPath)
  }

  /**
   * Identifies the pagination page index of a specific child entry.
   *
   * @param dirPath Parent folder path.
   * @param query Target name of the child item.
   * @param limit Items per page config.
   * @returns The 1-based page index, or null if not found.
   */
  async findPageOfItem(dirPath: string, query: string, limit?: number): Promise<number | null> {
    return findPageOfItem(dirPath, query, limit)
  }

  /**
   * Recursively searches for an item and computes the parent hierarchy page markers to expand the tree view.
   * Delegates the crawler and path traversal to `DirectoryExplorer.ts`.
   *
   * @param basePath Search root directory.
   * @param query Item name search string.
   * @returns Found path and pages dictionary, or null.
   */
  async deepFindItem(
    basePath: string,
    query: string
  ): Promise<{ path: string; pages: Record<string, number> } | null> {
    return deepFindItem(basePath, query)
  }

  // ────────────────────────────────── DELEGATED SCANNING ─────────────────────

  async countFiles(
    files: string[],
    excludedFiles: string[],
    onCount: (count: number, size: number) => void,
    signal: AbortSignal
  ): Promise<{ count: number; size: number }> {
    return this.scanner.countFiles(files, EXCLUDED, 1, excludedFiles, onCount, signal)
  }

  // ────────────────────────────────── COPY ENGINE ────────────────────────────

  async copyFiles(
    initialPaths: string[],
    destination: string,
    options: CopyOptions
  ): Promise<CopySummary> {
    return copyFiles(this.scanner, initialPaths, destination, options)
  }

  /**
   * Deletes a directory and all its contents recursively.
   * Safe to call even if the directory does not exist.
   *
   * @param dirPath Path to the directory to delete.
   */
  async deleteDir(dirPath: string): Promise<void> {
    await fs.promises.rm(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}
