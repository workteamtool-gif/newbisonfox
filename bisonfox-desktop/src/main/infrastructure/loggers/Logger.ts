import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

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
const MAX_FILES_PER_LEVEL = 5 // Keep up to 5 rotated files

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
  private currentDate = ''
  private streams = new Map<string, fs.WriteStream>()

  // Instance variable to hold the validated path
  private logDir: string | null = null

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel

    // ─────────────────────────────────────────────────────────────────
    // GUARD CLAUSE: Check for missing Environment Variable
    // ─────────────────────────────────────────────────────────────────
    const envLogDir = process.env.LOG_DIR

    if (!envLogDir || envLogDir.trim() === '') {
      // Fail-fast for file logging, but don't crash the app.
      process.stderr.write('\n[SYSTEM WARNING] LOG_DIR environment variable is missing or empty!\n')
      process.stderr.write(
        '[SYSTEM WARNING] File logging is disabled. Logs will only appear in this console.\n\n'
      )
      this.logDir = null
    } else {
      const macFolder = getFirstMacAddress()
      this.logDir = path.resolve(envLogDir, macFolder)
      this.ensureLogDir()
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

  private ensureLogDir(): void {
    if (!this.logDir) return // Guard against null
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getDateStamp(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  private getStream(dateStamp: string): fs.WriteStream | null {
    if (!this.logDir) return null // Guard against null

    const key = dateStamp

    // Rotate day boundary: close old streams
    if (this.currentDate && this.currentDate !== dateStamp) {
      for (const [, s] of this.streams) {
        try {
          s.end()
        } catch {
          /* ignore */
        }
      }
      this.streams.clear()
    }
    this.currentDate = dateStamp

    if (this.streams.has(key)) {
      return this.streams.get(key)!
    }

    const filePath = path.join(this.logDir, `${dateStamp}.log`)
    this.rotateIfNeeded(filePath, dateStamp)

    const stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf-8' })
    this.streams.set(key, stream)
    return stream
  }

  private rotateIfNeeded(filePath: string, dateStamp: string): void {
    if (!this.logDir) return // Guard against null

    try {
      if (!fs.existsSync(filePath)) return
      const stat = fs.statSync(filePath)
      if (stat.size < MAX_FILE_SIZE) return

      // Rotate: shift existing rotated files
      for (let i = MAX_FILES_PER_LEVEL - 1; i >= 1; i--) {
        const older = path.join(this.logDir, `${dateStamp}.${i}.log`)
        const newer = path.join(this.logDir, `${dateStamp}.${i + 1}.log`)
        if (fs.existsSync(older)) {
          if (i + 1 >= MAX_FILES_PER_LEVEL) {
            fs.unlinkSync(older) // drop oldest
          } else {
            fs.renameSync(older, newer)
          }
        }
      }

      // Move current → .1
      const rotated = path.join(this.logDir, `${dateStamp}.1.log`)
      fs.renameSync(filePath, rotated)

      // Close and remove old stream
      const key = dateStamp
      const existing = this.streams.get(key)
      if (existing) {
        try {
          existing.end()
        } catch {
          /* ignore */
        }
        this.streams.delete(key)
      }
    } catch {
      // If rotation fails, continue writing to the same file
    }
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

    // 1. Try to write to file if configured
    if (this.logDir) {
      const dateStamp = this.getDateStamp()
      const stream = this.getStream(dateStamp)
      if (stream) stream.write(line)
    }

    // 2. Always output to console if file logging is dead, OR if it's an Error/Warn
    if (!this.logDir || level === LogLevel.ERROR || level === LogLevel.WARN) {
      process.stderr.write(line)
    }
  }

  /** Flush all streams (call on shutdown) */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const [, s] of this.streams) {
      promises.push(new Promise((resolve) => s.end(resolve)))
    }
    await Promise.all(promises)
  }
}

// Singleton export
export const logger = new Logger(LogLevel.DEBUG)
