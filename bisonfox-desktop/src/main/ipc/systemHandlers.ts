import { app, ipcMain } from 'electron'
import { spawn } from 'child_process'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import { HardwareService } from '../infrastructure/services/HardwareService'

// SYSTEM handlers deal with OS-level operations: app lifecycle, hardware detection, and CLI access.
export function registerSystemHandlers(hardwareService: HardwareService): void {
  // Checks whether a physical keyboard is currently attached to the machine.
  ipcMain.handle(IPC_CHANNELS.SYSTEM.DETECT_KEYBOARD, async () => {
    const hasKeyboard = await hardwareService.detectKeyboard()
    return { hasKeyboard }
  })

  // Forces the Electron application to quit from a frontend action.
  ipcMain.handle(IPC_CHANNELS.SYSTEM.CLOSE, () => {
    app.quit()
    return { success: true }
  })

  // Opens a detached Windows CMD window (used for on-site debugging / admin tasks).
  ipcMain.handle(IPC_CHANNELS.SYSTEM.OPEN_CMD, () => {
    try {
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { detached: true, stdio: 'ignore' })
      return { success: true }
    } catch (err: unknown) {
      console.error('Failed to open CMD:', err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
