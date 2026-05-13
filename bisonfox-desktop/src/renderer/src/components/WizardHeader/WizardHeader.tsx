import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './WizardHeader.css'
import { WelcomePage, SuccessPage } from '@renderer/entites/Wizard'
import iconImg from '@renderer/images/icon.png'

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
        <div className="wizard-logo">
          <img src={iconImg} alt="LightningFox" className="wizard-logo-icon" />
          lightning Fox
        </div>
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
            className="btn btn-secondary"
            style={{
              padding: '0.5vh 1vh',
              fontSize: '0.8rem',
              background: 'transparent',
              border: '2px solid rgba(255, 0, 0)',
              color: '#ff0000'
            }}
            onClick={onCancelClick}
          >
            ביטול העברה
          </button>
        </div>
      </div>
    </header>
  )
}
