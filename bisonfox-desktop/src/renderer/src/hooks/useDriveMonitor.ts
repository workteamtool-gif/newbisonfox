import { useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { driveApi } from '@renderer/services/driveApi'
import { InsertDiskPage } from '@renderer/entites/Wizard'

export function useDriveMonitor(): void {
  const currentDisk = useWizardStore((s) => s.currentDisk)
  const setStep = useWizardStore((s) => s.setStep)
  const setToast = useWizardStore((s) => s.setToast)

  useEffect(() => {
    if (!currentDisk) return

    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout>

    const pollDrive = async (): Promise<void> => {
      try {
        const drives = await driveApi.listDrives()
        if (!isMounted) return

        const isConnected = drives.some((d) => d.letter === currentDisk.driveLetter)

        if (!isConnected) {
          setToast(`Drive ${currentDisk.driveLetter} was unexpectedly disconnected!`, 'error')
          setStep(InsertDiskPage)
          return
        }
      } catch {
        // Silently ignore network errors and try again next loop
      }
      if (isMounted) {
        timeoutId = setTimeout(pollDrive, 2500)
      }
    }

    pollDrive() // Start the loop

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [currentDisk, setStep, setToast])
}
