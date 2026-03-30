import React, { useState, useCallback, useEffect, useRef } from 'react'
import { FileNode } from '@shared/entities/FileNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { driveApi } from '@renderer/services/driveApi'
import { useWizardStore } from '@renderer/store/useWizardStore'
import './FileTree.css'
import { PaginationBar } from './PaginationBar'
import { formatSize } from './utils'

export interface TreeNodeProps {
  node: FileNode
  selected: Set<string>
  excluded: Set<string>
  inheritedCheck: boolean
  depth: number
  onToggleSelect: (path: string, isDir: boolean, isExcluded: boolean, isInherited: boolean) => void
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<FileNode[]>>
  autoExpandMap?: Record<string, number>
  onAutoExpand?: (map: Record<string, number>, targetPath?: string) => void
  scrollToPath?: string
  onScrolled?: () => void
}

export function TreeNode({
  node,
  selected,
  excluded,
  inheritedCheck,
  depth,
  onToggleSelect,
  onLoadChildren,
  autoExpandMap,
  onAutoExpand,
  scrollToPath,
  onScrolled
}: TreeNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [loadedChildren, setLoadedChildren] = useState<FileNode[] | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const lastAutoExpandRef = useRef<Record<string, number> | null>(null)

  const isExplicitlyChecked = selected.has(node.path)
  const isExcluded = excluded.has(node.path)
  const checked = isExplicitlyChecked || (inheritedCheck && !isExcluded)
  const canExpand = node.isDirectory && node.hasChildren !== false

  const handleExpand = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canExpand) return

      if (!expanded && loadedChildren === null) {
        setLoading(true)
        try {
          const res = await onLoadChildren(node.path, 1)
          setLoadedChildren(res.nodes)
          setPage(1)
          setHasMore(res.hasMore)
          setTotalPages(res.totalPages ?? 1)
        } finally {
          setLoading(false)
        }
      }
      setExpanded((v) => !v)
    },
    [canExpand, expanded, loadedChildren, node.path, onLoadChildren]
  )

  const handleLoadNext = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!hasMore || loading) return
      setLoading(true)
      try {
        const nextPage = page + 1
        const res = await onLoadChildren(node.path, nextPage)
        setLoadedChildren(res.nodes)
        setPage(nextPage)
        setHasMore(res.hasMore)
        setTotalPages(res.totalPages ?? 1)
      } finally {
        setLoading(false)
      }
    },
    [hasMore, loading, page, onLoadChildren, node.path]
  )

  const handleLoadPrev = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (page <= 1 || loading) return
      setLoading(true)
      try {
        const prevPage = page - 1
        const res = await onLoadChildren(node.path, prevPage)
        setLoadedChildren(res.nodes)
        setPage(prevPage)
        setHasMore(true)
        setTotalPages(res.totalPages ?? 1)
      } finally {
        setLoading(false)
      }
    },
    [page, loading, onLoadChildren, node.path]
  )

  const handleJumpToPage = useCallback(
    async (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages || targetPage === page || loading) return
      setLoading(true)
      try {
        const res = await onLoadChildren(node.path, targetPage)
        setLoadedChildren(res.nodes)
        setPage(targetPage)
        setHasMore(res.hasMore)
        setTotalPages(res.totalPages ?? 1)
      } finally {
        setLoading(false)
      }
    },
    [page, totalPages, loading, onLoadChildren, node.path]
  )

  useEffect(() => {
    if (autoExpandMap && autoExpandMap[node.path] !== undefined) {
      if (lastAutoExpandRef.current === autoExpandMap) return
      lastAutoExpandRef.current = autoExpandMap

      const targetPage = autoExpandMap[node.path]
      if (!expanded || page !== targetPage) {
        setLoading(true)
        onLoadChildren(node.path, targetPage)
          .then((res) => {
            setLoadedChildren(res.nodes)
            setPage(targetPage)
            setHasMore(res.hasMore)
            setTotalPages(res.totalPages ?? Math.max(1, targetPage))
            setExpanded(true)
            setLoading(false)
          })
          .catch(() => setLoading(false))
      }
    }
  }, [autoExpandMap, node.path, expanded, page, onLoadChildren])

  useEffect(() => {
    if (scrollToPath && node.path === scrollToPath && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlighted(true)
      if (onScrolled) onScrolled()

      const timer = setTimeout(() => setHighlighted(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [scrollToPath, node.path, onScrolled])

  const handleSearchSubmit = async (query: string): Promise<void> => {
    if (!query.trim() || loading) return
    setLoading(true)
    try {
      const targetPage = await driveApi.findItemPage(node.path, query)
      if (targetPage !== null) {
        const res = await onLoadChildren(node.path, targetPage)
        setLoadedChildren(res.nodes)
        setPage(targetPage)
        setHasMore(res.hasMore)
        setTotalPages(res.totalPages ?? Math.max(1, targetPage))
      } else {
        useWizardStore.getState().setToast('Searching subfolders… This may take a moment.', 'info')
        const deepMatch = await driveApi.deepFindItem(node.path, query)
        if (deepMatch) {
          useWizardStore
            .getState()
            .setToast(`Found at ${deepMatch.path}! Expanding folder tree…`, 'success')
          if (onAutoExpand) onAutoExpand(deepMatch.pages, deepMatch.path)
        } else {
          useWizardStore.getState().setToast('File not found in any subfolders.', 'warning')
        }
      }
    } catch {
      useWizardStore.getState().setToast('Search failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tree-node">
      <div
        ref={rowRef}
        className={`tree-row ${checked ? 'selected' : ''} ${highlighted ? 'highlighted-node' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
        onClick={() => onToggleSelect(node.path, node.isDirectory, isExcluded, inheritedCheck)}
      >
        <div className={`tree-checkbox ${checked ? 'checked' : ''}`} />

        {canExpand && (
          <span className="tree-toggle" onClick={handleExpand}>
            {loading && loadedChildren === null ? (
              <span className="spin" style={{ fontSize: '0.75rem' }}>
                ⟳
              </span>
            ) : expanded ? (
              '▾'
            ) : (
              '▸'
            )}
          </span>
        )}

        <span className="tree-icon">{node.isDirectory ? '📁' : '📄'}</span>
        <span className="tree-name" title={node.name}>
          {node.name}
        </span>
        {!node.isDirectory && <span className="tree-size">{formatSize(node.size)}</span>}
      </div>

      {node.isDirectory && expanded && loadedChildren && loadedChildren.length > 0 && (
        <div className="tree-children">
          {loadedChildren.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selected={selected}
              excluded={excluded}
              inheritedCheck={checked}
              depth={depth + 1}
              onToggleSelect={onToggleSelect}
              onLoadChildren={onLoadChildren}
              autoExpandMap={autoExpandMap}
              onAutoExpand={onAutoExpand}
              scrollToPath={scrollToPath}
              onScrolled={onScrolled}
            />
          ))}

          {(page > 1 || hasMore) && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              hasMore={hasMore}
              loading={loading}
              depth={depth}
              onLoadPrev={handleLoadPrev}
              onLoadNext={handleLoadNext}
              onSearchSubmit={handleSearchSubmit}
              onJumpToPage={handleJumpToPage}
            />
          )}
        </div>
      )}

      {node.isDirectory && expanded && loadedChildren && loadedChildren.length === 0 && (
        <div className="tree-empty" style={{ paddingLeft: `${(depth + 1) * 16 + 32}px` }}>
          Empty folder
        </div>
      )}
    </div>
  )
}
