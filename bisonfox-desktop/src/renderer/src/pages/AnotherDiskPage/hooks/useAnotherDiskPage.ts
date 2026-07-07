import { useEffect, useState, useRef } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { SetupPage, SuccessPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'

export function useAnotherDiskPage() {
  const {
    setStep,
    diskSessions,
    userName,
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
      const filesSucceeded = lastSession?.copiedCount ?? 0
      const failedFilesAmount = lastSession?.failedCount ?? 0
      const totalFiles = filesSucceeded + failedFilesAmount

      window.api.invoke('log-mail', {
        userName,
        subfolder: currentSubfolder,
        filesSucceeded,
        totalFiles,
        failedFilesAmount
      })
    }

    const interval = setInterval(() => {
      setCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(interval)
          window.api.invoke('system:close')
        }
        return currentCountdown - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [reset, userName, diskSessions, currentSubfolder])

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
    clientLogger.info('AnotherDiskPage', `Finishing session and moving to SuccessPage`)
    setStep(SuccessPage)
  }

  const totalFiles = diskSessions.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedItemPaths.length),
    0
  )
  const failedCountTotal = diskSessions.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = diskSessions.flatMap((d) => d.failedItems || [])

  return {
    countdown,
    diskSessions,
    totalFiles,
    failedCountTotal,
    failedFiles,
    handleYes,
    handleNo
  }
}
