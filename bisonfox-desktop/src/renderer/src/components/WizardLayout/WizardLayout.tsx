import React from 'react'
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
  const isCancelModalOpen = useWizardStore((s) => s.isCancelModalOpen)
  const setCancelModalOpen = useWizardStore((s) => s.setCancelModalOpen)
  const isKeyboardVisible = useWizardStore((s) => s.isKeyboardVisible)

  const handleConfirmCancel = async (): Promise<void> => {
    setCancelModalOpen(false)
    if (sessionId) {
      try {
        await uploadApi.cancelSession(sessionId)
      } catch {
        /* ignore */
      }
    }
    reset()
  }

  const layoutClass = `wizard-layout${isKeyboardVisible ? ' wizard-layout--with-keyboard' : ''}`

  return (
    <div className={layoutClass}>
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
      />
      <WizardHeader onCancelClick={() => setCancelModalOpen(true)} />
      {children}
    </div>
  )
}
