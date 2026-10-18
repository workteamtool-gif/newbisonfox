import fs from 'original-fs'
import path from 'path'
import { config } from '@main/appConfig'
import { FailedDir } from '@shared/entities/FailedDir'

/** Directories that must be reachable for the app to function correctly. */
export const CRITICAL_DIRS = [...new Set([
  config.uploadFinalDir,
  config.uploadingStagingDir,
  config.logDir,
  config.keepAliveDir,
  config.mailDir,
  config.reusableCodesDir,
  config.disposableCodesDir,
  config.usedCodesDir,
  config.uploadFinalRestrictedDir
].filter(Boolean))]

/**
 * Checks whether all critical directories are accessible (read + write).
 * Returns an array of directories that failed the check.
 */
export async function checkDirectories(): Promise<FailedDir[]> {
  const results = await Promise.all(
    CRITICAL_DIRS.map(async (dirPath) => {
      try {
        await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK)
        return null
      } catch {
        return { name: path.basename(dirPath), path: dirPath } satisfies FailedDir
      }
    })
  )
  return results.filter(Boolean) as FailedDir[]
}
