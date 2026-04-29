import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './AnotherDiskPage.css'
import { InsertDiskPage, SuccessPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'

export function AnotherDiskPage(): React.JSX.Element {
  const { setStep, diskSessions, userName, sessionId, reset } = useWizardStore()
  const [countdown, setCountdown] = useState(150)

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

  function handleYes(): void {
    clientLogger.info('AnotherDiskPage', `The user: ${userName} in session: ${sessionId} wants to add another disk,
       finishing the session and moving to InsertDiskPage`)
    setStep(InsertDiskPage)
  }

  function handleNo(): void {
    clientLogger.info('AnotherDiskPage', `The user: ${userName} in session: ${sessionId} wants to finish the session,
       finishing the session and moving to SuccessPage`)
    setStep(SuccessPage)
  }

  const totalFiles = diskSessions.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedFiles.length),
    0
  )
  const failedCountTotal = diskSessions.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = diskSessions.flatMap((d) => d.failedFiles || [])

  const MAX_FAILED_FILES_TO_SHOW = 5

  return (
    <div className="glass-card" style={{ textAlign: 'center' }}>
      <p className="page-title">כונן נוסף?</p>

      <p className="page-subtitle" style={{ marginBottom: '2rem' }}>
        נהדר! סיימת לעבד את הכונן הקודם בהצלחה.
      </p>

      <p className="page-subtitle" style={{ marginBottom: '2rem' }}>
        סיכום של כל ההעברות:
      </p>

      <div className="stats-dashboard another-disk-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            📤
          </div>
          <div className="stat-val" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>
            {diskSessions.length}
          </div>
          <div className="stat-lbl">העברות שעובדו</div>
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
          <h4 className="failed-files-title">
            ⚠️ לא ניתן היה להעתיק {failedCountTotal} קבצים
          </h4>
          <div className="failed-files-list" style={{}}>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {failedFiles.slice(0, MAX_FAILED_FILES_TO_SHOW).map((f, i) => (
                <li key={i} style={{ wordBreak: 'break-all', marginBottom: '0.4rem' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.path}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>סיבה: {f.reason}</div>
                </li>
              ))}
            </ul>
            {failedCountTotal > MAX_FAILED_FILES_TO_SHOW && (
              <div style={{ marginTop: '0.3rem', fontStyle: 'italic', direction: 'rtl' }}>
                ...ועוד {failedCountTotal - MAX_FAILED_FILES_TO_SHOW} (רק {MAX_FAILED_FILES_TO_SHOW} הכשלונות הראשונים מוצגים).
              </div>
            )}
          </div>
        </div>
      )}

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

      <p className="another-disk-countdown" style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
      </p>
    </div>
  )
}
