import fs from 'fs'
import path from 'path'
import { logger, getFirstMacAddress } from '@main/infrastructure/loggers/Logger'

import { config } from '@main/appConfig'

function resolveMailLogDir(): string | null {
  let envPath = ''
  try {
    envPath = config.mailLogDir
  } catch {}
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
  return path.join(dir, `${safeTimestamp}-${getFirstMacAddress()}.json`)
}

export function logMail(
  username: string,
  subfolder: string,
  succeededFilesAmount: number,
  totalFilesAmount: number,
  failedFilesAmount: number
): void {
  const dir = resolveMailLogDir()
  if (!dir) return

  ensureMailLogDir(dir)

  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    username,
    subfolder,
    succeededFilesAmount,
    totalFilesAmount,
    failedFilesAmount
  }

  const retries = config.failRetries
  const delayMs = config.failIntervalMs

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs * attempt)
      }
      const filePath = getMailLogFilePath(dir, timestamp)
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8')
      if (attempt > 0) {
        logger.warn('MailLogger', `Mail log written after ${attempt + 1} attempts`, entry)
      } else {
        logger.info('MailLogger', 'Mail log written', entry)
      }
      return
    } catch (err: any) {
      if (attempt === retries - 1) {
        logger.warn('MailLogger', `Failed to write mail log after ${retries} retries`, { error: (err as Error).message })
      }
    }
  }
}
