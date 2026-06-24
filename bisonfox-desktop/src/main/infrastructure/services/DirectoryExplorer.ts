import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { config } from '@main/appConfig'

const EXCLUDED = new Set<string>([])
const DEEP_SEARCH_CONCURRENCY = config.deepSearchConcurrency
const ITEMS_IN_ONE_PAGE = config.itemsInOnePage

/**
 * Lists the directory contents at the specified path with support for pagination
 */
export async function listDir(
  dirPath: string,
  page: number = 1,
  limit: number = ITEMS_IN_ONE_PAGE
): Promise<PaginatedResult<ItemNode[]>> {
  try {
    const startIndex = (page - 1) * limit
    const endIndex = page * limit

    const pageEntries: { name: string; isDirectory: boolean }[] = []
    let currentIndex = 0
    let hasMore = false

    const dir = await fs.promises.opendir(dirPath)
    for await (const e of dir) {
      if (EXCLUDED.has(e.name)) continue

      if (currentIndex >= startIndex && currentIndex < endIndex) {
        pageEntries.push({ name: e.name, isDirectory: e.isDirectory() })
      } else if (currentIndex >= endIndex) {
        hasMore = true
        break
      }
      currentIndex++
    }

    const enriched = await Promise.all(
      pageEntries.map(async (entry): Promise<ItemNode> => {
        const fullPath = path.join(dirPath, entry.name)
        const node: ItemNode = {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory
        }

        if (entry.isDirectory) {
          node.hasChildren = true
        } else {
          try {
            const st = await fs.promises.stat(fullPath)
            node.size = st.size
          } catch {
            node.size = 0
          }
        }
        return node
      })
    )

    // -1 indicates that totalPages is still loading
    return { nodes: enriched, hasMore, totalPages: -1 }
  } catch (err: any) {
    logger.warn('FileService', `Access denied or failed to read dir: ${dirPath}`, {
      error: err.message
    })
    return { nodes: [], hasMore: false, totalPages: 1 }
  }
}

/**
 * Counts the total number of non-excluded entries directly inside the directory.
 * Does not recursively traverse subdirectories
 */
export async function getDirCount(dirPath: string): Promise<number> {
  try {
    let count = 0
    const dir = await fs.promises.opendir(dirPath)
    for await (const e of dir) {
      if (!EXCLUDED.has(e.name)) count++
    }
    return count
  } catch {
    return 0
  }
}

/**
 * Finds the page index where an item resides inside a directory's paginated list
 */
export async function findItemPage(
  dirPath: string,
  query: string,
  limit: number = ITEMS_IN_ONE_PAGE
): Promise<number | null> {
  try {
    const lowerQuery = query.toLowerCase()
    let index = 0

    const dir = await fs.promises.opendir(dirPath)
    for await (const e of dir) {
      if (EXCLUDED.has(e.name)) continue

      if (e.name.toLowerCase().includes(lowerQuery)) {
        return Math.floor(index / limit) + 1
      }
      index++
    }

    return null
  } catch {
    return null
  }
}

/**
 * Searches the folder structure recursively beginning at `basePath` for an item name
 * matching `query`. Performs deep tree search and resolves the final absolute path
 * along with the paginated parent tree page references to reach the item.
 *
 * @param basePath The absolute starting path for search.
 * @param query The filename or directory name match query.
 * @returns A promise resolving to the path and paginated index map, or null if not found.
 */
export async function deepFindItem(
  basePath: string,
  query: string
): Promise<{ path: string; pages: Record<string, number> } | null> {
  const lowerQuery = query.toLowerCase()

  const exactPath = await new Promise<string | null>((resolve) => {
    let isDone = false
    let running = 0
    const queued: string[] = [basePath]

    const tryNext = (): void => {
      while (running < DEEP_SEARCH_CONCURRENCY && queued.length > 0 && !isDone) {
        const dir = queued.shift()!
        running++
        crawl(dir)
      }
      if (running === 0 && queued.length === 0 && !isDone) {
        isDone = true
        resolve(null)
      }
    }

    const crawl = async (dirPath: string): Promise<void> => {
      if (isDone) {
        running--
        tryNext()
        return
      }
      try {
        const dir = await fs.promises.opendir(dirPath)
        for await (const e of dir) {
          if (isDone) break
          if (EXCLUDED.has(e.name)) continue

          if (e.name.toLowerCase().includes(lowerQuery)) {
            isDone = true
            resolve(path.join(dirPath, e.name))
            return
          }
          if (e.isDirectory()) queued.push(path.join(dirPath, e.name))
        }
      } catch {}
      running--
      tryNext()
    }

    tryNext()
  })

  if (!exactPath) return null

  const pages: Record<string, number> = {}
  let current = exactPath

  while (current !== basePath && current.length > basePath.length) {
    const parentDir = path.dirname(current)
    const itemName = path.basename(current)
    const page = await findItemPage(parentDir, itemName)
    if (page) pages[parentDir] = page

    current = parentDir
    if (current === path.dirname(current)) break
  }

  return { path: exactPath, pages }
}
