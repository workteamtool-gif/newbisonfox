import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import likingImage from '@renderer/images/liking.png'
import './SuccessPage.css'
import { JSX } from 'react'

export function SuccessPage(): JSX.Element {
  const { reset, userName } = useWizardStore()
  const diskSessions = useWizardStore((s) => s.diskSessions)
  const [snapshot] = useState(diskSessions) // Fixes the stats resetting to 0 mid-transition
  const [countdown, setCountdown] = useState(15)

  const totalFiles = snapshot.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedFiles.length),
    0
  )
  const failedFiles = snapshot.flatMap((d) => d.failedFiles || [])
  const destinationUserEndpoint = import.meta.env.VITE_ENDPOINT_DESTINATION_FOLDER

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(interval)
          reset() // reset will push step back to WelcomePage
        }
        return currentCountdown - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [reset])

  return (
    <div className="wizard-layout">
      <div className="glass-card success-card">
        <img src={likingImage} alt="Upload Successful" className="success-image" />

        <p className="page-title">All Data Uploaded!</p>
        <p className="page-subtitle">
          Great work, <strong>{userName}</strong>! All <strong>{totalFiles}</strong> files from{' '}
          <strong>{snapshot.length}</strong> disk{snapshot.length !== 1 ? 's' : ''} have
          been successfully uploaded!
          {destinationUserEndpoint && (
            <span>
              {' '}You can see the files in the folder: <strong>{destinationUserEndpoint}\{userName}</strong>
            </span>
          )}
        </p>

        <div className="success-stats-row">
          <div className="stat-card" style={{ background: 'var(--panel-bg)' }}>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              📤
            </div>
            <div className="stat-val" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>
              {diskSessions.length}
            </div>
            <div className="stat-lbl">Session{diskSessions.length !== 1 ? 's' : ''} Processed</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--panel-bg)' }}>
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              📄
            </div>
            <div className="stat-val" style={{ color: 'var(--accent-green)', fontSize: '1.8rem' }}>
              {totalFiles.toLocaleString()}
            </div>
            <div className="stat-lbl">Total Files Uploaded</div>
          </div>
        </div>

        {failedFiles.length > 0 && (
          <div className="info-box failed-files-box">
            <h4 className="failed-files-header">
              ⚠️ {failedFiles.length} file(s) could not be copied after 5 retries
            </h4>
            <div className="failed-files-list-wrapper">
              <ul className="failed-files-list">
                {failedFiles.slice(0, 10).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              {failedFiles.length > 10 && (
                <div className="failed-files-overflow">...and {failedFiles.length - 10} more.</div>
              )}
            </div>
          </div>
        )}

        <p className="success-countdown">
          Returning to home in <strong>{countdown}</strong>s…
        </p>

        <button id="back-home-btn" className="btn btn-primary btn-lg" onClick={reset}>
          ↩ Start Over Now
        </button>
      </div>
    </div>
  )
}
