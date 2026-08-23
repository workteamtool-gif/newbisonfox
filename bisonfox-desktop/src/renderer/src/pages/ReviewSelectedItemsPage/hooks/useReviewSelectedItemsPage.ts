import { useState, useCallback, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { ItemNode } from '@shared/entities/ItemNode'
import { driveApi } from '@renderer/services/driveApi'
import { uploadApi } from '@renderer/services/uploadApi'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { UploadPage, SetupPage, SelectItemsPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { useTreeSelection } from '@renderer/hooks/useTreeSelection'

export function useReviewSelectedItemsPage() {
  const { currentDisk, setCurrentDisk, sessionId, setStep, addDiskSession, username } =
    useWizardStore()

  useDriveMonitor()

  const [nodes, setNodes] = useState<ItemNode[]>([])
  const { selected, setSelected, excluded, setExcluded, handleToggleSelect } = useTreeSelection()

  const [saving, setSaving] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})
  const [scrollToPath, setScrollToPath] = useState<string | undefined>()

  useEffect(() => {
    if (!currentDisk) return

    setSelected(new Set(currentDisk.selectedItemPaths))
    setExcluded(new Set(currentDisk.excludedItemPaths ?? []))

    const initialNodes = currentDisk.selectedItemPaths.map((absolutePath) => {
      const name = absolutePath.split(/[/\\]/).pop() ?? absolutePath
      const isFileLike = name.includes('.')
      return {
        name: `${name}   (${absolutePath})`,
        absolutePath: absolutePath,
        isDirectory: !isFileLike,
        hasChildren: !isFileLike
      }
    })
    setNodes(initialNodes)
  }, [currentDisk])

  const handleLoadChildren = useCallback(async (dirPath: string, page: number) => {
    return driveApi.getDir(dirPath, page)
  }, [])

  async function handleStartUpload(): Promise<void | null> {
    if (!currentDisk) return
    setSaving(true)
    setSyncError(null)

    const finalDisk = {
      ...currentDisk,
      selectedItemPaths: Array.from(selected),
      excludedItemPaths: Array.from(excluded)
    }

    try {
      await uploadApi.addDiskFiles(
        sessionId,
        currentDisk.driveLetter,
        finalDisk.selectedItemPaths,
        finalDisk.excludedItemPaths
      )

      setCurrentDisk(finalDisk)
      addDiskSession(finalDisk)
      clientLogger.info('ReviewSelectedItemsPage', `Starting upload of ${finalDisk.selectedItemPaths} files`)

      setStep(UploadPage)
    } catch (err: unknown) {
      setSyncError((err instanceof Error ? err.message : String(err)) || 'אבד החיבור לשרת')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    clientLogger.info('ReviewSelectedItemsPage', `Returning to file selection`)
    if (currentDisk) {
      setCurrentDisk({
        ...currentDisk,
        selectedItemPaths: Array.from(selected),
        excludedItemPaths: Array.from(excluded)
      })
    }
    setStep(SelectItemsPage)
  }, [currentDisk, selected, excluded, setCurrentDisk, setStep, username, sessionId])

  useEffect(() => {
    if (!currentDisk) {
      clientLogger.warn('ReviewSelectedItemsPage', `No current disk found, navigating back to SetupPage`)
      setStep(SetupPage)
    }
  }, [currentDisk, setStep, username, sessionId])

  return {
    nodes,
    selected,
    excluded,
    saving,
    syncError,
    autoExpandMap,
    setAutoExpandMap,
    scrollToPath,
    setScrollToPath,
    currentDisk,
    handleLoadChildren,
    handleToggleSelect,
    handleStartUpload,
    handleBack
  }
}
