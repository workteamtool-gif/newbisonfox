import { useEffect, useState, useCallback } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { FileNode } from '@shared/entities/FileNode'
import { driveApi } from '@renderer/services/driveApi'
import { FileTree } from '@renderer/components/FileTree'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { isSubPath } from '@renderer/utils/paths'
import { JSX } from 'react'
import { InsertDiskPage, ReviewPage } from '@renderer/entites/Wizard'

export function SelectFilesPage(): JSX.Element {
  const { setStep, currentDisk, setCurrentDisk, currentSubfolder } = useWizardStore()

  useDriveMonitor()

  const [tree, setTree] = useState<FileNode[]>([])
  const [rootPage, setRootPage] = useState(1)
  const [rootTotalPages, setRootTotalPages] = useState(1)
  const [rootHasMore, setRootHasMore] = useState(false)
  const [rootSearchQuery, setRootSearchQuery] = useState('')
  const [jumpToPageInput, setJumpToPageInput] = useState('')
  const [scrollToPath, setScrollToPath] = useState<string | undefined>(undefined)
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!currentDisk) return

    let isMounted = true
    setLoading(true)

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

    return () => {
      isMounted = false
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
        const res = await driveApi.getDriveTree(
          currentDisk.driveLetter!,
          targetPage
        )
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

  const handleSearchRootSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!currentDisk || !rootSearchQuery.trim() || loading) return
    setLoading(true)
    try {
      const targetPage = await driveApi.findItemPage(currentDisk.driveLetter!, rootSearchQuery)
      if (targetPage !== null) {
        const res = await driveApi.getDriveTree(
          currentDisk.driveLetter!,
          targetPage
        )
        setTree(res.nodes)
        setRootPage(targetPage)
        setRootHasMore(res.hasMore)
        setRootTotalPages(res.totalPages ?? Math.max(1, targetPage))
      } else {
        useWizardStore
          .getState()
          .setToast('Searching entire drive… This may take a moment.', 'info')
        const deepMatch = await driveApi.deepFindItem(currentDisk.driveLetter!, rootSearchQuery)
        if (deepMatch) {
          useWizardStore
            .getState()
            .setToast(`Found at ${deepMatch.path}! Expanding folder tree`, 'success')
          const expandedPages = deepMatch.pages
          const rootTargetPage = expandedPages[currentDisk.driveLetter!] || 1

          const res = await driveApi.getDriveTree(
            currentDisk.driveLetter!,
            rootTargetPage
          )
          setTree(res.nodes)
          setRootPage(rootTargetPage)
          setRootHasMore(res.hasMore)
          setRootTotalPages(res.totalPages ?? Math.max(1, rootTargetPage))

          setAutoExpandMap(expandedPages)
          setRootSearchQuery('')
          setScrollToPath(deepMatch.path)
        } else {
          useWizardStore.getState().setToast(`File not found anywhere on this drive.`, 'warning')
        }
      }
    } catch {
      useWizardStore.getState().setToast('Search failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleContinue(): Promise<void> {
    if (!currentDisk || selected.size === 0) return
    setSaving(true)
    setCurrentDisk({
      ...currentDisk,
      subfolder: currentSubfolder,
      selectedFiles: Array.from(selected),
      excludedFiles: Array.from(excluded)
    })
    setStep(ReviewPage)
    setSaving(false)
  }

  const selectedCount = selected.size

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        <p className="page-title">Select Files &amp; Folders</p>
        <p className="page-subtitle">
          Choose what to copy from <strong>{currentDisk?.driveLabel}</strong>. Check items below —
          selecting a folder includes all its contents on upload.
        </p>

        <div className="info-box">
          <span className="info-icon">ℹ️</span>
          <span>
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        {loading ? (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '2rem',
              fontSize: '.9rem'
            }}
          >
            <span className="spin">⟳</span> Reading drive…
          </p>
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

            {(rootPage > 1 || rootHasMore) && (
              <div
                className="tree-pagination-bar"
                style={{ margin: '1rem 0', justifyContent: 'center' }}
              >
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={handleLoadPrevRoot}
                  disabled={rootPage <= 1 || loading}
                >
                  Previous
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
                  <span className="pagination-text">Page </span>
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
                  <span className="pagination-text"> of {rootTotalPages}</span>
                </form>

                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={handleLoadNextRoot}
                  disabled={!rootHasMore || loading}
                >
                  Next
                </button>

                <form onSubmit={handleSearchRootSubmit} className="pagination-search-form">
                  <input
                    type="text"
                    placeholder="Jump to file..."
                    value={rootSearchQuery}
                    onChange={(e) => setRootSearchQuery(e.target.value)}
                    className="pagination-search-input"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!rootSearchQuery.trim() || loading}
                    className={`pagination-search-btn ${rootSearchQuery.trim() ? 'active' : ''}`}
                  >
                    🔍
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        <div className="action-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep(InsertDiskPage)}
          >
            ← Back
          </button>
          <button
            id="select-continue-btn"
            className="btn btn-primary btn-lg"
            disabled={selected.size === 0 || saving}
            onClick={handleContinue}
          >
            {saving ? (
              <>
                <span className="spin">⟳</span> Saving…
              </>
            ) : (
              'Continue →'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
