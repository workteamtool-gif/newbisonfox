import { ValidationResult } from '@shared/entities/ValidationResult'

export interface SpecialCodeValidator {
  validate(specialCode: string, sessionId: string): Promise<ValidationResult>
}

