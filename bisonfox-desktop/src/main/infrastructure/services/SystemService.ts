import { app } from 'electron'
import { spawn } from 'child_process'
import { HardwareService } from '@main/infrastructure/services/HardwareService'

export class SystemService {
  constructor(private hardwareService: HardwareService) {}

  async detectKeyboard(): Promise<boolean> {
    return this.hardwareService.detectKeyboard()
  }

  quitApp(): { success: boolean } {
    app.quit()
    return { success: true }
  }

  openCmd(): { success: boolean; error?: string } {
    try {
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { detached: true, stdio: 'ignore' })
      return { success: true }
    } catch (err: unknown) {
      console.error('Failed to open CMD:', err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
