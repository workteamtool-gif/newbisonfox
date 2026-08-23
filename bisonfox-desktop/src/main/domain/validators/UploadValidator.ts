import path from 'path'
import { logger, getFirstMacAddress } from '@main/infrastructure/loggers/Logger'
import type { UploadSession } from '@main/domain/entities/UploadSession'
import { ValidationResult } from '@shared/entities/ValidationResult'
import type { UploadValidationData } from '@main/domain/entities/UploadValidationData'
import type { UploadPayload } from '@shared/entities/UploadPayload'
import { config } from '@main/appConfig'
import type { UploadValidator as IUploadValidator } from '@main/domain/interfaces/Validators/UploadValidator'

export class UploadValidator implements IUploadValidator {
  public validate(
    session: UploadSession,
    payload: UploadPayload
  ): ValidationResult<UploadValidationData> {
    const { files, subfolder } = payload

    const configValidation = this.validateSystemConfig(session)
    if (!configValidation.valid) {
      return configValidation as ValidationResult<UploadValidationData>
    }

    const { rawUploadFinalDir, rawUploadingStagingDir } = configValidation.data!

    const baseDir = path.resolve(rawUploadFinalDir)
    const finalDest = path.resolve(baseDir, session.username, subfolder || '')

    const securityValidation = this.validateSecurity(session, finalDest, baseDir)
    if (!securityValidation.valid) {
      return securityValidation as ValidationResult<UploadValidationData>
    }

    const macFolder = getFirstMacAddress()
    const stagingDest = path.resolve(rawUploadingStagingDir, macFolder, session.username, subfolder || '')

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
    if (firstFile) {
      const parsedRoot = path.parse(firstFile).root
      if (parsedRoot) basePath = parsedRoot
    }

    return {
      valid: true,
      data: {
        stagingDest,
        finalDest,
        filesToUpload,
        allExcluded,
        basePath
      }
    }
  }

  private validateSystemConfig(session: UploadSession): ValidationResult<{ rawUploadFinalDir: string; rawUploadingStagingDir: string }> {
    const rawUploadFinalDir = session.isRestricted ? config.uploadFinalRestrictedDir : config.uploadFinalDir
    if (!rawUploadFinalDir || rawUploadFinalDir.trim() === '') {
      logger.error(
        'UploadValidator',
        'Upload aborted: Destination directory is missing or empty in the config.'
      )
      return {
        valid: false,
        message:
          'System Configuration Error: The destination directory is not configured. We cannot copy files at this time.'
      }
    }

    const rawUploadingStagingDir = config.uploadingStagingDir
    if (!rawUploadingStagingDir || rawUploadingStagingDir.trim() === '') {
      logger.error(
        'UploadValidator',
        'Upload aborted: Staging directory is missing or empty in the config.'
      )
      return {
        valid: false,
        message:
          'System Configuration Error: The temporary staging directory is not configured. We cannot copy files at this time.'
      }
    }

    return {
      valid: true,
      data: { rawUploadFinalDir, rawUploadingStagingDir }
    }
  }

  private validateSecurity(session: UploadSession, finalDest: string, baseDir: string): ValidationResult {
    // SECURITY: Case-insensitive Path Traversal Check for Network Drives
    if (!finalDest.toLowerCase().startsWith(baseDir.toLowerCase())) {
      logger.error('UploadValidator', 'SECURITY: Path traversal attempt blocked!', {
        sessionId: session.id,
        user: session.username,
        attemptedPath: finalDest
      })
      return {
        valid: false,
        message: 'Security Error: Invalid target destination.'
      }
    }

    return { valid: true }
  }
}
