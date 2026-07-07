import { sessionSingleton } from './UploadSession'
import { IFileService } from '@main/domain/interfaces/IFileService'
import { IEventNotifier } from '@main/domain/interfaces/IEventNotifier'
import { logger } from '@main/infrastructure/loggers/Logger'
import { UploadValidator } from './UploadValidator'
import { UploadProgressHandler } from './UploadProgressHandler'

export class UploadManager {
  private activeUploads: Map<string, AbortController> = new Map()
  private sessionSingletonInstance = sessionSingleton.getInstance()
  private validator = new UploadValidator()

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
  }

  public cancelAllUploads(): void {
    if (this.activeUploads.size === 0) return

    logger.info(
      'UploadManager',
      `Graceful shutdown: Aborting ${this.activeUploads.size} active upload(s)...`
    )

    for (const [sessionId, controller] of this.activeUploads.entries()) {
      controller.abort()

      this.sessionSingletonInstance.update(sessionId, { status: 'cancelled' })
    }

    this.activeUploads.clear()
    logger.info('UploadManager', 'All uploads successfully aborted.')
  }

  public async startUpload(sessionId: string, body: any): Promise<void> {
    const oldController = this.activeUploads.get(sessionId)
    if (oldController) {
      logger.info('UploadManager', `Aborting previous upload attempt for session ${sessionId}`)
      oldController.abort()
      this.activeUploads.delete(sessionId)
    }

    const session = this.sessionSingletonInstance.get(sessionId)
    if (!session) return

    const validationResult = this.validator.validate(session, body)

    if (!validationResult.valid) {
      this.sessionSingletonInstance.update(session.id, { status: 'error' })
      this.notifier.notifyProgress(session.id, {
        type: 'error',
        message: validationResult.message
      })
      return
    }

    const { stagingDest, finalDest, filesToUpload, allExcluded, basePath } = validationResult.data

    const controller = new AbortController()
    this.activeUploads.set(session.id, controller)

    this.sessionSingletonInstance.update(session.id, {
      destination: finalDest,
      status: 'uploading',
      progress: {}
    })

    const progressHandler = new UploadProgressHandler(
      session.id,
      this.notifier,
      this.sessionSingletonInstance
    )

    try {
      const summary = await this.fileService.copyFiles(filesToUpload, stagingDest, {
        basePath,
        finalDest,
        excludedFiles: allExcluded,
        expectedTotal: body.expectedTotal,
        expectedTotalBytes: body.expectedTotalBytes,
        signal: controller.signal,
        onScan: progressHandler.onScan,
        onProgress: progressHandler.onProgress
      })

      this.activeUploads.delete(session.id)

      await this.fileService.deleteDir(stagingDest).catch(() => {})

      progressHandler.notifyDone(summary)
    } catch (err: any) {
      this.activeUploads.delete(session.id)

      await this.fileService.deleteDir(stagingDest).catch(() => {})

      if (err.message && err.message.includes('Aborted')) {
        logger.info('UploadManager', 'Upload aborted successfully. Staging folder cleaned up.')
      } else {
        logger.error('UploadManager', 'Upload failed', { error: err.message })
        progressHandler.onError(err.message)
      }
    }
  }
}
