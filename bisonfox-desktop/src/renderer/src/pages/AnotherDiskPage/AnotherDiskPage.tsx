import React from 'react'
import { FailedFilesList } from '@renderer/components/FailedFilesList/FailedFilesList'
import { useAnotherDiskPage } from './hooks/useAnotherDiskPage'
import { AnotherDiskStats } from './components/AnotherDiskStats'
import { AnotherDiskChoices } from './components/AnotherDiskChoices'
import './AnotherDiskPage.css'

const MAX_FAILED_FILES_TO_SHOW = 5

export function AnotherDiskPage(): React.JSX.Element {
  const {
    countdown,
    diskSessions,
    totalFiles,
    failedCountTotal,
    failedFiles,
    handleYes,
    handleNo
  } = useAnotherDiskPage()

  return (
    <div className="glass-card another-disk-card">
      <p className="page-title">כונן נוסף?</p>

      <p className="page-subtitle">לא לשכוח לנתק את הכונן החיצוני!</p>

      <div className="another-disk-content">
        <AnotherDiskStats diskSessionsLength={diskSessions.length} totalFiles={totalFiles} />

        {failedCountTotal > 0 && (
          <div className="info-box failed-files-box">
            <h4 className="failed-files-title">⚠️ לא ניתן היה להעתיק {failedCountTotal} קבצים</h4>
            <div className="failed-files-list">
              <FailedFilesList
                failedFiles={failedFiles}
                totalFailedCount={failedCountTotal}
                maxToShow={MAX_FAILED_FILES_TO_SHOW}
              />
            </div>
          </div>
        )}
      </div>

      <h3 className="another-disk-question">האם תרצה להוסיף כונן נוסף?</h3>

      <AnotherDiskChoices onYes={handleYes} onNo={handleNo} />

      <p className="another-disk-countdown">
        חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
      </p>
    </div>
  )
}
