import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './WizardBody.css'
import { PHASE_GROUPS } from '@renderer/Constants/phases'

interface WizardBodyProps {
    children: React.ReactNode
    showSteppersAndHeader: boolean
}

export function WizardBody({ children, showSteppersAndHeader }: WizardBodyProps): React.JSX.Element | null {
    const step = useWizardStore((s) => s.step)
    let activeGroupIdx = PHASE_GROUPS.findIndex((g) => g.steps.includes(step))
    if (activeGroupIdx === -1) activeGroupIdx = 0
    return (
        <div className="wizard-bottom-zone">
            {showSteppersAndHeader && (
                <div className="step-indicator">
                    {PHASE_GROUPS.map((group, i) => {
                        const status = i < activeGroupIdx ? 'done' : i === activeGroupIdx ? 'active' : 'pending'
                        return (
                            <React.Fragment key={group.key}>
                                {i > 0 && <div className={`step-connector ${i <= activeGroupIdx ? 'done' : ''}`} />}
                                <div
                                    className={`step-dot ${status}`}
                                    title={group.label}
                                    style={{ position: 'relative', margin: '0 5vh' }}
                                >
                                    {status === 'done' ? '✓' : i + 1}
                                    <span className='phase'
                                        style={{
                                            color: status === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: status === 'active' ? 500 : 400
                                        }}
                                    >
                                        {group.label}
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

