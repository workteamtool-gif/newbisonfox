import fs from 'fs'
import path from 'path'
import { logger, getFirstMacAddress } from '@main/infrastructure/loggers/Logger'

import { config } from '@main/appConfig'

function resolveMailDir(): string | null {
  let envPath = ''
  try {
    envPath = config.mailDir
  } catch {}
  if (!envPath || envPath.trim() === '') {
    logger.warn('MailLogger', 'MAIL_LOG_DIR is not configured')
    return null
  }
  return path.resolve(envPath)
}

function ensureMailDir(dir: string): void {
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
  failedFilesAmount: number,
  interfaceName: string
): void {
  const dir = resolveMailDir()
  if (!dir) return

  ensureMailDir(dir)

  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    username,
    subfolder,
    succeededFilesAmount,
    totalFilesAmount,
    failedFilesAmount,
    interfaceName
  }

  const retries = config.failRetries
  const delayMs = config.failIntervalMs

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs * attempt)
      }
      const filePath = getMailLogFilePath(dir, timestamp)
      fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8')
      if (attempt > 0) {
        logger.warn('MailLogger', `Mail log written after ${attempt + 1} attempts`, entry)
      } else {
        logger.info('MailLogger', 'Mail log written', entry)
      }
      return
    } catch (err: unknown) {
      if (attempt === retries - 1) {
        logger.warn('MailLogger', `Failed to write mail log after ${retries} retries`, {
          error: (err as Error).message
        })
      }
    }
  }
}
