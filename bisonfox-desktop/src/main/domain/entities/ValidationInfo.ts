export type ValidationResult<T = void> =
  | (T extends void ? { valid: true } : { valid: true; data: T })
  | { valid: false; message: string }