import { ValidationResult } from '@main/domain/entities/ValidationInfo'

export interface ISubfolderValidator {
  validate(subfolder: string): ValidationResult
}
