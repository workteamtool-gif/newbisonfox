import { EventNotifier } from '@main/domain/interfaces/EventNotifier'
import { sessionSingleton } from './UploadSession'
import { CopySummary } from '@main/domain/interfaces/FileService'
import { FailedFile } from '@shared/entities/FailedFile'

export class UploadProgressHandler {
  private lastSessionWrite = 0
  private readonly SESSION_WRITE_INTERVAL = 500

  constructor(
    private sessionId: string,
    private notifier: EventNotifier,
    private sessionSingletonInstance: ReturnType<typeof sessionSingleton.getInstance>
  ) {}

  public onScan = (count: number): void => {
    this.notifier.notifyProgress(this.sessionId, { type: 'discovery', count })
  }

  public onProgress = (
    file: string,
    percent: number,
    completedFiles: number,
    completedBytes: number,
    failedCount: number,
    failedFiles: FailedFile[],
    totalFilesAmount: number,
    totalBytes: number
  ): void => {
    if (file === '__done__') {
      this.handleCopyComplete(completedFiles, failedCount, failedFiles, totalFilesAmount)
      return
    }

    const current = this.sessionSingletonInstance.get(this.sessionId)
    if (current) {
      if (percent === -1 || percent === 100) {
        current.progress[file] = percent
      }

      const now = Date.now()
      if (now - this.lastSessionWrite > this.SESSION_WRITE_INTERVAL) {
        this.lastSessionWrite = now
        this.sessionSingletonInstance.update(this.sessionId, {
          progress: current.progress,
          completedCount: completedFiles,
          failedCount: failedCount,
          failedFiles: failedFiles,
          totalCount: totalFilesAmount
        })
        this.notifier.notifyProgress(this.sessionId, {
          type: 'progress',
          file,
          percent,
          completed: completedFiles,
          completedBytes: completedBytes,
          failed: failedCount,
          total: totalFilesAmount,
          totalBytes: totalBytes
        })
      }
    }
  }

  /**
   * Called by the copy engine when all workers finish.
   * Updates session state only — the done notification to the renderer
   * is deferred to UploadManager so it fires AFTER the staging move succeeds.
   */
  private handleCopyComplete(
    completedFiles: number,
    failedCount: number,
    failedFiles: FailedFile[],
    totalFilesAmount: number
  ): void {
    this.sessionSingletonInstance.update(this.sessionId, {
      completedCount: completedFiles,
      failedCount: failedCount,
      failedFiles: failedFiles,
      totalCount: totalFilesAmount,
      status: 'complete'
    })
  }

  /**
   * Sends the final 'done' event to the renderer.
   * Called by UploadManager after the staging folder has been successfully moved
   * to the final destination.
   */
  public notifyDone(summary: CopySummary): void {
    this.notifier.notifyProgress(this.sessionId, {
      type: 'done',
      completed: summary.completedFiles,
      completedBytes: summary.completedBytes,
      failed: summary.failedCount,
      failedFiles: summary.failedFiles,
      total: summary.totalFilesAmount,
      totalBytes: summary.totalBytes
    })
  }

  public onError(message: string): void {
    this.sessionSingletonInstance.update(this.sessionId, { status: 'error' })
    this.notifier.notifyProgress(this.sessionId, { type: 'error', message })
  }
}
