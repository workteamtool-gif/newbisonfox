import React from 'react'
import { useWizardStore } from '../../store/useWizardStore'
import { uploadApi } from '../../services/uploadApi'
import { CancelModal } from '../CancelModal/CancelModal'
import { WizardHeader } from '../WizardHeader/WizardHeader'
import { clientLogger } from '../../utils/logger'
import { WelcomePage, SuccessPage } from '@renderer/entites/Wizard'
import './WizardLayout.css'
import { WizardBody } from '../WizardBody/WizardBody'
interface Props {
  children: React.ReactNode
}

export function WizardLayout({ children }: Props): React.JSX.Element {
  const step = useWizardStore((s) => s.step)
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

    // Trigger OS restart
    window.api.invoke('system:restart')
  }

  const showSteppersAndHeader = step !== WelcomePage && step !== SuccessPage

  const layoutClass = `wizard-layout${isKeyboardVisible ? ' wizard-layout--with-keyboard' : ''}${!showSteppersAndHeader ? ' wizard-layout--no-header' : ''}`

  return (
    <div className={layoutClass}>
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
      />
      {showSteppersAndHeader && <WizardHeader onCancelClick={() => setCancelModalOpen(true)} />}

      <WizardBody showSteppersAndHeader={showSteppersAndHeader}>{children}</WizardBody>
    </div>
  )
}
