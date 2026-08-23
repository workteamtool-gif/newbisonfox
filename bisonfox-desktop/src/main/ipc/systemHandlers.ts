import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { SystemService } from '@main/infrastructure/services/SystemService'

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
}
