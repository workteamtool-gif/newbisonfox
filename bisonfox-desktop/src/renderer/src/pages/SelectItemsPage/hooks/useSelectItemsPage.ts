import { useState, useCallback, useRef } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { ItemNode } from '@shared/entities/ItemNode'
import { driveApi } from '@renderer/services/driveApi'
import { isSubPath } from '@renderer/utils/paths'
import { SetupPage, ReviewSelectedItemsPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'

export function useSelectItemsPage() {
  const { setStep, currentDisk, setCurrentDisk, currentSubfolder } = useWizardStore()

  useDriveMonitor()

  // Synthesize a single root node for the drive — no upfront fetch needed.
  // The TreeNode component handles lazy loading of children on expand.
  const driveNode: ItemNode | null = currentDisk?.driveLetter
    ? {
        name: currentDisk.driveLetter,
        absolutePath: currentDisk.driveLetter,
        isDirectory: true,
        hasChildren: true
      }
    : null

  const tree: ItemNode[] = driveNode ? [driveNode] : []

  const [scrollToPath, setScrollToPath] = useState<string | undefined>(undefined)
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})

  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentDisk?.selectedItemPaths || [])
  )
  const [excluded, setExcluded] = useState<Set<string>>(
    new Set(currentDisk?.excludedItemPaths || [])
  )

  const [searching, setSearching] = useState(false)
  const searchGenRef = useRef(0)
  const [saving, setSaving] = useState(false)

  const handleLoadChildren = useCallback(async (dirPath: string, page: number) => {
    return driveApi.getDir(dirPath, page)
  }, [])

  const handleToggleSelect = useCallback(
    (path: string, _isDir: boolean, isExcluded: boolean, isInherited: boolean) => {
      if (isExcluded) {
        setExcluded((prev) => {
          const updatedSet = new Set(prev)
          updatedSet.delete(path)
          return updatedSet
        })
      } else if (isInherited) {
        setExcluded((prev) => new Set([...prev, path]))
      } else {
        setSelected((prev) => {
          const updatedSet = new Set(prev)
          if (updatedSet.has(path)) updatedSet.delete(path)
          else updatedSet.add(path)

          for (const sel of updatedSet) {
            if (sel !== path && isSubPath(path, sel)) {
              updatedSet.delete(sel)
            }
          }
          return updatedSet
        })

        setExcluded((prev) => {
          const updatedSet = new Set(prev)
          let changed = false
          for (const ex of updatedSet) {
            if (ex === path || isSubPath(path, ex)) {
              updatedSet.delete(ex)
              changed = true
            }
          }
          return changed ? updatedSet : prev
        })
      }
    },
    []
  )

  const handleCancelSearch = useCallback(() => {
    searchGenRef.current++
    setSearching(false)
    useWizardStore.getState().setToast('החיפוש בוטל.', 'info')
  }, [])

  const handleSearchRootSubmit = async (query: string): Promise<boolean> => {
    if (!currentDisk || !query || searching) return false

    const gen = ++searchGenRef.current
    setSearching(true)
    useWizardStore.getState().setToast(`מחפש בכונן עבור "${query}"...`, 'info')

    try {
      const deepMatch = await driveApi.deepFindItem(currentDisk.driveLetter!, query)
      if (gen !== searchGenRef.current) return false

      if (deepMatch) {
        useWizardStore.getState().setToast(`נמצא! פותח את נתיב התיקייה כעת.`, 'success')
        setAutoExpandMap(deepMatch.pages)
        setScrollToPath(deepMatch.path)
        return true
      } else {
        useWizardStore
          .getState()
          .setToast(`לא הצלחנו למצוא קובץ או תיקייה בשם זה בכונן.`, 'warning')
      }
    } catch {
      if (gen !== searchGenRef.current) return false
      useWizardStore.getState().setToast('אופס, אירעה שגיאה במהלך החיפוש.', 'error')
    } finally {
      if (gen === searchGenRef.current) {
        setSearching(false)
      }
    }
    return false
  }

  const handleContinue = async (): Promise<void> => {
    if (!currentDisk || selected.size === 0) return
    setSaving(true)
    setCurrentDisk({
      ...currentDisk,
      subfolder: currentSubfolder,
      selectedItemPaths: Array.from(selected),
      excludedItemPaths: Array.from(excluded)
    })
    setStep(ReviewSelectedItemsPage)
    setSaving(false)
  }

  const handleBack = useCallback(() => {
    clientLogger.info('SelectItemsPage', 'User navigating back to SetupPage')
    if (currentDisk) {
      setCurrentDisk({
        ...currentDisk,
        selectedItemPaths: Array.from(selected),
        excludedItemPaths: Array.from(excluded)
      })
    }
    setStep(SetupPage)
  }, [currentDisk, selected, excluded, setCurrentDisk, setStep])

  return {
    tree,
    scrollToPath,
    setScrollToPath,
    autoExpandMap,
    setAutoExpandMap,
    selected,
    excluded,
    searching,
    saving,
    currentDisk,
    handleLoadChildren,
    handleToggleSelect,
    handleCancelSearch,
    handleSearchRootSubmit,
    handleContinue,
    handleBack
  }
}
