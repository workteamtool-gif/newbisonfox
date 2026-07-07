import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'

export function useSuccessPage() {
  const { reset, userName } = useWizardStore()
  const diskSessions = useWizardStore((s) => s.diskSessions)
  const [snapshot] = useState(diskSessions)
  const [countdown, setCountdown] = useState(150)

  const totalFiles = snapshot.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedItemPaths.length),
    0
  )
  const failedCountTotal = snapshot.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = snapshot.flatMap((d) => d.failedItems || [])
  const [destinationUserEndpoint, setDestinationUserEndpoint] = useState('')

  useEffect(() => {
    import('@renderer/services/configService').then(({ getConfig }) => {
      getConfig().then((config) => setDestinationUserEndpoint(config.endpointDestinationFolder))
    })
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
  }, [reset, userName])

  return {
    diskSessions,
    countdown,
    totalFiles,
    failedCountTotal,
    failedFiles,
    destinationUserEndpoint,
    userName,
    handleReturnHome
  }
}
