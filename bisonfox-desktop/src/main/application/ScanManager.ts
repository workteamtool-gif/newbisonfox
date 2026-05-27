// src/application/ScanManager.ts
import { logger } from '@main/infrastructure/loggers/Logger'

interface ScanSession {
  selectedPaths: string[]
  excludedPaths: string[]
  timeout: NodeJS.Timeout
}

class ScanManager {
  private sessions = new Map<string, ScanSession>()

  public createSession(selectedPaths: string[], excludedPaths: string[]): string {
    const scanId = Math.random().toString(36).substring(2, 10)

    // Auto-delete the session if the frontend doesn't connect within 30 seconds (Prevents Memory Leaks)
    const timeout = setTimeout(() => {
      this.sessions.delete(scanId)
      logger.warn('ScanManager', `Scan session ${scanId} timed out before connection.`)
    }, 30000)

    this.sessions.set(scanId, { selectedPaths, excludedPaths, timeout })
    return scanId
  }

  public consumeSession(scanId: string): ScanSession | null {
    const session = this.sessions.get(scanId)
    if (!session) return null

    // Clear the timeout and delete from RAM since it is now being used
    clearTimeout(session.timeout)
    this.sessions.delete(scanId)

    return session
  }
}

export const scanManager = new ScanManager()
