import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import { IDiskService } from '../../domain/interfaces/IDiskService'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { logger } from '../Logger'

const execAsync = promisify(exec)

export class DiskService implements IDiskService {
  async listDrives(): Promise<DriveInfo[]> {
    if (process.platform !== 'win32') {
      logger.warn('DiskService', 'listDrives is currently only implemented for Windows.')
      return []
    }
    return this.listWindowsDrives()
  }

  private async listWindowsDrives(): Promise<DriveInfo[]> {
    try {
      // 1. Use PowerShell (Future-proof for Windows 11)
      // 2. Output as JSON (Fixes the comma-parsing bug natively)
      const psCommand = `Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, DriveType, VolumeName, Size | ConvertTo-Json -Compress`

      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCommand}"`)

      if (!stdout.trim()) return []
      
      // If there is only one drive, PowerShell returns an object. If multiple, an array.
      const parsed = JSON.parse(stdout)
      const rawDrives: any[] = Array.isArray(parsed) ? parsed : [parsed]

      const drives: DriveInfo[] = []
      const hiddenDrivesEnv = process.env.HIDDEN_DRIVES || 'C:'
      const hiddenDrives = hiddenDrivesEnv.split(',').map((drive) => drive.trim().toUpperCase())

      for (const rawDrive of rawDrives) {
        const rawDeviceId = rawDrive.DeviceID // e.g., "D:"

        if (!rawDeviceId) {
          logger.debug('DiskService', 'Skipping drive: No DeviceID found', { drive: rawDrive })
        } else {
            const upperDeviceId = rawDeviceId.toUpperCase()
            if (!hiddenDrives.includes(upperDeviceId)) {              
            const driveType = parseInt(rawDrive.DriveType) || 0
            const size = parseInt(rawDrive.Size) || 0
            const label = rawDrive.VolumeName ? rawDrive.VolumeName.trim() : ''

            let selectable = true
            let disabledReason: string | undefined

            // Ensure trailing slash for Node.js fs compatibility
            const letter = rawDeviceId.endsWith('\\') ? rawDeviceId : rawDeviceId + '\\'

            if (driveType !== 2 && driveType !== 3) {
              selectable = false
              disabledReason = 'Unsupported drive type'
            } else {
              try {
                await fs.promises.access(letter, fs.constants.R_OK)
              } catch (err) {
                selectable = false
                disabledReason = 'Unreadable or access denied'
              }
            }
            drives.push({
              letter,
              label: label ? `${label} (${rawDeviceId})` : `Local Disk (${rawDeviceId})`,
              totalSize: size,
              selectable,
              disabledReason
            })
            }
          }
      }

      return drives
    } catch (err: any) {
      // Don't fail silently! Log it so we can debug PowerShell execution policies if needed.
      logger.error('DiskService', 'Failed to list Windows drives', { error: err.message })
      return []
    }
  }
}
