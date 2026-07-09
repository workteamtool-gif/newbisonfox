import { JSX } from 'react'
import { FailedFilesList } from '@renderer/components/FailedFilesList/FailedFilesList'
import { useSuccessPage } from './hooks/useSuccessPage'
import { SuccessStats } from './components/SuccessStats'
import { SuccessFooter } from './components/SuccessFooter'
import './SuccessPage.css'

const MAX_FAILED_FILES_TO_SHOW = 10

export function SuccessPage(): JSX.Element {
  const {
    diskSessions,
    countdown,
    totalFilesAmount,
    failedCountTotal,
    failedFiles,
    destinationUserEndpoint,
    username,
    handleReturnHome
  } = useSuccessPage()

  return (
    <div className="glass-card success-card">
      <p className="page-title">הכל הועלה בהצלחה!</p>
      <p className="page-subtitle">
        {destinationUserEndpoint && (
          <p className="page-subtitle">
            ניתן לראות את הקבצים ברשת היחידה בעזרת הנתיב: <br />
            <div className="destination-path">
              {destinationUserEndpoint}\{username}
            </div>
            <br />
            אם אינכם רואים את הנתיב - ניתן לפנות לצוותי התמיכה הטכנית
          </p>
        )}
      </p>

      <SuccessStats diskSessionsLength={diskSessions.length} totalFilesAmount={totalFilesAmount} />

      {failedCountTotal > 0 && (
        <div className="info-box failed-files-box">
          <h4 className="failed-files-header">⚠️ {failedCountTotal} קבצים לא הועלו</h4>
          <div className="failed-files-list-wrapper">
            <FailedFilesList
              failedFiles={failedFiles}
              totalFailedCount={failedCountTotal}
              maxToShow={MAX_FAILED_FILES_TO_SHOW}
            />
          </div>
        </div>
      )}

      <SuccessFooter countdown={countdown} onReturnHome={handleReturnHome} />
    </div>
  )
}
