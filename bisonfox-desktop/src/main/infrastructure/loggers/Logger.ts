import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

import { config } from '@main/appConfig'

// ─── Log Levels ──────────────────────────────────────────────────────────────
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR'
}

// ─── Configuration ───────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file

function getFirstMacAddress(): string {
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

  // Instance variables to hold the validated paths
  private finalLogDir: string | null = null

  private activeStream: fs.WriteStream | null = null
  private activeFilePath: string | null = null

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel

    // ─────────────────────────────────────────────────────────────────
    // GUARD CLAUSE: Check for missing Environment Variable
    // ─────────────────────────────────────────────────────────────────
    let envLogDir = ''
    try {
      envLogDir = config.logDir
    } catch { }

    if (!envLogDir || envLogDir.trim() === '') {
      // Fail-fast for file logging, but don't crash the app.
      process.stderr.write(
        '\n[SYSTEM WARNING] LOG_DIR environment variable is missing or empty!\n'
      )
      process.stderr.write(
        '[SYSTEM WARNING] File logging is disabled. Logs will only appear in this console.\n\n'
      )
      this.finalLogDir = null
    } else {
      const macFolder = getFirstMacAddress()
      this.finalLogDir = path.resolve(envLogDir, macFolder)

      this.ensureDirs()
    }
  }

  // ── Public API ──

  debug(context: string, message: string, meta?: Record<string, unknown>): void {
    this.write(LogLevel.DEBUG, context, message, meta)
  }

  info(context: string, message: string, meta?: Record<string, unknown>): void {
    this.write(LogLevel.INFO, context, message, meta)
  }

  warn(context: string, message: string, meta?: Record<string, unknown>): void {
    this.write(LogLevel.WARN, context, message, meta)
  }

  error(context: string, message: string, meta?: Record<string, unknown>): void {
    this.write(LogLevel.ERROR, context, message, meta)
  }

  // ── Internal ──

  private ensureDirs(): void {
    if (this.finalLogDir && !fs.existsSync(this.finalLogDir)) {
      fs.mkdirSync(this.finalLogDir, { recursive: true })
    }
  }

  private closeAndRotateFile(): void {
    if (!this.activeStream) return

    const streamToClose = this.activeStream
    this.activeStream = null
    this.activeFilePath = null

    streamToClose.end()
  }

  private isFlushed = false

  private getStream(): fs.WriteStream | null {
    if (!this.finalLogDir || this.isFlushed) return null

    // Check size limit on the active file
    if (this.activeFilePath && fs.existsSync(this.activeFilePath)) {
      try {
        const stat = fs.statSync(this.activeFilePath)
        if (stat.size >= MAX_FILE_SIZE) {
          // If the file is too big, close it and open a new one
          this.closeAndRotateFile()
        }
      } catch (e) {
        // Ignore stats error
      }
    }

    if (this.activeStream) {
      return this.activeStream
    }

    // Create new stream directly in the final network dir
    const timestamp = Date.now()
    const fileName = `app_log_${timestamp}.log`
    this.activeFilePath = path.join(this.finalLogDir, fileName)

    this.activeStream = fs.createWriteStream(this.activeFilePath, { flags: 'a', encoding: 'utf-8' })
    return this.activeStream
  }

  private write(
    level: LogLevel,
    context: string,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    if (level < this.minLevel) return

    const timestamp = new Date().toISOString()
    const label = LEVEL_LABELS[level]
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : ''
    const line = `[${timestamp}] [${label}] [${context}] ${message}${metaStr}\n`

    // 1. Try to write to file if configured and not flushed
    if (this.finalLogDir && !this.isFlushed) {
      const stream = this.getStream()
      if (stream) stream.write(line)
    }

    // 2. Always output to console if file logging is dead, flushed, OR if it's an Error/Warn
    if (!this.finalLogDir || this.isFlushed || level === LogLevel.ERROR || level === LogLevel.WARN) {
      process.stderr.write(line)
    }
  }

  /** Flush all streams (call on shutdown) */
  async flush(): Promise<void> {
    this.isFlushed = true
    if (this.activeStream) {
      const streamToClose = this.activeStream
      this.activeStream = null
      this.activeFilePath = null

      return new Promise((resolve) => {
        streamToClose.end(() => {
          resolve()
        })
      })
    }
  }
}

// Singleton export
export const logger = new Logger(LogLevel.DEBUG)
