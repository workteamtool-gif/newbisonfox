import { v4 as uuidv4 } from 'uuid'
import { logger } from '../infrastructure/Logger'
import { DiskSession } from '@shared/entities/DiskSession'

export interface UploadSession {
  id: string
  userName: string
  diskSessions: DiskSession[]
  destination: string
  progress: Record<string, number>
  status: 'pending' | 'uploading' | 'complete' | 'cancelled' | 'error'
  completedCount: number
  failedCount: number
  failedFiles: { path: string; reason: string }[]
  totalCount: number
  createdAt: Date
  lastUpdate: Date
}

export class sessionSingleton {
  private static instance: sessionSingleton

  // THE FIX: Hold exactly ONE session in memory. No Map needed.
  private activeSession: UploadSession | null = null

  static getInstance(): sessionSingleton {
    if (!sessionSingleton.instance) {
      sessionSingleton.instance = new sessionSingleton()
    }
    return sessionSingleton.instance
  }

  create(userName: string): UploadSession {
    // Safety check: Log if they are abandoning a session that was actively uploading
    if (this.activeSession && this.activeSession.status === 'uploading') {
      logger.warn(
        'sessionSingleton',
        'A new session was created while an upload was still in progress. Overwriting.'
      )
    }

    const now = new Date()

    // Instantly overwrites the old session, freeing up RAM
    this.activeSession = {
      id: uuidv4(),
      userName,
      diskSessions: [],
      destination: '',
      progress: {},
      status: 'pending',
      completedCount: 0,
      failedCount: 0,
      failedFiles: [],
      totalCount: 0,
      createdAt: now,
      lastUpdate: now
    }

    return this.activeSession
  }

  get(id: string): UploadSession | undefined {
    // Only return the session if the frontend's ID matches our single active ID.
    // This prevents "ghost" browser tabs from interacting with old sessions.
    if (this.activeSession && this.activeSession.id === id) {
      return this.activeSession
    }
    return undefined
  }

  update(id: string, partial: Partial<UploadSession>): void {
    if (this.activeSession && this.activeSession.id === id) {
      Object.assign(this.activeSession, { ...partial, lastUpdate: new Date() })
    }
  }

  delete(id: string): void {
    if (this.activeSession && this.activeSession.id === id) {
      this.activeSession = null
    }
  }

  // Bonus utility: Good for testing or forced resets
  clear(): void {
    this.activeSession = null
  }
}

// BEST PRACTICE: Export the singleton instance directly.
// This way, other files just do: `import { sessionSingletonsessionSingleton } from './UploadSession';`
export const sessionSingletonsessionSingleton = sessionSingleton.getInstance()
