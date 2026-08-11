import * as fs from 'original-fs'
import * as path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'

/**
 * Moves a staged file to its final destination atomically.
 * To prevent background "empty folder cleaner" processes from deleting the
 * newly-created destination directories before the rename occurs, we immediately
 * touch the destination file (creating a 0-byte anchor) after creating the directories.
 * This ensures the folders are never empty from the cleaner's perspective.
 *
 * @param srcPath      Absolute path of the staged file.
 * @param destPath     Absolute path of the final file.
 */
export async function atomicMoveWithHandles(srcPath: string, destPath: string): Promise<void> {
  const destDir = path.dirname(destPath)

  try {
    // 1. Create all missing destination directory segments.
    await fs.promises.mkdir(destDir, { recursive: true }).catch((err: unknown) => {
      if (fs.existsSync(destDir)) return // Ignore error if directory already exists
      logger.error('fsUtils', `Failed to make directory in destination directory: ${destDir}`, {
        error: err instanceof Error ? err.message : String(err)
      })
    })

    // 2. Touch the destination file to act as an anchor
    await fs.promises.writeFile(destPath, '', { flag: 'a' }).catch(() => {})

    // 3. Atomic rename — the file survives this and overwrites the anchor.
    await fs.promises.rename(srcPath, destPath)
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'EXDEV' || nodeErr.code === 'EPERM') {
      // Cross-device link not permitted, fallback to copy + delete
      try {
        await fs.promises.copyFile(srcPath, destPath)
        await fs.promises.unlink(srcPath).catch(() => {})
        return
      } catch (fallbackErr) {
        logger.error('fsUtils', `EXDEV fallback failed: ${srcPath} -> ${destPath}`, {
          error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        })
        throw fallbackErr
      }
    }

    logger.error('fsUtils', `Failed to atomically move staged file: ${srcPath} -> ${destPath}`, {
      error: nodeErr.message || String(err)
    })
    throw err
  }
}
