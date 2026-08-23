import type { SubfolderValidator as ISubfolderValidator } from '@main/domain/interfaces/Validators/SubfolderValidator'
import { ValidationResult } from '@main/domain/entities/ValidationInfo'
import { config } from '@main/appConfig'

export class SubfolderValidator implements ISubfolderValidator {
  private static readonly MAX_LENGTH = config.subfolderLength
  private static readonly VALID_PATTERN = /^[a-zA-Z0-9 _-]+$/
  private static readonly RESERVED_PATTERN = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

  validate(subfolder: string): ValidationResult {
    const trimmedSubfolder = (subfolder ?? '').trim()

    if (!trimmedSubfolder) {
      return { valid: true }
    }

    if (trimmedSubfolder.length > SubfolderValidator.MAX_LENGTH) {
      return {
        valid: false,
        message: `שם התיקייה אינו תקין. עליו להכיל עד ${SubfolderValidator.MAX_LENGTH} תווים.`
      }
    }

    if (SubfolderValidator.RESERVED_PATTERN.test(trimmedSubfolder)) {
      return { valid: false, message: 'שם התיקייה שבחרת הינו אסור לשימוש במערכת' }
    }

    if (!SubfolderValidator.VALID_PATTERN.test(trimmedSubfolder)) {
      return {
        valid: false,
        message: 'השם יכול להכיל רק אותיות, מספרים, רווחים, מקפים וקווים תחתונים.'
      }
    }

    return { valid: true }
  }
}
