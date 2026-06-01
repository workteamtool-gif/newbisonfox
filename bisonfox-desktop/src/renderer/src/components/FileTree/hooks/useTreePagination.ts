import { useState, useCallback, useRef } from 'react'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'

interface UseTreePaginationOptions {
  nodePath: string
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<ItemNode[]>>
}

export function useTreePagination({ nodePath, onLoadChildren }: UseTreePaginationOptions) {
  const [expanded, setExpanded] = useState(false)
  const [loadedChildren, setLoadedChildren] = useState<ItemNode[] | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastAutoExpandRef = useRef<Record<string, number> | null>(null)

  const loadPage = useCallback(
    async (targetPage: number) => {
      const res = await onLoadChildren(nodePath, targetPage)
      setLoadedChildren(res.nodes)
      setPage(targetPage)
      setHasMore(res.hasMore)
      setTotalPages(res.totalPages ?? Math.max(1, targetPage))
      return res
    },
    [nodePath, onLoadChildren]
  )

  const handleExpand = useCallback(
    async (e: React.MouseEvent, canExpand: boolean) => {
      e.stopPropagation()
      if (!canExpand) return

      if (!expanded && loadedChildren === null) {
        setLoading(true)
        try {
          await loadPage(1)
        } finally {
          setLoading(false)
        }
      }
      setExpanded((v) => !v)
    },
    [expanded, loadedChildren, loadPage]
  )

  const handleLoadNext = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!hasMore || loading) return
      setLoading(true)
      try {
        await loadPage(page + 1)
      } finally {
        setLoading(false)
      }
    },
    [hasMore, loading, page, loadPage]
  )

  const handleLoadPrev = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (page <= 1 || loading) return
      setLoading(true)
      try {
        const res = await onLoadChildren(nodePath, page - 1)
        setLoadedChildren(res.nodes)
        setPage(page - 1)
        setHasMore(true)
        setTotalPages(res.totalPages ?? 1)
      } finally {
        setLoading(false)
      }
    },
    [page, loading, nodePath, onLoadChildren]
  )

  const handleJumpToPage = useCallback(
    async (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages || targetPage === page || loading) return
      setLoading(true)
      try {
        await loadPage(targetPage)
      } finally {
        setLoading(false)
      }
    },
    [page, totalPages, loading, loadPage]
  )

  return {
    expanded,
    setExpanded,
    loadedChildren,
    setLoadedChildren,
    page,
    setPage,
    totalPages,
    setTotalPages,
    hasMore,
    setHasMore,
    loading,
    setLoading,
    lastAutoExpandRef,
    loadPage,
    handleExpand,
    handleLoadNext,
    handleLoadPrev,
    handleJumpToPage
  }
}
