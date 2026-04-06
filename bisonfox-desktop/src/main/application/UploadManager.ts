import path from 'path'
import { sessionSingleton } from './UploadSession'
import { IFileService } from '@main/domain/interfaces/IFileService'
import { IEventNotifier } from '@main/domain/interfaces/IEventNotifier'
import { logger } from '@main/infrastructure/Logger'

export class UploadManager {
  private activeUploads: Map<string, AbortController> = new Map()
  private sessionSingletonInstance = sessionSingleton.getInstance()

  constructor(
    private fileService: IFileService,
    private notifier: IEventNotifier
  ) {}

  public cancelUpload(sessionId: string): void {
    const controller = this.activeUploads.get(sessionId)

    if (controller) {
      controller.abort()
      this.activeUploads.delete(sessionId)
      logger.info('UploadManager', `Upload cancelled for session ${sessionId}`)
    }

    this.sessionSingletonInstance.update(sessionId, { status: 'cancelled' })
    this.notifier.notifyProgress(sessionId, { type: 'error', message: 'Upload cancelled by user.' })
  }

  // --- NEW: GRACEFUL SHUTDOWN HANDLER ---
  public cancelAllUploads(): void {
    if (this.activeUploads.size === 0) return

    logger.info(
      'UploadManager',
      `Graceful shutdown: Aborting ${this.activeUploads.size} active upload(s)...`
    )

    for (const [sessionId, controller] of this.activeUploads.entries()) {
      // 1. Instantly kill the C++ thread pool workers
      controller.abort()

      // 2. Mark as cancelled in the internal database
      this.sessionSingletonInstance.update(sessionId, { status: 'cancelled' })

      // 3. Notify the React frontend
      this.notifier.notifyProgress(sessionId, {
        type: 'error',
        message: 'Upload aborted: Application is shutting down.'
      })
    }

    // 4. Clear memory
    this.activeUploads.clear()
    logger.info('UploadManager', 'All uploads successfully aborted.')
  }
  // --------------------------------------

  public async startUpload(sessionId: string, body: any): Promise<void> {
    // Abort any previous active upload for this session (e.g. during retry)
    const oldController = this.activeUploads.get(sessionId)
    if (oldController) {
      logger.info('UploadManager', `Aborting previous upload attempt for session ${sessionId}`)
      oldController.abort()
      this.activeUploads.delete(sessionId)
    }

    const session = this.sessionSingletonInstance.get(sessionId)
    if (!session) return

    const { files, subfolder, expectedTotal } = body

    const rawBaseDir = process.env.UPLOAD_BASE_DIR
    if (!rawBaseDir || rawBaseDir.trim() === '') {
      const errorMsg =
        'System Configuration Error: The destination directory is not configured. We cannot copy files at this time.'

      logger.error(
        'UploadManager',
        'Upload aborted: UPLOAD_BASE_DIR is missing or empty in the .env file.'
      )

      this.sessionSingletonInstance.update(session.id, { status: 'error' })
      this.notifier.notifyProgress(session.id, { type: 'error', message: errorMsg })

      return
    }

    const baseDir = path.resolve(rawBaseDir || '')
    const targetDest = path.resolve(baseDir, session.userName, subfolder || '')

    // SECURITY: Case-insensitive Path Traversal Check for Network Drives
    if (!targetDest.toLowerCase().startsWith(baseDir.toLowerCase())) {
      this.sessionSingletonInstance.update(session.id, { status: 'error' })
      this.notifier.notifyProgress(session.id, {
        type: 'error',
        message: 'Security Error: Invalid target destination.'
      })

      logger.error('UploadManager', 'SECURITY: Path traversal attempt blocked!', {
        sessionId: session.id,
        user: session.userName,
        attemptedPath: targetDest
      })
      return
    }

    const filesToUpload = files ?? session.diskSessions.flatMap((d) => d.selectedFiles)
    const allExcluded = session.diskSessions.flatMap((d) => d.excludedFiles ?? [])

    if (!filesToUpload || filesToUpload.length === 0) {
      this.sessionSingletonInstance.update(session.id, { status: 'error' })
      this.notifier.notifyProgress(session.id, {
        type: 'error',
        message: 'No files selected for upload.'
      })
      return
    }

    const controller = new AbortController()
    this.activeUploads.set(session.id, controller)

    this.sessionSingletonInstance.update(session.id, {
      destination: targetDest,
      status: 'uploading',
      progress: {}
    })

    let basePath: string | undefined
    const firstFile = filesToUpload[0]
    if (firstFile && firstFile.includes(':')) {
      const driveMatch = firstFile.match(/^[a-zA-Z]:\\/)
      if (driveMatch) basePath = driveMatch[0]
    }

    let lastSessionWrite = 0
    const SESSION_WRITE_INTERVAL = 500

    try {
      await this.fileService.copyFiles(filesToUpload, targetDest, {
        basePath,
        excludedFiles: allExcluded,
        expectedTotal,
        signal: controller.signal, // Connects the scanner and 64 workers to this controller
        onScan: (count) => {
          this.notifier.notifyProgress(session.id, { type: 'discovery', count })
        },
        onProgress: (file, percent, completed, failedCount, failedFiles, total) => {
          if (file === '__done__') {
            this.sessionSingletonInstance.update(session.id, {
              completedCount: completed,
              failedCount: failedCount,
              failedFiles: failedFiles,
              totalCount: total,
              status: 'complete'
            })

            this.notifier.notifyProgress(session.id, {
              type: 'done',
              completed,
              failed: failedCount,
              failedFiles,
              total
            })
            this.activeUploads.delete(session.id)
            return
          }

          const current = this.sessionSingletonInstance.get(session.id)
          if (current) {
            if (percent === -1 || percent === 100) {
              current.progress[file] = percent
            }

            const now = Date.now()
            if (now - lastSessionWrite > SESSION_WRITE_INTERVAL) {
              lastSessionWrite = now
              this.sessionSingletonInstance.update(session.id, {
                progress: current.progress,
                completedCount: completed,
                failedCount: failedCount,
                failedFiles: failedFiles,
                totalCount: total
              })
            }
            this.notifier.notifyProgress(session.id, {
              type: 'progress',
              file,
              percent,
              completed,
              failed: failedCount,
              total
            })
          }
        }
      })
    } catch (err: any) {
      logger.error('UploadManager', 'Upload failed', { error: err.message })
      this.sessionSingletonInstance.update(session.id, { status: 'error' })
      this.notifier.notifyProgress(session.id, { type: 'error', message: err.message })
      this.activeUploads.delete(session.id)
    }
  }
}
