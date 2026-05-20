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
      <div
        className="info-box"
        style={{
          borderColor: 'var(--accent-red)',
          background: 'rgba(239, 68, 68, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          gap: '0.75rem',
          marginBottom: '1.5rem',
          textAlign: 'left',
          position: 'relative'
        }}
      >
        <h4
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--accent-red)',
            fontSize: '2rem'
          }}
        >
          ⚠️ לא ניתן היה להעתיק {failedCount.toLocaleString()} קבצים
        </h4>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            fontSize: '1.5rem',
            width: '100%'
          }}
        >
          <FailedFilesList
            failedFiles={failedFilesList}
            totalFailedCount={failedCount}
            maxToShow={MAX_TRACKED_FAILURES}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.75rem',
            width: '100%',
            justifyItems: 'flex-end',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            fontSize: '1.7rem'
          }}
        >
          <button
            className="btn"
            style={{ background: 'hsl(142, 71%, 45%, .8)' }}
            onClick={skipFailed}
          >
            דלג על פריטים שנכשלו
          </button>
          {exceedsTrackingLimit ? (
            <>
              <button className="btn btn-primary" onClick={retryAll}>
                🔄 נסה שוב את כל הקבצים
              </button>
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: 'var(--r-md)',
                  fontSize: '1.8rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'right'
                }}
              >
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
