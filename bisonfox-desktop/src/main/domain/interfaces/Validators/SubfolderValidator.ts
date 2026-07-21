import { ValidationResult } from '@main/domain/entities/ValidationInfo'

export interface SubfolderValidator {
  validate(subfolder: string): ValidationResult
}
