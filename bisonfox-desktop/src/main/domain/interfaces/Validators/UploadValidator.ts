import { ValidationResult } from '@shared/entities/ValidationResult'
import { UploadValidationData } from '@main/domain/entities/UploadValidationData'
import { UploadSession } from '@main/domain/entities/UploadSession'
import { UploadPayload } from '@shared/entities/UploadPayload'

export interface UploadValidator {
  validate(session: UploadSession, payload: UploadPayload): ValidationResult<UploadValidationData>
}
