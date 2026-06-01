import React from 'react'
import { FailedFilesList } from '@renderer/components/FailedFilesList/FailedFilesList'

export interface FailedItemsUploadProps {
  failedCount: number
  failedFilesList: { path: string; reason: string }[]
  MAX_FAILED_FILES_TO_SHOW: number
  skipFailed: () => void
  retryFailed: () => void
  retryAll: () => void
}

const MAX_TRACKED_FAILURES = Number(import.meta.env.VITE_MAX_REPORTED_FAILURES) || 100_000
export function FailedItemsUpload({
  failedCount,
  failedFilesList,
  skipFailed,
  retryFailed,
  retryAll
}: FailedItemsUploadProps): React.JSX.Element {
  const exceedsTrackingLimit = failedCount > MAX_TRACKED_FAILURES

  return (
    <>
      <div className="info-box failed-review-box">
        <h4 className="failed-review-title">
          ⚠️ לא ניתן היה להעתיק {failedCount.toLocaleString()} קבצים
        </h4>
        <div className="failed-review-list-container">
          <FailedFilesList
            failedFiles={failedFilesList}
            totalFailedCount={failedCount}
            maxToShow={MAX_TRACKED_FAILURES}
          />
        </div>

        <div className="failed-review-actions">
          <button
            className="btn btn-skip-failed"
            onClick={skipFailed}
          >
            דלג על פריטים שנכשלו
          </button>
          {exceedsTrackingLimit ? (
            <>
              <button className="btn btn-primary" onClick={retryAll}>
                🔄 נסה שוב את כל הקבצים
              </button>
              <div className="failed-review-warning">
                ⚠️ נכשלו יותר מ-{MAX_TRACKED_FAILURES.toLocaleString()} קבצים. המערכת לא שמרה את כל
                הכשלונות. לחיצה על "נסה שוב את כל הקבצים" תעלה מחדש את כל הקבצים שנבחרו.
              </div>
            </>
          ) : (
            <button className="btn btn-primary" onClick={retryFailed}>
              🔄 נסה שוב פריטים שנכשלו
            </button>
          )}
        </div>
      </div>
    </>
  )
}
