import { FailedFile } from '@shared/entities/FailedFile'
import { config } from '@main/appConfig'
import { CopySummary } from '@main/domain/interfaces/FileService'

export class CopyProgressReporter {
  private lastBroadcastTime = Date.now()
  private reportTimer: NodeJS.Timeout | null = null
  private lastReportFilePath = ''
  private lastReportProgressPercent = 0

  public completedFiles = 0
  public completedBytes = 0
  public failedCount = 0
  public failedFiles: FailedFile[] = []

  private readonly REPORT_COPIED_FILES_INTERVAL_MS = config.reportCopiedFilesIntervalMs

  constructor(
    private readonly onProgress: (
      currentFilePath: string,
      progressPercent: number,
      completedFiles: number,
      completedBytes: number,
      failedCount: number,
      failedFiles: FailedFile[],
      totalFilesAmount: number,
      totalBytes: number
    ) => void,
    private readonly getTotalFiles: () => number,
    private readonly getTotalBytes: () => number
  ) {}

  public reportProgress(currentFilePath: string, progressPercent: number): void {
    this.lastReportFilePath = currentFilePath
    this.lastReportProgressPercent = progressPercent

    const now = Date.now()
    if (now - this.lastBroadcastTime >= this.REPORT_COPIED_FILES_INTERVAL_MS) {
      this.clearTimer()
      this.lastBroadcastTime = now
      this.broadcast(currentFilePath, progressPercent)
    } else if (!this.reportTimer) {
      this.reportTimer = setTimeout(
        () => {
          this.reportTimer = null
          this.lastBroadcastTime = Date.now()
          this.broadcast(this.lastReportFilePath, this.lastReportProgressPercent)
        },
        this.REPORT_COPIED_FILES_INTERVAL_MS - (now - this.lastBroadcastTime)
      )
    }
  }

  public reportDone(): CopySummary {
    this.clearTimer()

    const finalTotalFiles = this.getTotalFiles()
    const finalTotalBytes = this.getTotalBytes() || this.completedBytes

    this.onProgress(
      '__done__',
      100,
      this.completedFiles,
      this.completedBytes,
      this.failedCount,
      this.failedFiles,
      finalTotalFiles,
      finalTotalBytes
    )

    return {
      completedFiles: this.completedFiles,
      completedBytes: this.completedBytes,
      failedCount: this.failedCount,
      failedFiles: this.failedFiles,
      totalFilesAmount: finalTotalFiles,
      totalBytes: finalTotalBytes
    }
  }

  private broadcast(currentFilePath: string, progressPercent: number): void {
    this.onProgress(
      currentFilePath,
      progressPercent,
      this.completedFiles,
      this.completedBytes,
      this.failedCount,
      this.failedFiles,
      this.getTotalFiles(),
      this.getTotalBytes()
    )
  }

  public clearTimer(): void {
    if (this.reportTimer) {
      clearTimeout(this.reportTimer)
      this.reportTimer = null
    }
  }
}
