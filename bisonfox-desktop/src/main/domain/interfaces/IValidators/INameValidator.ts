import { ValidationResult } from "@main/domain/entities/ValidationInfo"

export interface INameValidator {
  validate(name: string): ValidationResult
}