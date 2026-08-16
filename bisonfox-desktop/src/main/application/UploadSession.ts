import { v4 as uuidv4 } from 'uuid'
import { logger } from '@main/infrastructure/loggers/Logger'
import type { UploadSession } from '../domain/entities/UploadSession'

export class SessionSingleton {
  private static instance: SessionSingleton

  private activeSession: UploadSession | null = null

  static getInstance(): SessionSingleton {
    if (!SessionSingleton.instance) {
      SessionSingleton.instance = new SessionSingleton()
    }

    return SessionSingleton.instance
  }

  create(username: string): UploadSession {
    if (this.activeSession && this.activeSession.status === 'uploading') {
      logger.warn(
        'SessionSingleton',
        'A new session was created while an upload was still in progress. Overwriting.'
      )
    }

    const now = new Date()

    // Instantly overwrites the old session, freeing up RAM
    this.activeSession = {
      id: uuidv4(),
      username,
      diskSessions: [],
      destination: '',
      progress: {},
      status: 'pending',
      completedCount: 0,
      failedCount: 0,
      failedFiles: [],
      totalCount: 0,
      isRestricted: false,
      createdAt: now,
      lastUpdate: now
    }

    return this.activeSession
  }

  get(id: string): UploadSession | undefined {
    if (this.activeSession && this.activeSession.id === id) {
      return this.activeSession
    }

    logger.warn('SessionSingleton', 'Attempted to get session with invalid ID', {
      requestedId: id,
      activeId: this.activeSession?.id
    })
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
