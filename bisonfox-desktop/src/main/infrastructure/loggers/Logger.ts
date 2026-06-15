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

// ─── Logger ──────────────────────────────────────────────────────────────────
class Logger {
  private minLevel: LogLevel
  private winstonLogger: winston.Logger

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel

    let envLogDir = ''
    try {
      envLogDir = config.logDir
    } catch { }

    let finalLogDir: string | null = null
    if (!envLogDir || envLogDir.trim() === '') {
      process.stderr.write(
        '\n[SYSTEM WARNING] LOG_DIR environment variable is missing or empty!\n'
      )
      process.stderr.write(
        '[SYSTEM WARNING] File logging is disabled. Logs will only appear in this console.\n\n'
      )
    } else {
      const macFolder = getFirstMacAddress()
      finalLogDir = path.resolve(envLogDir, macFolder)

      if (!fs.existsSync(finalLogDir)) {
        fs.mkdirSync(finalLogDir, { recursive: true })
      }
    }

    const transports: winston.transport[] = []

    // Always log to console. 
    // Show 'warn'/'error' when file logging is active, otherwise show all active levels.
    transports.push(
      new winston.transports.Console({
        level: finalLogDir ? 'warn' : this.getWinstonLevel(minLevel),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : ''
            return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`
          })
        )
      })
    )

    if (finalLogDir) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')
      const fileName = `${timestamp}.json`

      transports.push(
        new winston.transports.File({
          filename: path.join(finalLogDir, fileName),
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
}

// Singleton export
export const logger = new Logger(LogLevel.DEBUG)
