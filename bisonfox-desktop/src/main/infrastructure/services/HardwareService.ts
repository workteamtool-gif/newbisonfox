import { exec } from 'child_process'

export class HardwareService {
  /**
   * Detects if a physical keyboard is attached to the Windows machine.
   * Runs a PowerShell command to count Win32_Keyboard devices.
   */
  async detectKeyboard(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const cmd = 'powershell -NoProfile -Command "(Get-WmiObject Win32_Keyboard | Measure-Object).Count"'
      exec(cmd, { timeout: 5000 }, (err, stdout) => {
        if (err) {
          // Fallback to assuming keyboard exists if query fails
          resolve(true)
          return
        }
        const count = parseInt(stdout.trim(), 10)
        const hasKeyboard = !isNaN(count) && count > 0
        resolve(hasKeyboard)
      })
    })
  }
}
