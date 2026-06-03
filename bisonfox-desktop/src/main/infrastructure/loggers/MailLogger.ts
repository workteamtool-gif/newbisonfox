import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@main/infrastructure/loggers/Logger'

import { config } from '@main/appConfig'

function resolveMailLogDir(): string | null {
  let envPath = ''
  try {
    envPath = config.mailLogDir
  } catch {
  }
  if (!envPath || envPath.trim() === '') {
    logger.warn('MailLogger', 'MAIL_LOG_DIR is not configured')
    return null
  }
  return path.resolve(envPath)
}

function ensureMailLogDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getMailLogFilePath(dir: string, timestamp: string): string {
  const safeTimestamp = timestamp.replace(/:/g, '-').replace(/\./g, '-')
  return path.join(dir, `mail-log-${safeTimestamp}-${uuidv4()}.json`)
}

export function logMail(
  userName: string,
  subfolder: string,
  filesSucceeded: number,
  totalFiles: number,
  failedFilesAmount: number
): void {
  const dir = resolveMailLogDir()
  if (!dir) return

  ensureMailLogDir(dir)

  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    userName,
    subfolder,
    filesSucceeded,
    totalFiles,
    failedFilesAmount
  }

  try {
    const filePath = getMailLogFilePath(dir, timestamp)
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8')
    logger.info('MailLogger', 'Mail log written', entry)
  } catch (err) {
    logger.warn('MailLogger', 'Failed to write mail log', { error: (err as Error).message })
  }
}
