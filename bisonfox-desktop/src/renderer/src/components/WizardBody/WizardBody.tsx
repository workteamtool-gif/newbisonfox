import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './WizardBody.css'
import { PHASES } from '@renderer/Constants/phases'

interface WizardBodyProps {
    children: React.ReactNode
    showSteppersAndHeader: boolean
}

export function WizardBody({ children, showSteppersAndHeader }: WizardBodyProps): React.JSX.Element | null {
    const step = useWizardStore((s) => s.step)
    let activePhaseIdx = PHASES.findIndex((p) => p.step === step)
    if (activePhaseIdx === -1) activePhaseIdx = 0
    return (
        <div className="wizard-bottom-zone">
            {showSteppersAndHeader && (
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
                                    <span className='phase'
                                        style={{
                                            color: status === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
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
            )}
            <div className="wizard-children-wrapper">
                {children}
            </div>
        </div>
    )
}
