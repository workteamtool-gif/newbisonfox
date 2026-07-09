import { useEffect, useState, useCallback, useRef } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { ItemNode } from '@shared/entities/ItemNode'
import { driveApi } from '@renderer/services/driveApi'
import { isSubPath } from '@renderer/utils/paths'
import { SetupPage, ReviewPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'

export function useSelectFilesPage() {
  const { setStep, currentDisk, setCurrentDisk, currentSubfolder } = useWizardStore()

  useDriveMonitor()

  const [tree, setTree] = useState<ItemNode[]>([])
  const [rootPage, setRootPage] = useState(1)
  const [rootTotalPages, setRootTotalPages] = useState(1)
  const [rootHasMore, setRootHasMore] = useState(false)

  const [scrollToPath, setScrollToPath] = useState<string | undefined>(undefined)
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})

  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentDisk?.selectedItemPaths || [])
  )
  const [excluded, setExcluded] = useState<Set<string>>(
    new Set(currentDisk?.excludedItemPaths || [])
  )

  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const searchGenRef = useRef(0)
  const [saving, setSaving] = useState(false)

  const [rootCountLoading, setRootCountLoading] = useState(false)

  useEffect(() => {
    if (!currentDisk) return

    let isMounted = true
    setLoading(true)

    const timeoutId = setTimeout(() => {
      driveApi
        .getDriveTree(currentDisk.driveLetter!, 1)
        .then((treeResponse) => {
          if (!isMounted) return
          setTree(treeResponse.nodes)
          setRootPage(1)
          setRootHasMore(treeResponse.hasMore)
          setRootTotalPages(treeResponse.totalPages ?? 1)
          setLoading(false)

          if (treeResponse.totalPages === -1) {
            setRootCountLoading(true)
            driveApi
              .getDirCount(currentDisk.driveLetter!)
              .then((count) => {
                if (!isMounted) return
                import('@renderer/services/configService').then(({ getConfig }) => {
                  getConfig().then((config) => {
                    if (!isMounted) return
                    const limit = config.itemsInOnePage || 48
                    setRootTotalPages(Math.max(1, Math.ceil(count / limit)))
                    setRootCountLoading(false)
                  })
                })
              })
              .catch(() => {
                if (!isMounted) return
                setRootTotalPages(1)
                setRootCountLoading(false)
              })
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false)
        })
    }, 50)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [currentDisk])

  const handleLoadNextRoot = useCallback(async () => {
    if (!currentDisk || !rootHasMore) return
    const nextPage = rootPage + 1
    setLoading(true)
    try {
      const treeResponse = await driveApi.getDriveTree(currentDisk.driveLetter!, nextPage)
      setTree(treeResponse.nodes)
      setRootPage(nextPage)
      setRootHasMore(treeResponse.hasMore)
      setRootTotalPages(prev => treeResponse.totalPages !== undefined && treeResponse.totalPages !== -1 ? treeResponse.totalPages : prev)
    } finally {
      setLoading(false)
    }
  }, [currentDisk, rootPage, rootHasMore])

  const handleLoadPrevRoot = useCallback(async () => {
    if (!currentDisk || rootPage <= 1) return
    const prevPage = rootPage - 1
    setLoading(true)
    try {
      const treeResponse = await driveApi.getDriveTree(currentDisk.driveLetter!, prevPage)
      setTree(treeResponse.nodes)
      setRootPage(prevPage)
      setRootHasMore(true)
      setRootTotalPages(prev => treeResponse.totalPages !== undefined && treeResponse.totalPages !== -1 ? treeResponse.totalPages : prev)
    } finally {
      setLoading(false)
    }
  }, [currentDisk, rootPage])

  const handleJumpToPage = useCallback(
    async (targetPage: number) => {
      if (!currentDisk || targetPage < 1 || targetPage > rootTotalPages || targetPage === rootPage)
        return
      setLoading(true)
      try {
        const treeResponse = await driveApi.getDriveTree(currentDisk.driveLetter!, targetPage)
        setTree(treeResponse.nodes)
        setRootPage(targetPage)
        setRootHasMore(treeResponse.hasMore)
        setRootTotalPages(prev => treeResponse.totalPages !== undefined && treeResponse.totalPages !== -1 ? treeResponse.totalPages : prev)
      } finally {
        setLoading(false)
      }
    },
    [currentDisk, rootPage, rootTotalPages]
  )

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
    setLoading(false)
    useWizardStore.getState().setToast('החיפוש בוטל.', 'info')
  }, [])

  const handleSearchRootSubmit = async (query: string): Promise<boolean> => {
    if (!currentDisk || !query || searching) return false

    const gen = ++searchGenRef.current
    setSearching(true)
    setLoading(true)
    useWizardStore.getState().setToast(`מחפש בכונן עבור "${query}"...`, 'info')

    try {
      const targetPage = await driveApi.findItemPage(currentDisk.driveLetter!, query)
      if (gen !== searchGenRef.current) return false

      if (targetPage !== null) {
        const treeResponse = await driveApi.getDriveTree(currentDisk.driveLetter!, targetPage)
        if (gen !== searchGenRef.current) return false

        setTree(treeResponse.nodes)
        setRootPage(targetPage)
        setRootHasMore(treeResponse.hasMore)
        setRootTotalPages(prev => treeResponse.totalPages !== undefined && treeResponse.totalPages !== -1 ? treeResponse.totalPages : (prev !== -1 ? prev : Math.max(1, targetPage)))

        const match = treeResponse.nodes.find((node) =>
          node.name.toLowerCase().includes(query.toLowerCase())
        )
        if (match) {
          setScrollToPath(match.absolutePath)
          useWizardStore.getState().setToast(`נמצא "${match.name}"`, 'success')
        } else {
          useWizardStore.getState().setToast(`נמצאה התאמה! מציג עמוד ${targetPage}.`, 'info')
        }
        return false
      } else {
        const deepMatch = await driveApi.deepFindItem(currentDisk.driveLetter!, query)
        if (gen !== searchGenRef.current) return false

        if (deepMatch) {
          useWizardStore.getState().setToast(`נמצא! פותח את נתיב התיקייה כעת.`, 'success')
          const expandedPages = deepMatch.pages
          const rootTargetPage = expandedPages[currentDisk.driveLetter!] || 1

          const treeResponse = await driveApi.getDriveTree(currentDisk.driveLetter!, rootTargetPage)
          if (gen !== searchGenRef.current) return false

          setTree(treeResponse.nodes)
          setRootPage(rootTargetPage)
          setRootHasMore(treeResponse.hasMore)
          setRootTotalPages(prev => treeResponse.totalPages !== undefined && treeResponse.totalPages !== -1 ? treeResponse.totalPages : (prev !== -1 ? prev : Math.max(1, rootTargetPage)))

          setAutoExpandMap(expandedPages)
          setScrollToPath(deepMatch.path)
          return true
        } else {
          useWizardStore
            .getState()
            .setToast(`לא הצלחנו למצוא קובץ או תיקייה בשם זה בכונן.`, 'warning')
        }
      }
    } catch {
      if (gen !== searchGenRef.current) return false
      useWizardStore.getState().setToast('אופס, אירעה שגיאה במהלך החיפוש.', 'error')
    } finally {
      if (gen === searchGenRef.current) {
        setSearching(false)
        setLoading(false)
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
    setStep(ReviewPage)
    setSaving(false)
  }

  const handleBack = useCallback(() => {
    clientLogger.info('SelectFilesPage', 'User navigating back to SetupPage')
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
    rootPage,
    rootTotalPages,
    rootCountLoading,
    rootHasMore,
    scrollToPath,
    setScrollToPath,
    autoExpandMap,
    setAutoExpandMap,
    selected,
    excluded,
    loading,
    searching,
    saving,
    currentDisk,
    handleLoadNextRoot,
    handleLoadPrevRoot,
    handleJumpToPage,
    handleLoadChildren,
    handleToggleSelect,
    handleCancelSearch,
    handleSearchRootSubmit,
    handleContinue,
    handleBack
  }
}
