import { WizardStep } from '@renderer/entites/Wizard'
import React, { JSX, LazyExoticComponent } from 'react'

export interface ErrorUploadProps {
  setStep: (step: WizardStep) => void
  uploadError: string
  ReviewPage: LazyExoticComponent<() => JSX.Element | null>
}

export function ErrorUpload({
  uploadError,
  setStep,
  ReviewPage
}: ErrorUploadProps): React.JSX.Element {

  return (
    <>
      <p className="page-title" style={{ color: 'var(--accent-red)' }}>
        שגיאה בהעתקה
      </p>
      <div
        className="info-box"
        style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
      >
        {uploadError}
      </div>
      <div className="action-row">
        <button className="btn btn-secondary" onClick={() => setStep(ReviewPage)}>
          חזרה לבדיקה ←
        </button>
      </div>
    </>
  )
}
