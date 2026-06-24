import { useState, useCallback, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { ItemNode } from '@shared/entities/ItemNode'
import { driveApi } from '@renderer/services/driveApi'
import { uploadApi } from '@renderer/services/uploadApi'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { UploadPage, SetupPage, SelectFilesPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'

export function useReviewPage() {
  const { currentDisk, setCurrentDisk, sessionId, setStep, addDiskSession, userName } =
    useWizardStore()

  useDriveMonitor()

  const [nodes, setNodes] = useState<ItemNode[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})
  const [scrollToPath, setScrollToPath] = useState<string | undefined>()

  useEffect(() => {
    if (!currentDisk) return

    setSelected(new Set(currentDisk.selectedItemPaths))
    setExcluded(new Set(currentDisk.excludedItemPaths ?? []))

    const initialNodes = currentDisk.selectedItemPaths.map((fp) => {
      const name = fp.split(/[/\\]/).pop() ?? fp
      const isFileLike = name.includes('.')
      return {
        name: `${name}   (${fp})`,
        path: fp,
        isDirectory: !isFileLike,
        hasChildren: !isFileLike
      }
    })
    setNodes(initialNodes)
  }, [currentDisk])

  const handleLoadChildren = useCallback(async (dirPath: string, page: number) => {
    return driveApi.getDir(dirPath, page)
  }, [])

  const handleToggleSelect = useCallback(
    (path: string, _isDir: boolean, isExcluded: boolean, isInherited: boolean) => {
      if (isExcluded) {
        setExcluded((prev) => {
          const n = new Set(prev)
          n.delete(path)
          return n
        })
      } else if (isInherited) {
        setExcluded((prev) => new Set([...prev, path]))
      } else {
        setSelected((prev) => {
          const n = new Set(prev)
          if (n.has(path)) n.delete(path)
          else n.add(path)

          const prefixWindows = path + '\\'
          const prefixPosix = path + '/'
          for (const sel of n) {
            if (sel !== path && (sel.startsWith(prefixWindows) || sel.startsWith(prefixPosix))) {
              n.delete(sel)
            }
          }
          return n
        })

        setExcluded((prev) => {
          const n = new Set(prev)
          let changed = false
          const prefixWindows = path + '\\'
          const prefixPosix = path + '/'
          for (const ex of n) {
            if (ex === path || ex.startsWith(prefixWindows) || ex.startsWith(prefixPosix)) {
              n.delete(ex)
              changed = true
            }
          }
          return changed ? n : prev
        })
      }
    },
    []
  )

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
      clientLogger.info(
        'ReviewPage',
        `Starting upload of ${finalDisk.selectedItemPaths} files`
      )

      setStep(UploadPage)
    } catch (err: any) {
      setSyncError(err.message || 'אבד החיבור לשרת')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = useCallback(() => {
    clientLogger.info(
      'ReviewPage',
      `Returning to file selection`
    )
    if (currentDisk) {
      setCurrentDisk({
        ...currentDisk,
        selectedItemPaths: Array.from(selected),
        excludedItemPaths: Array.from(excluded)
      })
    }
    setStep(SelectFilesPage)
  }, [currentDisk, selected, excluded, setCurrentDisk, setStep, userName, sessionId])

  useEffect(() => {
    if (!currentDisk) {
      clientLogger.warn(
        'ReviewPage',
        `No current disk found, navigating back to SetupPage`
      )
      setStep(SetupPage)
    }
  }, [currentDisk, setStep, userName, sessionId])

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
