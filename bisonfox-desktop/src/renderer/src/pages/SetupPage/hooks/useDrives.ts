import { useState, useEffect } from 'react'
import { driveApi } from '@renderer/services/driveApi'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { useWizardStore } from '@renderer/store/useWizardStore'

export function useDrives() {
  const { currentDisk } = useWizardStore()
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [loadingDrives, setLoadingDrives] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<string>(currentDisk?.driveLetter || '')

  useEffect(() => {
    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout>

    const pollDrives = async (): Promise<void> => {
      try {
        const drivesList = await driveApi.listDrives()
        if (!isMounted) return

        setDrives(drivesList)
        setSelectedLetter((currentSelection) => {
          if (currentSelection && !drivesList.some((d) => d.letter === currentSelection)) {
            return ''
          }
          return currentSelection
        })
      } catch {
      } finally {
        if (isMounted) {
          setLoadingDrives(false)
          timeoutId = setTimeout(pollDrives, 3000)
        }
      }
    }

    pollDrives()
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return { drives, loadingDrives, selectedLetter, setSelectedLetter }
}
