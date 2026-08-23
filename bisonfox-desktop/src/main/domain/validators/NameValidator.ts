import type { NameValidator as INameValidator } from '@main/domain/interfaces/Validators/NameValidator'
import { ValidationResult } from '@shared/entities/ValidationResult'
import { config } from '@main/appConfig'

export class NameValidator implements INameValidator {
  private static readonly MAX_LENGTH = config.usernameLength
  private static readonly VALID_PATTERN = /^[a-zA-Z0-9_.-]+$/
  private static readonly RESERVED_PATTERN = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

  validate(name: string): ValidationResult {
    const trimmed = (name ?? '').trim()

    if (!trimmed) {
      return {
        valid: false,
        message: 'שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, נקודה, קו תחתון ומקף.'
      }
    }
    if (trimmed.length > NameValidator.MAX_LENGTH) {
      return {
        valid: false,
        message: `שם המשתמש אינו תקין. עליו להכיל עד ${NameValidator.MAX_LENGTH} תווים.`
      }
    }
    if (NameValidator.RESERVED_PATTERN.test(trimmed)) {
      return { valid: false, message: 'שם המשתמש שבחרת הינו אסור לשימוש במערכת' }
    }
    if (!NameValidator.VALID_PATTERN.test(trimmed)) {
      return {
        valid: false,
        message: 'שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, נקודה, קו תחתון ומקף.'
      }
    }

    return { valid: true }
  }
}
