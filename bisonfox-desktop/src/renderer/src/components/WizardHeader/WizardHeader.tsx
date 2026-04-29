import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './WizardHeader.css'
import { WelcomePage, SuccessPage } from '@renderer/entites/Wizard'

interface WizardHeaderProps {
  onCancelClick: () => void
}

export function WizardHeader({ onCancelClick }: WizardHeaderProps): React.JSX.Element | null {
  const step = useWizardStore((s) => s.step)
  const userName = useWizardStore((s) => s.userName)

  if (step === WelcomePage || step === SuccessPage) return null

  return (
    <header className="wizard-header">
      <div className="wizard-header-content">
        <div className="wizard-logo">BisonFox</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1vh' }}>
          {userName && (
            <div
              className='user-name'
            >
              <span className="pill-dot" style={{ background: 'var(--accent-green)' }}></span>
              {userName}
            </div>
          )}
          <button
            className="btn btn-secondary cancel-btn"
            style={{
              padding: '0.5vh 1vh',
              fontSize: '0.8rem',
              background: 'transparent',
              border: '1px solid rgba(255,100,100,0.3)',
              color: '#ff7b7b'
            }}
            onClick={onCancelClick}
            title="Cancel Session & Return Home"
          >
            ביטול העברה
          </button>
        </div>
      </div>

    </header>
  )
}
