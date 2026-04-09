import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './WizardHeader.css'
import { PHASES } from '@renderer/Constants/phases'
import { WelcomePage, SuccessPage } from '@renderer/entites/Wizard'

interface WizardHeaderProps {
  onCancelClick: () => void
}

export function WizardHeader({ onCancelClick }: WizardHeaderProps): React.JSX.Element | null {
  const step = useWizardStore((s) => s.step)
  const userName = useWizardStore((s) => s.userName)

  if (step === WelcomePage || step === SuccessPage) return null

  let activePhaseIdx = PHASES.findIndex((p) => p.steps.includes(step))
  if (activePhaseIdx === -1) activePhaseIdx = 0

  return (
    <header className="wizard-header">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          alignItems: 'center',
        }}
      >
        <div className="wizard-logo">BisonFox</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1vh' }}>
          {userName && (
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '1vh'
              }}
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

      <div className="step-indicator">
        {PHASES.map((phase, i) => {
          const status = i < activePhaseIdx ? 'done' : i === activePhaseIdx ? 'active' : 'pending'
          return (
            <React.Fragment key={phase.key}>
              {i > 0 && <div className={`step-connector ${i <= activePhaseIdx ? 'done' : ''}`} />}
              <div
                className={`step-dot ${status}`}
                title={phase.label}
                style={{ position: 'relative', margin: '0 5vh' }}
              >
                {status === 'done' ? '✓' : i + 1}
                <span
                  style={{
                    position: 'absolute',
                    top: '35px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.7rem',
                    color: status === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    fontWeight: status === 'active' ? 500 : 400
                  }}
                >
                  {phase.label}
                </span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </header>
  )
}
