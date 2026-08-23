import { ValidationResult } from '@shared/entities/ValidationResult'

export interface NameValidator {
  validate(name: string): ValidationResult
}
