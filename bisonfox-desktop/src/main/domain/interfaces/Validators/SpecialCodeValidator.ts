import { ValidationResult } from '@main/domain/entities/ValidationInfo'

export interface SpecialCodeValidator {
  validate(specialCode: string, sessionId: string): Promise<ValidationResult>
}

