export interface ValidationResult {
  valid: boolean
  message?: string
}

export interface INameValidator {
  validate(name: string): ValidationResult
}
