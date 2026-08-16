import fs from 'original-fs'
import path from 'path'
import type { SpecialCodeValidator as ISpecialCodeValidator } from '../interfaces/Validators/SpecialCodeValidator'
import { ValidationResult } from '../entities/ValidationInfo'
import { SessionSingleton } from '@main/application/UploadSession'
import { config } from '@main/appConfig'

export class SpecialCodeValidator implements ISpecialCodeValidator {
  private static readonly MAX_LENGTH = config.specialCodeLength
  private readonly sessionSingletonInstance = SessionSingleton.getInstance()

  async validate(specialCode: string, sessionId: string): Promise<ValidationResult> {
    const trimmed = (specialCode ?? '').trim()

    if (!trimmed) return { valid: true }

    if (trimmed.length > SpecialCodeValidator.MAX_LENGTH) {
      return { valid: false, message: 'הקוד שהוזן ארוך מדי' }
    }

    const reusableMatch = await this.findCodeInDir(config.reusableCodesDir, trimmed)
    if (reusableMatch) {
      this.sessionSingletonInstance.update(sessionId, { isRestricted: true })
      return { valid: true }
    }

    const disposableMatch = await this.findCodeInDir(config.disposableCodesDir, trimmed)
    if (disposableMatch) {
      await this.consumeDisposableCode(disposableMatch)
      this.sessionSingletonInstance.update(sessionId, { isRestricted: true })
      return { valid: true }
    }

    return { valid: false, message: 'קוד שגוי או שכבר נעשה בו שימוש' }
  }

  private async findCodeInDir(dirPath: string, code: string): Promise<string | null> {
    try {
      if (!fs.existsSync(dirPath)) return null
      const files = await fs.promises.readdir(dirPath)
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        const stat = await fs.promises.stat(filePath)
        if (stat.isFile()) {
          const content = (await fs.promises.readFile(filePath, 'utf-8')).trim()
          if (content === code) return filePath
        }
      }
    } catch (err) {
      console.error(`Error checking codes in ${dirPath}:`, err)
    }
    return null
  }

  private async consumeDisposableCode(filePath: string): Promise<void> {
    const usedDir = config.usedCodesDir
    if (!usedDir) return
    try {
      if (!fs.existsSync(usedDir)) {
        await fs.promises.mkdir(usedDir, { recursive: true }).catch(() => {})
      }
      const usedPath = path.join(usedDir, path.basename(filePath))
      await fs.promises.rename(filePath, usedPath)
    } catch (err) {
      console.error('Error moving disposable code file:', err)
    }
  }
}
