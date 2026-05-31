import { v4 as uuidv4 } from 'uuid'
import { logger } from '@main/infrastructure/loggers/Logger'
import type { UploadSession } from '../domain/entities/UploadSession'


export class sessionSingleton {
  private static instance: sessionSingleton

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

}
