import { useEffect, useState, useRef } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { SetupPage, FinalPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

export function useAnotherDiskPage() {
  const {
    setStep,
    diskSessions,
    username,
    reset,
    setCurrentDisk,
    setCurrentSubfolder,
    currentSubfolder
  } = useWizardStore()
  const [countdown, setCountdown] = useState(150)
  const mailLogged = useRef(false)

  useEffect(() => {
    if (!mailLogged.current) {
      mailLogged.current = true
      const lastSession = diskSessions[diskSessions.length - 1]
      const succeededFilesAmount = lastSession?.copiedCount ?? 0
      const failedFilesAmount = lastSession?.failedCount ?? 0
      const totalFilesAmount = succeededFilesAmount + failedFilesAmount

      window.api.invoke(IPC_CHANNELS.UPLOAD.LOG_MAIL, {
        username,
        subfolder: currentSubfolder,
        succeededFilesAmount,
        totalFilesAmount,
        failedFilesAmount
      })
    }

    const interval = setInterval(() => {
      setCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(interval)
          window.api.invoke(IPC_CHANNELS.SYSTEM.CLOSE)
        }
        return currentCountdown - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [reset, username, diskSessions, currentSubfolder])

  function handleYes(): void {
    clientLogger.info(
      'AnotherDiskPage',
      `Adding another disk,
       finishing the disk session and moving to SetupPage`
    )
    setCurrentDisk(null)
    setCurrentSubfolder('')
    setStep(SetupPage)
  }

  function handleNo(): void {
    clientLogger.info('AnotherDiskPage', `Finishing session and moving to FinalPage`)
    setStep(FinalPage)
  }

  const totalFilesAmount = diskSessions.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedItemPaths.length),
    0
  )
  const failedCountTotal = diskSessions.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = diskSessions.flatMap((d) => d.failedItems || [])

  return {
    countdown,
    diskSessions,
    totalFilesAmount,
    failedCountTotal,
    failedFiles,
    handleYes,
    handleNo
  }
}
