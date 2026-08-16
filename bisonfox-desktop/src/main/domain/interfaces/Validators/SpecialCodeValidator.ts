import fs from 'original-fs'
import path from 'path'
import { sessionSingleton } from "@main/application/UploadSession"
import { config } from "@main/appConfig"

const sessionSingletonInstance = sessionSingleton.getInstance()

/**
 * Searches a directory for a file whose text content matches the given code.
 * @returns The absolute path to the matching file, or null if not found.
 */
async function findCodeInDir(dirPath: string, code: string): Promise<string | null> {
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

/**
 * Moves a disposable code file to the 'used' directory, preventing future reuse.
 */
async function consumeDisposableCode(filePath: string): Promise<void> {
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

export type CodeValidationResult =
  | { valid: true }
  | { valid: false; message: string }

/**
 * Validates a special access code by scanning the configured code directories.
 * - Reusable codes: valid indefinitely, file is not moved.
 * - Disposable codes: valid once, file is moved to the 'used' directory after match.
 * If valid, marks the session as restricted (uploads to the restricted destination).
 */
export async function validateSpecialCode(
  sessionId: string,
  code: string
): Promise<CodeValidationResult> {
  if (!code || code.trim() === '') return { valid: true }

  const trimmedCode = code.trim()

  // 1. Reusable code — permanent access
  const reusableMatch = await findCodeInDir(config.reusableCodesDir, trimmedCode)
  if (reusableMatch) {
    sessionSingletonInstance.update(sessionId, { isRestricted: true })
    return { valid: true }
  }

  // 2. Disposable code — one-time access
  const disposableMatch = await findCodeInDir(config.disposableCodesDir, trimmedCode)
  if (disposableMatch) {
    await consumeDisposableCode(disposableMatch)
    sessionSingletonInstance.update(sessionId, { isRestricted: true })
    return { valid: true }
  }

  return { valid: false, message: 'קוד שגוי או שכבר נעשה בו שימוש' }
}
