import { useWizardStore } from '@renderer/store/useWizardStore'
import './WelcomePage.css'
import { JSX } from 'react'

export function WelcomePage(): JSX.Element {
  const setStep = useWizardStore((s) => s.setStep)

  return (
    <div className="welcome-page">
      <div className="welcome-content glass-card">
        <div className="image-mark" aria-hidden="true"></div>

        <h1 className="welcome-title">BisonFox</h1>
        <p className="welcome-sub">
          Securely transfer files from physical drives to your system. Multi-disk support, real-time
          progress, and clean file management.
        </p>

        <button
          id="start-btn"
          className="btn btn-primary btn-xl"
          onClick={() => setStep('set-username')}
        >
          ⚡ Click to Start Uploading
        </button>
      </div>
    </div>
  )
}
