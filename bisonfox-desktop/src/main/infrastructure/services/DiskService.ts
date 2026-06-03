import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import { IDiskService } from '@main/domain/interfaces/IDiskService'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { logger } from '@main/infrastructure/loggers/Logger'
import { config } from '@main/appConfig'

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
      // Use fsutil fsinfo drives to get list of available drives
      const { stdout } = await execAsync('fsutil fsinfo drives')

      if (!stdout.trim()) return []
      
      // Parse output: "Drives: C:\ D:\ E:\" -> extract drive letters
      const drivesMatch = stdout.match(/Drives:\s*(.*)/i)
      if (!drivesMatch) return []
      
      const driveLetters = drivesMatch[1]
        .split(/\s+/)
        .map(d => d.trim().replace(/\\$/, '')) // Remove trailing backslash
        .filter(d => /^[A-Z]:$/i.test(d))

      const drives: DriveInfo[] = []
      const blacklistDrivesEnv = config.blacklistDrives
      const blacklistDrives = blacklistDrivesEnv.split(',').map((drive) => drive.trim().toUpperCase())

      for (const deviceId of driveLetters) {
        const upperDeviceId = deviceId.toUpperCase()

        if (!upperDeviceId) {
          logger.info('DiskService', 'Skipping drive: No DeviceID found', { drive: deviceId })
        } else {
            if (!blacklistDrives.includes(upperDeviceId)) {              
            
            let selectable = true
            let disabledReason: string | undefined

            // Ensure trailing slash for Node.js fs compatibility
            const letter = upperDeviceId.endsWith('\\') ? upperDeviceId : upperDeviceId + '\\'
            try {
              await fs.promises.access(letter, fs.constants.R_OK)
            } catch (err) {
              selectable = false
              disabledReason = 'Unreadable or access denied'
            }
            drives.push({
              letter,
              selectable,
              disabledReason
            })
            }
          }
      }

      return drives
    } catch (err: any) {
      logger.error('DiskService', 'Failed to list Windows drives', { error: err.message })
      return []
    }
  }
}
