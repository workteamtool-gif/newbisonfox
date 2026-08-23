import { ValidationResult } from '@shared/entities/ValidationResult'

export interface SubfolderValidator {
  validate(subfolder: string): ValidationResult
}
