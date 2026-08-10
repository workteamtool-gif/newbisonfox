import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './WizardHeader.css'
import { WelcomePage, FinalPage } from '@renderer/entites/Wizard'
import iconImg from '@renderer/images/appLogo.png'
import teamLogoImg from '@renderer/images/teamLogo.png'
import departmentLogoImg from '@renderer/images/departmentLogo.png'

interface WizardHeaderProps {
  onCancelClick: () => void
}

export function WizardHeader({ onCancelClick }: WizardHeaderProps): React.JSX.Element | null {
  const step = useWizardStore((s) => s.step)
  const username = useWizardStore((s) => s.username)

  if (step === WelcomePage || step === FinalPage) return null

  return (
    <header className="wizard-header">
      <div className="wizard-header-content" style={{ direction: 'ltr' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <div className="wizard-logo">
            <img src={iconImg} alt="LightningFox" className="wizard-logo-icon" />
            שועל ברק
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <img
              src={departmentLogoImg}
              alt="Department Logo"
              style={{ height: '3.5rem', objectFit: 'contain' }}
            />
            <img
              src={teamLogoImg}
              alt="Team Logo"
              style={{ height: '3.5rem', objectFit: 'contain' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1vh', direction: 'ltr' }}>
          {username && <div className="user-name">{username}</div>}
          <button
            className="btn btn-secondary"
            style={{
              padding: '0.5vh 1vh',
              fontSize: '0.8rem',
              background: 'transparent',
              border: '2px solid rgba(255, 0, 0)',
              color: '#ff0000',
              direction: 'rtl'
            }}
            onClick={onCancelClick}
          >
            יציאה
          </button>
        </div>
      </div>
    </header>
  )
}
