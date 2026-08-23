import React from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { uploadApi } from '@renderer/services/uploadApi'
import { ConfirmModal } from '@renderer/components/ConfirmModal/ConfirmModal'
import { WizardHeader } from '@renderer/components/WizardHeader/WizardHeader'
import { clientLogger } from '@renderer/utils/logger'
import { WelcomePage, FinalPage } from '@renderer/entites/Wizard'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'
import '@renderer/components/WizardLayout/WizardLayout.css'
import { WizardBody } from '@renderer/components/WizardBody/WizardBody'
interface Props {
  children: React.ReactNode
}

export function WizardLayout({ children }: Props): React.JSX.Element {
  const step = useWizardStore((s) => s.step)
  const sessionId = useWizardStore((s) => s.sessionId)
  const username = useWizardStore((s) => s.username)
  const isCancelModalOpen = useWizardStore((s) => s.isCancelModalOpen)
  const setCancelModalOpen = useWizardStore((s) => s.setCancelModalOpen)
  const isKeyboardVisible = useWizardStore((s) => s.isKeyboardVisible)

  React.useEffect(() => {
    const handleUnload = (): void => {
      if (sessionId) {
        clientLogger.info(
          'WizardLayout',
          `Session stopped because the program was closed or unloaded.`
        )
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [sessionId, username])

  const handleConfirmCancel = async (): Promise<void> => {
    clientLogger.info('WizardLayout', `User cancelled the session.`)
    setCancelModalOpen(false)
    if (sessionId) {
      try {
        await uploadApi.cancelSession(sessionId)
      } catch {}
    }

    window.api.invoke(IPC_CHANNELS.SYSTEM.CLOSE)
  }

  const showSteppersAndHeader = step !== WelcomePage && step !== FinalPage

  const layoutClass = `wizard-layout${isKeyboardVisible ? ' wizard-layout--with-keyboard' : ''}${!showSteppersAndHeader ? ' wizard-layout--no-header' : ''}`

  return (
    <div className={layoutClass}>
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="האם אתה רוצה לצאת?"
        message=""
        confirmText="כן, לצאת"
        cancelText="לא, להמשיך"
        icon="⚠️"
        isRed={true}
      />
      {showSteppersAndHeader && <WizardHeader onCancelClick={() => setCancelModalOpen(true)} />}

      <WizardBody showSteppersAndHeader={showSteppersAndHeader}>{children}</WizardBody>
    </div>
  )
}
