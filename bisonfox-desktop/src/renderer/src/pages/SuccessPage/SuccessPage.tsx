import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import likingImage from '@renderer/images/liking.png'
import './SuccessPage.css'
import { JSX } from 'react'

export function SuccessPage(): JSX.Element {
  const { reset, userName } = useWizardStore()
  const diskSessions = useWizardStore((s) => s.diskSessions)
  const [snapshot] = useState(diskSessions)
  const [countdown, setCountdown] = useState(1500)

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
      <img src={likingImage} alt="Upload Successful" className="success-image" />

      <p className="page-title">הכל הועלה בהצלחה!</p>
      <p className="page-subtitle">
        עבודה יפה<strong>{userName}</strong>! כל <strong>{totalFiles}</strong> הקבצים מ{' '}
        <strong>{snapshot.length}</strong> הדיסקים הועלו בהצלחה!
        {destinationUserEndpoint && (
          <span>
            {' '}ניתן לראות את הקבצים בתיקיה: <strong>{destinationUserEndpoint}\{userName}</strong>
          </span>
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
            <ul className="failed-files-list">
              {failedFiles.slice(0, MAX_FAILED_FILES_TO_SHOW).map((f, i) => (
                <li key={i} style={{ marginBottom: '0.4rem' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.path}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Reason: {f.reason}</div>
                </li>
              ))}
            </ul>
            {failedCountTotal > MAX_FAILED_FILES_TO_SHOW && (
              <div className="failed-files-overflow">
                ...and {failedCountTotal - MAX_FAILED_FILES_TO_SHOW} more (Only the first {MAX_FAILED_FILES_TO_SHOW} failures are shown).
              </div>
            )}
          </div>
        </div>
      )}

      <p className="success-countdown">
        חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
      </p>

      <button id="back-home-btn" className="btn btn-primary btn-lg" onClick={reset}>
        ↩ לחזור הביתה כעת
      </button>
    </div>
  )
}
