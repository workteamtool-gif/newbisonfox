import { useEffect, useState } from 'react'
import { FailedFilesList } from '@renderer/components/FailedFilesList/FailedFilesList'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './SuccessPage.css'
import { JSX } from 'react'

export function SuccessPage(): JSX.Element {
  const { reset, userName } = useWizardStore()
  const diskSessions = useWizardStore((s) => s.diskSessions)
  const [snapshot] = useState(diskSessions)
  const [countdown, setCountdown] = useState(150)

  const totalFiles = snapshot.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedFiles.length),
    0
  )
  const failedCountTotal = snapshot.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = snapshot.flatMap((d) => d.failedFiles || [])
  const destinationUserEndpoint = import.meta.env.VITE_ENDPOINT_DESTINATION_FOLDER

  const MAX_FAILED_FILES_TO_SHOW = 10

  useEffect(() => {
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
  }, [reset])

  return (
    <div className="glass-card success-card">

      <p className="page-title">הכל הועלה בהצלחה!</p>
      <p className="page-subtitle">
        {destinationUserEndpoint && (
          <p className="page-subtitle">
            ניתן לראות את הקבצים ברשת היחידה בעזרת הנתיב: <br />
            <code style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>
              {destinationUserEndpoint}\{userName}
            </code>
          </p>
        )}
      </p>

      <div className="success-stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            📤
          </div>
          <div className="stat-val" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>
            {diskSessions.length}
          </div>
          <div className="stat-lbl">סה"כ העברות שעובדו</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            📄
          </div>
          <div className="stat-val" style={{ color: 'var(--accent-green)', fontSize: '1.8rem' }}>
            {totalFiles.toLocaleString()}
          </div>
          <div className="stat-lbl">סה"כ קבצים שהועלו</div>
        </div>
      </div>

      {failedCountTotal > 0 && (
        <div className="info-box failed-files-box">
          <h4 className="failed-files-header">
            ⚠️ {failedCountTotal} קבצים לא הועלו
          </h4>
          <div className="failed-files-list-wrapper">
            <FailedFilesList
              failedFiles={failedFiles}
              totalFailedCount={failedCountTotal}
              maxToShow={MAX_FAILED_FILES_TO_SHOW}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p className="success-countdown" style={{ marginBottom: '1rem' }}>
          חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
        </p>

        <button id="back-home-btn" className="btn btn-primary btn-lg" onClick={reset}>
          ↩ לחזור הביתה כעת
        </button>
      </div>
    </div>
  )
}
