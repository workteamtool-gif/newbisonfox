import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { WizardStep } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import React, { JSX, LazyExoticComponent } from 'react'

export interface ReadyUploadProps {
    setStep: (step: WizardStep) => void
    ReviewPage: LazyExoticComponent<() => JSX.Element | null>
    countingComplete: boolean
    preCalcTotal: number | null
    startUpload: () => void
}

export function ReadyUpload({
    setStep,
    ReviewPage,
    countingComplete,
    preCalcTotal,
    startUpload
}: ReadyUploadProps): React.JSX.Element {

    return (
        <div style={{ textAlign: 'center' }}>
            <p className="page-title">מוכן להעתקה
            </p>
            <div
                className="info-box"
                style={{
                    margin: '2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'center'
                }}
            >
                <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</span>
                {!countingComplete ? (
                    <span style={{ color: 'var(--text-secondary)' }}>
                        <span className="spin">⟳</span>
                        {preCalcTotal
                            ? ` נמצאו ${preCalcTotal.toLocaleString()} קבצים עד כה...`
                            : ' סופרים קבצים...'}
                    </span>
                ) : (
                    <>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                            {preCalcTotal?.toLocaleString()}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            קבצים להעתקה</span>
                    </>
                )}
            </div>

            <NavigationOptions
                onBack={() => {
                    clientLogger.info('UploadPage', 'User navigating back to ReviewPage')
                    setStep(ReviewPage)
                }}
                onForward={startUpload}
                forwardDisabled={!countingComplete}
            />
        </div>

    )
}
