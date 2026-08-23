import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { getConfig } from '@renderer/services/configService'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

export function useFinalPage() {
  const { reset, username } = useWizardStore()
  const diskSessions = useWizardStore((s) => s.diskSessions)
  const [snapshot] = useState(diskSessions)
  const [countdown, setCountdown] = useState(150)

  const totalFilesAmount = snapshot.reduce(
    (accumulator, diskSession) =>
      accumulator + (diskSession.copiedCount ?? diskSession.selectedItemPaths.length),
    0
  )
  const failedCountTotal = snapshot.reduce(
    (accumulator, diskSession) => accumulator + (diskSession.failedCount ?? 0),
    0
  )
  const failedFiles = snapshot.flatMap((diskSession) => diskSession.failedItems || [])
  const [destinationUserEndpoint, setDestinationUserEndpoint] = useState('')

  useEffect(() => {
    let mounted = true
    getConfig()
      .then((config) => {
        if (mounted) setDestinationUserEndpoint(config.endpointDestinationFolder)
      })
      .catch((err) => console.error('Failed to load config for success page', err))

    return () => {
      mounted = false
    }
  }, [])

  const handleReturnHome = (): void => {
    window.api.invoke(IPC_CHANNELS.SYSTEM.CLOSE)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(interval)
          handleReturnHome()
        }
        return currentCountdown - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [reset, username])

  return {
    diskSessions,
    countdown,
    totalFilesAmount,
    failedCountTotal,
    failedFiles,
    destinationUserEndpoint,
    username,
    handleReturnHome
  }
}
