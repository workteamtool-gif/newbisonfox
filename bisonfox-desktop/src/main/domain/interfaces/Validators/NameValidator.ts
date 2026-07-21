import { ValidationResult } from '@main/domain/entities/ValidationInfo'

export interface NameValidator {
  validate(name: string): ValidationResult
}
