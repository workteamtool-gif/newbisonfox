import fs from 'fs'
import path from 'path'
import { logger } from './Logger'

function resolveMailLogDir(): string | null {
  const envPath = process.env.MAIL_LOG_DIR
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

function getMailLogFilePath(dir: string): string {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return path.join(dir, `mail-log-${dateStamp}.log`)
}

export function logMail(userName: string): void {
  const dir = resolveMailLogDir()
  if (!dir) return

  ensureMailLogDir(dir)

  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    userName
  }

  try {
    const filePath = getMailLogFilePath(dir)
    const line = `${timestamp} | ${JSON.stringify(entry)}\n`
    fs.appendFileSync(filePath, line, 'utf-8')
    logger.info('MailLogger', 'Mail log written', entry)
  } catch (err) {
    logger.warn('MailLogger', 'Failed to write mail log', { error: (err as Error).message })
  }
}
