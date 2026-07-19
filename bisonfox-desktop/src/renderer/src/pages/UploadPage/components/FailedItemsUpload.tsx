import React from 'react'
import { FailedFilesList } from '@renderer/components/FailedFilesList/FailedFilesList'
import { FailedFile } from '@shared/entities/FailedFile'
import { getConfig } from '@renderer/services/configService'

export interface FailedItemsUploadProps {
  failedCount: number
  failedFilesList: FailedFile[]
  MAX_FAILED_FILES_TO_SHOW: number
  skipFailed: () => void
  retryFailed: () => void
  retryAll: () => void
}

export function FailedItemsUpload({
  failedCount,
  failedFilesList,
  skipFailed,
  retryFailed,
  retryAll
}: FailedItemsUploadProps): React.JSX.Element {
  const [maxTrackedFailures, setMaxTrackedFailures] = React.useState(100_000)

  React.useEffect(() => {
    let mounted = true
    getConfig()
      .then((config) => {
        if (mounted) setMaxTrackedFailures(config.maxReportedFailures || 10)
      })
      .catch((err) => console.error('Failed to load config for FailedItemsUpload', err))
      
    return () => {
      mounted = false
    }
  }, [])

  const exceedsTrackingLimit = failedCount > maxTrackedFailures

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
            maxToShow={maxTrackedFailures}
          />
        </div>

        <div className="failed-review-actions">
          <button className="btn btn-skip-failed" onClick={skipFailed}>
            דלג על פריטים שנכשלו
          </button>
          {exceedsTrackingLimit ? (
            <>
              <button className="btn btn-primary" onClick={retryAll}>
                🔄 נסה שוב את כל הקבצים
              </button>
              <div className="failed-review-warning">
                ⚠️ נכשלו יותר מ-{maxTrackedFailures.toLocaleString()} קבצים. המערכת לא שמרה את כל
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
