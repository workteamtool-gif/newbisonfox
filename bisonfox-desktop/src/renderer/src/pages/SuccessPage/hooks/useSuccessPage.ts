import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { getConfig } from '@renderer/services/configService'

export function useSuccessPage() {
  const { reset, username } = useWizardStore()
  const diskSessions = useWizardStore((s) => s.diskSessions)
  const [snapshot] = useState(diskSessions)
  const [countdown, setCountdown] = useState(150)

  const totalFilesAmount = snapshot.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedItemPaths.length),
    0
  )
  const failedCountTotal = snapshot.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = snapshot.flatMap((d) => d.failedItems || [])
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
    window.api.invoke('system:close')
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
