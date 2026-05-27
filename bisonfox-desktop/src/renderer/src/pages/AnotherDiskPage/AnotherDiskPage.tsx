import React, { useEffect, useState } from 'react'
import { FailedFilesList } from '@renderer/components/FailedFilesList/FailedFilesList'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './AnotherDiskPage.css'
import { SetupPage, SuccessPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'

export function AnotherDiskPage(): React.JSX.Element {
  const { setStep, diskSessions, userName, sessionId, reset, setCurrentDisk, setCurrentSubfolder, currentSubfolder } =
    useWizardStore()
  const [countdown, setCountdown] = useState(150)
  const mailLogged = React.useRef(false)

  useEffect(() => {
    if (!mailLogged.current) {
      mailLogged.current = true
      const lastSession = diskSessions[diskSessions.length - 1]
      const filesSucceeded = lastSession?.copiedCount ?? 0
      const failedFilesAmount = lastSession?.failedCount ?? 0
      const totalFiles = filesSucceeded + failedFilesAmount

      window.api.invoke('log-mail', {
        userName,
        subfolder: currentSubfolder,
        filesSucceeded,
        totalFiles,
        failedFilesAmount
      })
    }

    const interval = setInterval(() => {
      setCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(interval)
          reset()
        }
        return currentCountdown - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [reset, userName, diskSessions, currentSubfolder])

  function handleYes(): void {
    clientLogger.info(
      'AnotherDiskPage',
      `The user: ${userName} in session: ${sessionId} wants to add another disk,
       finishing the session and moving to SetupPage`
    )
    setCurrentDisk(null)
    setCurrentSubfolder('')
    setStep(SetupPage)
  }

  function handleNo(): void {
    clientLogger.info(
      'AnotherDiskPage',
      `The user: ${userName} in session: ${sessionId} wants to finish the session,
       finishing the session and moving to SuccessPage`
    )
    setStep(SuccessPage)
  }

  const totalFiles = diskSessions.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedItemPaths.length),
    0
  )
  const failedCountTotal = diskSessions.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = diskSessions.flatMap((d) => d.failedItems || [])

  const MAX_FAILED_FILES_TO_SHOW = 5

  return (
    <div className="glass-card" style={{ textAlign: 'center' }}>
      <p className="page-title">כונן נוסף?</p>

      <p className="page-subtitle">
        לא לשכוח לנתק את הכונן החיצוני!
      </p>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="another-disk-stats" style={{ width: '100%' }}>
          <div className="stat-card">
            <div className="stat-icon">
              📤
            </div>
            <div className="stat-val" style={{ color: 'var(--accent)' }}>
              {diskSessions.length}
            </div>
            <div className="stat-lbl">העברות שבוצעו</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              📄
            </div>
            <div className="stat-val" style={{ color: 'var(--accent-green)' }}>
              {totalFiles.toLocaleString()}
            </div>
            <div className="stat-lbl">סה"כ קבצים שהועלו</div>
          </div>
        </div>

        {failedCountTotal > 0 && (
          <div className="info-box failed-files-box">
            <h4 className="failed-files-title">⚠️ לא ניתן היה להעתיק {failedCountTotal} קבצים</h4>
            <div className="failed-files-list" style={{}}>
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

      <div className="choice-row">
        <div
          id="another-disk-yes"
          className="choice-card yes"
          onClick={handleYes}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleYes()}
        >
          <span className="choice-emoji">💿</span>
          <span className="choice-label">כן, הוסף עוד כונן</span>
          <span className="choice-sub">חבר כונן נוסף כדי להמשיך</span>
        </div>

        <div
          id="another-disk-no"
          className="choice-card no"
          onClick={handleNo}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleNo()}
        >
          <span className="choice-emoji">✅</span>
          <span className="choice-label">לא, סיימתי</span>
          <span className="choice-sub">עבור לעמוד הסיום</span>
        </div>
      </div>

      <p className="another-disk-countdown">
        חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
      </p>
    </div>
  )
}
