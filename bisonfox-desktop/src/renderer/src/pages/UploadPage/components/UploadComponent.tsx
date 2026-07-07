import React, { JSX } from 'react'
import { FailedItemsUpload } from './FailedItemsUpload'
import { StatsUpload } from './StatsUpload'
import { VideoUpload } from './VideoUpload'
import { FailedFile } from '@shared/entities/FailedFile'
export interface UploadComponentProps {
  showFailedReview: boolean
  uploadDone: boolean
  phaseLabel: JSX.Element
  totalDiscovered: number
  shown: number
  completedCount: number
  failedCount: number
  overallPercentage: number
  failedFilesList: FailedFile[]
  MAX_FAILED_FILES_TO_SHOW: number
  skipFailed: () => void
  retryFailed: () => void
  retryAll: () => void
  loadingVideo: string
  completedBytes: number
  totalBytes: number
}

export function UploadComponent({
  showFailedReview,
  uploadDone,
  phaseLabel,
  totalDiscovered,
  shown,
  completedCount,
  failedCount,
  overallPercentage,
  failedFilesList,
  MAX_FAILED_FILES_TO_SHOW,
  skipFailed,
  retryFailed,
  retryAll,
  loadingVideo,
  completedBytes,
  totalBytes
}: UploadComponentProps): React.JSX.Element {
  return (
    <div className="upload-container">
      <p className="page-title">
        {showFailedReview ? (
          <>⚠️ חלק מהקבצים נכשלו</>
        ) : uploadDone ? (
          <>✅ ההעלאה הושלמה!</>
        ) : (
          <>🚀 מעלה קבצים...</>
        )}
      </p>

      {/* Status Video — hide during failed review */}
      {!showFailedReview && <VideoUpload loadingVideo={loadingVideo} phaseLabel={phaseLabel} />}

      {/* Stats row */}
      <StatsUpload
        totalDiscovered={totalDiscovered}
        shown={shown}
        completedCount={completedCount}
        failedCount={failedCount}
        overallPercentage={overallPercentage}
        completedBytes={completedBytes}
        totalBytes={totalBytes}
        showTotalReview={!showFailedReview}
      />

      {/* Failed files review panel */}
      {showFailedReview && (
        <FailedItemsUpload
          failedCount={failedCount}
          failedFilesList={failedFilesList}
          MAX_FAILED_FILES_TO_SHOW={MAX_FAILED_FILES_TO_SHOW}
          skipFailed={skipFailed}
          retryFailed={retryFailed}
          retryAll={retryAll}
        />
      )}

      {/* Failure notice during active copy */}
      {!showFailedReview && failedCount > 0 && (
        <div className="info-box upload-notice-failed">
          ⚠️ <strong>{failedCount.toLocaleString()} קבצים נכשלו</strong> — דולגו כדי להמשיך בהעתקה.
        </div>
      )}

      {/* Overall progress bar — hide during failed review */}
      {!showFailedReview && (
        <div>
          <div className="progress-header">
            <span className="progress-name upload-progress-name">{phaseLabel}</span>
            <span className="progress-pct">{overallPercentage}%</span>
          </div>
          <div className="progress-track upload-progress-track">
            <div className="progress-fill" style={{ width: `${overallPercentage}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
