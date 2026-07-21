import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as winston from 'winston'

import { config } from '@main/appConfig'

// ─── Log Levels ──────────────────────────────────────────────────────────────
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// ─── Configuration ───────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file

export function getFirstMacAddress(): string {
  const interfaces = os.networkInterfaces()
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.mac && entry.mac !== '00:00:00:00:00:00' && !entry.internal) {
        return entry.mac.replace(/:/g, '-')
      }
    }
  }
  return 'unknown_mac'
}

function safeMoveFileSync(src: string, dest: string, retries = 25, delayMs = 200): void {
  for (let i = 0; i <= retries; i++) {
    try {
      // Prefer atomic rename; fall back to copy+delete only on cross-device (EXDEV)
      try {
        fs.renameSync(src, dest)
      } catch (renameErr: unknown) {
        if ((renameErr as NodeJS.ErrnoException).code !== 'EXDEV') throw renameErr
        fs.copyFileSync(src, dest)
        fs.unlinkSync(src)
      }
      return
    } catch (err: unknown) {
      if (i === retries) throw err
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
      } else {
        throw err
      }
    }
  }
}

async function safeMoveFile(src: string, dest: string): Promise<void> {
  const retries = config.moveRetries
  const delayMs = config.failIntervalMs

  let lastError: string | undefined
  let moveAttempt = 0

  while (moveAttempt < retries) {
    try {
      if (moveAttempt > 0) await new Promise<void>((res) => setTimeout(res, delayMs * moveAttempt))

      try {
        await fs.promises.rename(src, dest)
      } catch (renameErr: unknown) {
        if ((renameErr as NodeJS.ErrnoException).code !== 'EXDEV') throw renameErr
        await fs.promises.copyFile(src, dest)
        await fs.promises.unlink(src)
      }

      if (moveAttempt > 0) {
        console.warn(
          `[Logger] Log file move succeeded after ${moveAttempt + 1} attempts: ${path.basename(src)}`
        )
      }
      return
    } catch (err: unknown) {
      lastError = (err instanceof Error ? err.message : String(err)) || 'Unknown move error'
      moveAttempt++
    }
  }

  console.error(
    `[Logger] Log file move gave up after ${retries} retries: ${path.basename(src)} -> ${path.basename(dest)}`,
    { lastError }
  )
}

// ─── Logger ──────────────────────────────────────────────────────────────────
class Logger {
  private minLevel: LogLevel
  private winstonLogger: winston.Logger
  private stagingLogDir: string | null = null
  private finalLogDir: string | null = null

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel

    let envLogDir = ''
    let tempBaseDir = ''
    try {
      envLogDir = config.logDir
      tempBaseDir = config.tempBaseDir
    } catch {}

    if (!envLogDir || envLogDir.trim() === '' || !tempBaseDir || tempBaseDir.trim() === '') {
      process.stderr.write('\n[SYSTEM WARNING] logDir or tempBaseDir is missing or empty!\n')
      process.stderr.write(
        '[SYSTEM WARNING] File logging is disabled. Logs will only appear in this console.\n\n'
      )
    } else {
      const macFolder = getFirstMacAddress()
      this.finalLogDir = path.resolve(envLogDir, macFolder)
      this.stagingLogDir = path.resolve(tempBaseDir, 'app_logs_staging', macFolder)

      if (!fs.existsSync(this.finalLogDir)) fs.mkdirSync(this.finalLogDir, { recursive: true })
      if (!fs.existsSync(this.stagingLogDir)) fs.mkdirSync(this.stagingLogDir, { recursive: true })

      try {
        const files = fs.readdirSync(this.stagingLogDir)
        for (const file of files) {
          if (file.endsWith('.json')) {
            const src = path.join(this.stagingLogDir, file)
            const dest = path.join(this.finalLogDir, file)
            safeMoveFileSync(src, dest)
          }
        }
      } catch (err) {}
    }

    const transports: winston.transport[] = []

    transports.push(
      new winston.transports.Console({
        level: this.stagingLogDir ? 'warn' : this.getWinstonLevel(minLevel),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : ''
            return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`
          })
        )
      })
    )

    if (this.stagingLogDir) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')
      const fileName = `${timestamp}.json`

      transports.push(
        new winston.transports.File({
          filename: path.join(this.stagingLogDir, fileName),
          maxsize: MAX_FILE_SIZE,
          level: this.getWinstonLevel(minLevel),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, context, message, ...meta }) => {
              return JSON.stringify({
                timestamp,
                level,
                context,
                message,
                ...meta
              })
            })
          )
        })
      )
    }

    this.winstonLogger = winston.createLogger({
      transports
    })
  }

  private getWinstonLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug'
      case LogLevel.INFO:
        return 'info'
      case LogLevel.WARN:
        return 'warn'
      case LogLevel.ERROR:
        return 'error'
      default:
        return 'debug'
    }
  }

  debug(context: string, message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      this.winstonLogger.debug(message, { context, ...meta })
    }
  }

  info(context: string, message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.INFO) {
      this.winstonLogger.info(message, { context, ...meta })
    }
  }

  warn(context: string, message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.WARN) {
      this.winstonLogger.warn(message, { context, ...meta })
    }
  }

  error(context: string, message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.ERROR) {
      this.winstonLogger.error(message, { context, ...meta })
    }
  }

  async flush(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.winstonLogger.once('finish', resolve)
      this.winstonLogger.end()
    })

    const fileTransportDrains = this.winstonLogger.transports
      .filter(
        (t): t is winston.transports.FileTransportInstance => t instanceof winston.transports.File
      )
      .map((t) => {
        const stream: NodeJS.WritableStream | undefined = (t as any)._stream
        if (!stream || (stream as any).writableEnded) return Promise.resolve()
        return new Promise<void>((resolve) => {
          stream.once('finish', resolve)
          stream.once('close', resolve)
        })
      })

    await Promise.all(fileTransportDrains)
  }

  /** Move all logs from the staging directory to the final log directory */
  async moveToFinal(): Promise<void> {
    if (!this.stagingLogDir || !this.finalLogDir) return

    try {
      const files = await fs.promises.readdir(this.stagingLogDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const src = path.join(this.stagingLogDir, file)
          const dest = path.join(this.finalLogDir, file)
          await safeMoveFile(src, dest)
        }
      }
    } catch (err) {
      console.error('Logger error: Failed to move logs to final directory', err)
    }
  }
}

export const logger = new Logger(LogLevel.DEBUG)
