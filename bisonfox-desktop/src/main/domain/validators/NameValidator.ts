import { INameValidator, ValidationResult } from '../interfaces/INameValidator'

export class NameValidator implements INameValidator {
  private static readonly MAX_LENGTH = 50
  private static readonly VALID_PATTERN = /^[a-zA-Z0-9_]+$/
 
   validate(name: string): ValidationResult {
     const trimmed = (name ?? '').trim()
 
     if (!trimmed) {
       return { valid: false, message: 'Name is required.' }
     }
     if (trimmed.length > NameValidator.MAX_LENGTH) {
       return {
         valid: false,
         message: `Name must not exceed ${NameValidator.MAX_LENGTH} characters.`
       }
     }
     if (!NameValidator.VALID_PATTERN.test(trimmed)) {
       return { valid: false, message: 'Name must contain letters, numbers and underscores only.' }
     }

    return { valid: true }
  }
}
