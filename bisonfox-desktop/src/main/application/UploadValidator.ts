import path from 'path'
import { logger } from '@main/infrastructure/loggers/Logger'
import type { UploadSession } from '../domain/entities/UploadSession'

import { ValidationResult } from '../domain/entities/ValidationInfo'
import type { UploadValidationData } from '../domain/entities/UploadValidationData'
import { config } from '@main/appConfig'

export class UploadValidator {
  public validate(session: UploadSession, body: any): ValidationResult<UploadValidationData> {
    const { files, subfolder } = body

    const rawBaseDir = config.uploadBaseDir
    if (!rawBaseDir || rawBaseDir.trim() === '') {
      logger.error(
        'UploadValidator',
        'Upload aborted: UPLOAD_BASE_DIR is missing or empty in the .env file.'
      )
      return {
        valid: false,
        message:
          'System Configuration Error: The destination directory is not configured. We cannot copy files at this time.'
      }
    }

    const baseDir = path.resolve(rawBaseDir || '')
    const targetDest = path.resolve(baseDir, session.userName, subfolder || '')

    // SECURITY: Case-insensitive Path Traversal Check for Network Drives
    if (!targetDest.toLowerCase().startsWith(baseDir.toLowerCase())) {
      logger.error('UploadValidator', 'SECURITY: Path traversal attempt blocked!', {
        sessionId: session.id,
        user: session.userName,
        attemptedPath: targetDest
      })
      return {
        valid: false,
        message: 'Security Error: Invalid target destination.'
      }
    }

    const filesToUpload = files ?? session.diskSessions.flatMap((d) => d.selectedItemPaths)
    const allExcluded = session.diskSessions.flatMap((d) => d.excludedItemPaths ?? [])

    if (!filesToUpload || filesToUpload.length === 0) {
      return {
        valid: false,
        message: 'No files selected for upload.'
      }
    }

    let basePath: string | undefined
    const firstFile = filesToUpload[0]
    if (firstFile && firstFile.includes(':')) {
      const driveMatch = firstFile.match(/^[a-zA-Z]:\\/)
      if (driveMatch) basePath = driveMatch[0]
    }

    return {
      valid: true,
      data: {
        targetDest,
        filesToUpload,
        allExcluded,
        basePath
      }
    }
  }
}
