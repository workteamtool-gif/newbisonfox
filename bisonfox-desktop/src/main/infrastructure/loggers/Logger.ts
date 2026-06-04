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
const ROTATION_INTERVAL_MS = 60 * 1000 // 1 minute

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
  private tempLogDir: string | null = null

  private activeStream: fs.WriteStream | null = null
  private activeFilePath: string | null = null

  private rotationTimer: NodeJS.Timeout | null = null

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel

    // ─────────────────────────────────────────────────────────────────
    // GUARD CLAUSE: Check for missing Environment Variable
    // ─────────────────────────────────────────────────────────────────
    let envLogDir = ''
    let envTempLogDir = ''
    try {
      envLogDir = config.logDir
      envTempLogDir = config.tempLogDir
    } catch {}

    if (!envLogDir || envLogDir.trim() === '' || !envTempLogDir || envTempLogDir.trim() === '') {
      // Fail-fast for file logging, but don't crash the app.
      process.stderr.write(
        '\n[SYSTEM WARNING] LOG_DIR or TEMP_LOG_DIR environment variable is missing or empty!\n'
      )
      process.stderr.write(
        '[SYSTEM WARNING] File logging is disabled. Logs will only appear in this console.\n\n'
      )
      this.finalLogDir = null
      this.tempLogDir = null
    } else {
      const macFolder = getFirstMacAddress()
      this.finalLogDir = path.resolve(envLogDir, macFolder)
      this.tempLogDir = path.resolve(envTempLogDir, macFolder)

      this.ensureDirs()
      this.startRotationTimer()
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
    if (this.tempLogDir && !fs.existsSync(this.tempLogDir)) {
      fs.mkdirSync(this.tempLogDir, { recursive: true })
    }
  }

  private startRotationTimer(): void {
    if (this.rotationTimer) clearInterval(this.rotationTimer)
    this.rotationTimer = setInterval(() => {
      this.rotateAndMoveFile()
    }, ROTATION_INTERVAL_MS)
  }

  private rotateAndMoveFile(): void {
    if (!this.activeStream || !this.activeFilePath || !this.finalLogDir) return

    const streamToClose = this.activeStream
    const filePathToMove = this.activeFilePath

    // Reset active stream so next write creates a new file
    this.activeStream = null
    this.activeFilePath = null

    streamToClose.end(() => {
      try {
        if (fs.existsSync(filePathToMove)) {
          const fileName = path.basename(filePathToMove)
          const finalPath = path.join(this.finalLogDir!, fileName)
          // Safely move the file
          fs.copyFileSync(filePathToMove, finalPath)
          fs.unlinkSync(filePathToMove)
        }
      } catch (err) {
        process.stderr.write(
          `[SYSTEM ERROR] Failed to move log file from temp to final dir: ${err}\n`
        )
      }
    })
  }

  private getStream(): fs.WriteStream | null {
    if (!this.tempLogDir || !this.finalLogDir) return null

    // Check size limit on the active file
    if (this.activeFilePath && fs.existsSync(this.activeFilePath)) {
      try {
        const stat = fs.statSync(this.activeFilePath)
        if (stat.size >= MAX_FILE_SIZE) {
          // If the file is too big, move it immediately and open a new one
          this.rotateAndMoveFile()
        }
      } catch (e) {
        // Ignore stats error
      }
    }

    if (this.activeStream) {
      return this.activeStream
    }

    // Create new stream
    const timestamp = Date.now()
    const fileName = `app_log_${timestamp}.log`
    this.activeFilePath = path.join(this.tempLogDir, fileName)

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

    // 1. Try to write to file if configured
    if (this.tempLogDir) {
      const stream = this.getStream()
      if (stream) stream.write(line)
    }

    // 2. Always output to console if file logging is dead, OR if it's an Error/Warn
    if (!this.tempLogDir || level === LogLevel.ERROR || level === LogLevel.WARN) {
      process.stderr.write(line)
    }
  }

  /** Flush all streams (call on shutdown) */
  async flush(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
    }

    if (this.activeStream && this.activeFilePath && this.finalLogDir) {
      const streamToClose = this.activeStream
      const filePathToMove = this.activeFilePath

      this.activeStream = null
      this.activeFilePath = null

      return new Promise((resolve) => {
        streamToClose.end(() => {
          try {
            if (fs.existsSync(filePathToMove)) {
              const fileName = path.basename(filePathToMove)
              const finalPath = path.join(this.finalLogDir!, fileName)
              fs.copyFileSync(filePathToMove, finalPath)
              fs.unlinkSync(filePathToMove)
            }
          } catch (e) {
            // ignore flush errors
          }
          resolve()
        })
      })
    }
  }
}

// Singleton export
export const logger = new Logger(LogLevel.DEBUG)
