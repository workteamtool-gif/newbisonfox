import React, { useState } from 'react'
import { useWizardStore } from '../../store/useWizardStore'
import { uploadApi } from '../../services/uploadApi'
import { CancelModal } from '../CancelModal'
import { WizardHeader } from '../WizardHeader/WizardHeader'
import './WizardLayout.css'
interface Props {
  children: React.ReactNode
}

export function WizardLayout({ children }: Props): React.JSX.Element {
  const reset = useWizardStore((s) => s.reset)
  const sessionId = useWizardStore((s) => s.sessionId)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleConfirmCancel = async (): Promise<void> => {
    setShowCancelModal(false)
    if (sessionId) {
      try {
        await uploadApi.cancelSession(sessionId)
      } catch {
        /* ignore */
      }
    }
    reset()
  }

  return (
    <div className="wizard-layout">
      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />
      <WizardHeader onCancelClick={() => setShowCancelModal(true)} />
      {children}
    </div>
  )
}
