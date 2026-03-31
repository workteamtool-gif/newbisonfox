import { exec } from 'child_process'
import { promisify } from 'util'
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

      for (const d of rawDrives) {
        const rawDeviceId = d.DeviceID // e.g., "D:"
        const driveType = parseInt(d.DriveType) || 0
        const size = parseInt(d.Size) || 0
        const label = d.VolumeName ? d.VolumeName.trim() : ''

        // DriveType: 2 = Removable (USB Stick), 3 = Fixed (Internal HDD or External NVMe)
        // We want external drives, so we accept 2 and 3, but strictly ignore the C: drive.
        // All drives are listed, but ineligible ones are marked non-selectable.
        if (!rawDeviceId) {
          logger.debug('DiskService', 'Skipping drive: No DeviceID found', { drive: d })
          continue
        }

        let selectable = true
        let disabledReason: string | undefined

        // if (rawDeviceId.toUpperCase() === 'C:') {
        //   selectable = false
        //   disabledReason = 'System drive — cannot be selected'
        // }
        //  else if (driveType !== 2 && driveType !== 3) {
        //   selectable = false
        //   disabledReason = 'Unsupported drive type'
        // }

        // Ensure trailing slash for Node.js fs compatibility
        const letter = rawDeviceId.endsWith('\\') ? rawDeviceId : rawDeviceId + '\\'

        drives.push({
          letter,
          label: label ? `${label} (${rawDeviceId})` : `Local Disk (${rawDeviceId})`,
          totalSize: size,
          selectable,
          disabledReason
        })
      }

      return drives
    } catch (err: any) {
      // Don't fail silently! Log it so we can debug PowerShell execution policies if needed.
      logger.error('DiskService', 'Failed to list Windows drives', { error: err.message })
      return []
    }
  }
}
