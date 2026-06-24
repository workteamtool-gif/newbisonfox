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

function safeMoveFileSync(src: string, dest: string, retries = 5, delayMs = 200): void {
  for (let i = 0; i <= retries; i++) {
    try {
      fs.copyFileSync(src, dest)
      fs.unlinkSync(src)
      return
    } catch (err: any) {
      if (i === retries) throw err
      if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
        const start = Date.now()
        while (Date.now() - start < delayMs) { /* sync sleep */ }
      } else {
        throw err
      }
    }
  }
}

async function safeMoveFile(src: string, dest: string, retries = 5, delayMs = 200): Promise<void> {
  for (let i = 0; i <= retries; i++) {
    try {
      await fs.promises.copyFile(src, dest)
      await fs.promises.unlink(src)
      return
    } catch (err: any) {
      if (i === retries) throw err
      if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
        await new Promise(res => setTimeout(res, delayMs))
      } else {
        throw err
      }
    }
  }
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
    } catch { }

    if (!envLogDir || envLogDir.trim() === '' || !tempBaseDir || tempBaseDir.trim() === '') {
      process.stderr.write(
        '\n[SYSTEM WARNING] logDir or tempBaseDir is missing or empty!\n'
      )
      process.stderr.write(
        '[SYSTEM WARNING] File logging is disabled. Logs will only appear in this console.\n\n'
      )
    } else {
      const macFolder = getFirstMacAddress()
      this.finalLogDir = path.resolve(envLogDir, macFolder)
      this.stagingLogDir = path.resolve(tempBaseDir, 'app_logs_staging', macFolder)

      if (!fs.existsSync(this.finalLogDir)) fs.mkdirSync(this.finalLogDir, { recursive: true })
      if (!fs.existsSync(this.stagingLogDir)) fs.mkdirSync(this.stagingLogDir, { recursive: true })

      // Proactively move any old logs from a previous crashed session to final
      try {
        const files = fs.readdirSync(this.stagingLogDir)
        for (const file of files) {
          if (file.endsWith('.json')) {
            const src = path.join(this.stagingLogDir, file)
            const dest = path.join(this.finalLogDir, file)
            safeMoveFileSync(src, dest)
          }
        }
      } catch (e) {
        // Ignore sweep errors
      }
    }

    const transports: winston.transport[] = []

    // Always log to console. 
    // Show 'warn'/'error' when file logging is active, otherwise show all active levels.
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
      case LogLevel.DEBUG: return 'debug'
      case LogLevel.INFO: return 'info'
      case LogLevel.WARN: return 'warn'
      case LogLevel.ERROR: return 'error'
      default: return 'debug'
    }
  }

  // ── Public API ──

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

  /** Flush all streams (call on shutdown) */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winstonLogger.on('finish', () => resolve())
      this.winstonLogger.end()
    })
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
    } catch (e) {
      console.error('Logger error: Failed to move logs to final directory', e)
    }
  }
}

// Singleton export
export const logger = new Logger(LogLevel.DEBUG)
