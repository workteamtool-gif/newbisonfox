import { JSX } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { SetupPage } from '@renderer/entites/Wizard'
import { useDirectoryCheck } from '@renderer/pages/WelcomePage/hooks/useDirectoryCheck'
import iconImg from '@renderer/images/appLogo.png'
import '@renderer/pages/WelcomePage/WelcomePage.css'

export function WelcomePage(): JSX.Element {
  const setStep = useWizardStore((s) => s.setStep)
  const { status, hasError, isReady, failedDirNames, recheck } = useDirectoryCheck()

  return (
    <div className="welcome-page">
      <div className="welcome-content glass-card">
        <img src={iconImg} className="welcome-img" />
        <h1 className="welcome-title">שועל ברק</h1>
        <p className="welcome-sub">
          ברוכים הבאים לעמדת שועל ברק! כאן ניתן להעביר קבצים מכוננים חיצוניים לתוך רשת היחידה
        </p>
        {hasError && (
          <div className="welcome-connection-error" role="alert">
            <span className="welcome-error-icon">⚠️</span>
            <div className="welcome-error-body">
              <span className="welcome-error-text">ישנן ספריות שאינן נגישות — לא ניתן להתחיל</span>
              {failedDirNames.length > 0 && (
                <ul className="welcome-error-dirs">
                  {failedDirNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="welcome-actions">
          <button
            id="welcome-start-btn"
            className="btn btn-primary btn-xl"
            onClick={() => setStep(SetupPage)}
            disabled={!isReady}
          >
            {status === 'checking' ? (
              <><span className="spin">⟳</span> בודק...</>
            ) : (
              'לחץ כדי להתחיל'
            )}
          </button>

          {hasError && (
            <button
              id="welcome-retry-btn"
              className="btn btn-secondary welcome-retry-btn"
              onClick={recheck}
            >
              נסה שנית
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

