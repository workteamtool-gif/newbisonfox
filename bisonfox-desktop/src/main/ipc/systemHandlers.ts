import { ipcMain } from 'electron'
import fs from 'original-fs'
import path from 'path'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { SystemService } from '@main/infrastructure/services/SystemService'
import { config } from '@main/appConfig'

import { FailedDir } from '@shared/entities/FailedDir'

/** Directories that must be reachable for the app to function correctly. */
const CRITICAL_DIRS = [...new Set([
  config.uploadFinalDir,
  config.uploadingStagingDir,
  config.endpointDestinationFolder,
  config.logDir,
  config.keepAliveDir,
  config.mailDir,
  config.reusableCodesDir,
  config.disposableCodesDir,
  config.usedCodesDir,
  config.uploadFinalRestrictedDir
].filter(Boolean))]

// SYSTEM handlers deal with OS-level operations: app lifecycle, hardware detection, and CLI access.
export function registerSystemHandlers(systemService: SystemService): void {
  // Checks whether a physical keyboard is currently attached to the machine.
  ipcMain.handle(IPC_CHANNELS.SYSTEM.DETECT_KEYBOARD, async () => {
    const hasKeyboard = await systemService.detectKeyboard()
    return { hasKeyboard }
  })

  // Forces the Electron application to quit from a frontend action.
  ipcMain.handle(IPC_CHANNELS.SYSTEM.CLOSE, () => {
    return systemService.quitApp()
  })

  // Opens a detached Windows CMD window (used for on-site debugging / admin tasks).
  ipcMain.handle(IPC_CHANNELS.SYSTEM.OPEN_CMD, () => {
    return systemService.openCmd()
  })

  // Checks whether all critical directories are accessible. Returns failed dirs as { name, path }.
  ipcMain.handle(IPC_CHANNELS.SYSTEM.CHECK_DIRS, async (): Promise<FailedDir[]> => {
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
  })
}
