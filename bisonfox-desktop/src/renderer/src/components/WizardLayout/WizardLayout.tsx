import React from 'react'
import { useWizardStore } from '../../store/useWizardStore'
import { uploadApi } from '../../services/uploadApi'
import { CancelModal } from '../CancelModal'
import { WizardHeader } from '../WizardHeader/WizardHeader'
import { clientLogger } from '../../utils/logger'
import './WizardLayout.css'
interface Props {
  children: React.ReactNode
}

export function WizardLayout({ children }: Props): React.JSX.Element {
  const reset = useWizardStore((s) => s.reset)
  const sessionId = useWizardStore((s) => s.sessionId)
  const userName = useWizardStore((s) => s.userName)
  const isCancelModalOpen = useWizardStore((s) => s.isCancelModalOpen)
  const setCancelModalOpen = useWizardStore((s) => s.setCancelModalOpen)
  const isKeyboardVisible = useWizardStore((s) => s.isKeyboardVisible)

  React.useEffect(() => {
    const handleUnload = (): void => {
      if (sessionId) {
        clientLogger.info(
          'WizardLayout',
          `For user: ${userName} in session: ${sessionId} session stopped because the program was closed or unloaded.`
        )
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [sessionId, userName])

  const handleConfirmCancel = async (): Promise<void> => {
    clientLogger.info(
      'WizardLayout',
      `For user: ${userName} in session: ${sessionId} user cancelled the session.`
    )
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
