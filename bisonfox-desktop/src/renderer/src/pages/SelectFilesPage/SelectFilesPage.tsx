import { useEffect, useState, useCallback, useRef } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { ItemNode } from '@shared/entities/ItemNode'
import { driveApi } from '@renderer/services/driveApi'
import { FileTree } from '@renderer/components/FileTree'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { isSubPath } from '@renderer/utils/paths'
import { JSX } from 'react'
import { InsertDiskPage, ReviewPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'

export function SelectFilesPage(): JSX.Element {
  const { setStep, currentDisk, setCurrentDisk, currentSubfolder, userName, sessionId } =
    useWizardStore()

  useDriveMonitor()

  const [tree, setTree] = useState<ItemNode[]>([])
  const [rootPage, setRootPage] = useState(1)
  const [rootTotalPages, setRootTotalPages] = useState(1)
  const [rootHasMore, setRootHasMore] = useState(false)
  const [rootSearchQuery, setRootSearchQuery] = useState('')
  const [jumpToPageInput, setJumpToPageInput] = useState('')
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

  useEffect(() => {
    if (!currentDisk) return

    let isMounted = true
    setLoading(true)

    const timeoutId = setTimeout(() => {
      driveApi
        .getDriveTree(currentDisk.driveLetter!, 1)
        .then((res) => {
          if (!isMounted) return
          setTree(res.nodes)
          setRootPage(1)
          setRootHasMore(res.hasMore)
          setRootTotalPages(res.totalPages ?? 1)
          setLoading(false)
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
      const res = await driveApi.getDriveTree(currentDisk.driveLetter!, nextPage)
      setTree(res.nodes)
      setRootPage(nextPage)
      setRootHasMore(res.hasMore)
      setRootTotalPages(res.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [currentDisk, rootPage, rootHasMore])

  const handleLoadPrevRoot = useCallback(async () => {
    if (!currentDisk || rootPage <= 1) return
    const prevPage = rootPage - 1
    setLoading(true)
    try {
      const res = await driveApi.getDriveTree(currentDisk.driveLetter!, prevPage)
      setTree(res.nodes)
      setRootPage(prevPage)
      setRootHasMore(true)
      setRootTotalPages(res.totalPages ?? 1)
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
        const res = await driveApi.getDriveTree(currentDisk.driveLetter!, targetPage)
        setTree(res.nodes)
        setRootPage(targetPage)
        setRootHasMore(res.hasMore)
        setRootTotalPages(res.totalPages ?? 1)
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

          for (const sel of n) {
            if (sel !== path && isSubPath(path, sel)) {
              n.delete(sel)
            }
          }
          return n
        })

        setExcluded((prev) => {
          const n = new Set(prev)
          let changed = false
          for (const ex of n) {
            if (ex === path || isSubPath(path, ex)) {
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

  const handleCancelSearch = useCallback(() => {
    searchGenRef.current++
    setSearching(false)
    setLoading(false)
    useWizardStore.getState().setToast('החיפוש בוטל.', 'info')
  }, [])

  const handleSearchRootSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const query = rootSearchQuery.trim()
    if (!currentDisk || !query || searching) return

    const gen = ++searchGenRef.current
    setSearching(true)
    setLoading(true)
    useWizardStore.getState().setToast(`מחפש בכונן עבור "${query}"...`, 'info')

    try {
      const targetPage = await driveApi.findItemPage(currentDisk.driveLetter!, query)
      if (gen !== searchGenRef.current) return // cancelled

      if (targetPage !== null) {
        const res = await driveApi.getDriveTree(currentDisk.driveLetter!, targetPage)
        if (gen !== searchGenRef.current) return // cancelled

        setTree(res.nodes)
        setRootPage(targetPage)
        setRootHasMore(res.hasMore)
        setRootTotalPages(res.totalPages ?? Math.max(1, targetPage))

        const match = res.nodes.find((n) => n.name.toLowerCase().includes(query.toLowerCase()))
        if (match) {
          setScrollToPath(match.path)
          useWizardStore.getState().setToast(`נמצא "${match.name}"`, 'success')
        } else {
          useWizardStore.getState().setToast(`נמצאה התאמה! מציג עמוד ${targetPage}.`, 'info')
        }
      } else {
        const deepMatch = await driveApi.deepFindItem(currentDisk.driveLetter!, query)
        if (gen !== searchGenRef.current) return // cancelled

        if (deepMatch) {
          useWizardStore.getState().setToast(`נמצא! פותח את נתיב התיקייה כעת.`, 'success')
          const expandedPages = deepMatch.pages
          const rootTargetPage = expandedPages[currentDisk.driveLetter!] || 1

          const res = await driveApi.getDriveTree(currentDisk.driveLetter!, rootTargetPage)
          if (gen !== searchGenRef.current) return // cancelled

          setTree(res.nodes)
          setRootPage(rootTargetPage)
          setRootHasMore(res.hasMore)
          setRootTotalPages(res.totalPages ?? Math.max(1, rootTargetPage))

          setAutoExpandMap(expandedPages)
          setRootSearchQuery('')
          setScrollToPath(deepMatch.path)
        } else {
          useWizardStore
            .getState()
            .setToast(`לא הצלחנו למצוא קובץ או תיקייה בשם זה בכונן.`, 'warning')
        }
      }
    } catch {
      if (gen !== searchGenRef.current) return // cancelled
      useWizardStore.getState().setToast('אופס, אירעה שגיאה במהלך החיפוש.', 'error')
    } finally {
      if (gen === searchGenRef.current) {
        setSearching(false)
        setLoading(false)
      }
    }
  }

  async function handleContinue(): Promise<void> {
    if (!currentDisk || selected.size === 0) return
    setSaving(true)
    setCurrentDisk({
      ...currentDisk,
      subfolder: currentSubfolder,
      selectedItemPaths: Array.from(selected),
      excludedItemPaths: Array.from(excluded)
    })
    const selectedArrayStr = `[${Array.from(selected).join(', ')}]`
    const excludedArrayStr = `[${Array.from(excluded).join(', ')}]`
    clientLogger.info(
      'SelectFilesPage',
      `The user: ${userName} in session: ${sessionId} is proceeding with ${selectedArrayStr} items selected, ${excludedArrayStr} exclusions`
    )
    setStep(ReviewPage)
    setSaving(false)
  }

  const selectedCount = selected.size

  return (
    <div className="glass-card">
      <p className="page-title" style={{ marginBottom: '1rem' }}>
        בחירת קבצים ותיקיות
      </p>

      <div
        className="info-box"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          direction: 'ltr'
        }}
      >
        <span>
          💿 <strong>{currentDisk!.driveLetter}</strong>
        </span>
        <span>נבחרו {selectedCount} פריטים</span>
      </div>
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-primary)',
            padding: '2rem',
            fontSize: '.9rem'
          }}
        >
          <p>
            <span className="spin">⟳</span> {searching ? 'מחפש...' : 'קורא כונן...'}
          </p>
          {searching && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem' }}
              onClick={handleCancelSearch}
            >
              ✕ ביטול חיפוש
            </button>
          )}
        </div>
      ) : (
        <>
          <FileTree
            nodes={tree}
            selected={selected}
            excluded={excluded}
            onToggleSelect={handleToggleSelect}
            onLoadChildren={handleLoadChildren}
            autoExpandMap={autoExpandMap}
            onAutoExpand={(map, targetPath) => {
              setAutoExpandMap(map)
              if (targetPath) setScrollToPath(targetPath)
            }}
            scrollToPath={scrollToPath}
            onScrolled={() => setScrollToPath(undefined)}
          />

          <div
            className="tree-pagination-bar"
            style={{ margin: '1rem 0', justifyContent: 'center', direction: 'ltr' }}
          >
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={handleLoadPrevRoot}
                disabled={rootPage <= 1 || loading}
              >
                ◀
              </button>

              <form
                className="pagination-jump-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const page = parseInt(jumpToPageInput, 10)
                  if (!isNaN(page)) {
                    handleJumpToPage(page)
                    setJumpToPageInput('')
                  }
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={rootTotalPages}
                  placeholder={String(rootPage)}
                  value={jumpToPageInput}
                  onChange={(e) => setJumpToPageInput(e.target.value)}
                  className="pagination-jump-input"
                  disabled={loading}
                />
                <span className="pagination-text">/ {rootTotalPages}</span>
              </form>

              <button
                className="pagination-btn"
                onClick={handleLoadNextRoot}
                disabled={!rootHasMore || loading}
              >
                ▶
              </button>
            </div>

            <div className="pagination-divider" />

            <form
              onSubmit={handleSearchRootSubmit}
              className="pagination-search-form"
              style={{ direction: 'ltr' }}
            >
              <input
                type="text"
                placeholder="🔍 Search file or folder..."
                value={rootSearchQuery}
                onChange={(e) => setRootSearchQuery(e.target.value)}
                className="pagination-search-input"
                disabled={loading || searching}
              />
              <button
                type="submit"
                disabled={!rootSearchQuery.trim() || loading || searching}
                className={`pagination-search-btn ${rootSearchQuery.trim() ? 'active' : ''}`}
              >
                →
              </button>
            </form>
          </div>
        </>
      )}

      <NavigationOptions
        onBack={() => {
          clientLogger.info('SelectFilesPage', 'User navigating back to InsertDiskPage')
          if (currentDisk) {
            setCurrentDisk({
              ...currentDisk,
              selectedItemPaths: Array.from(selected),
              excludedItemPaths: Array.from(excluded)
            })
          }
          setStep(InsertDiskPage)
        }}
        onForward={handleContinue}
        forwardLabel={
          saving ? (
            <>
              <span className="spin">⟳</span> שומר...
            </>
          ) : (
            <>המשך ←</>
          )
        }
        forwardDisabled={selected.size === 0 || saving}
      />
    </div>
  )
}
