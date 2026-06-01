import { useState } from 'react'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { useTreePagination } from './useTreePagination'
import { useTreePageCount } from './useTreePageCount'
import { useTreeSearch } from './useTreeSearch'
import { useTreeScroll } from './useTreeScroll'

export interface UseTreeNodeOptions {
  node: ItemNode
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<ItemNode[]>>
  autoExpandMap?: Record<string, number>
  onAutoExpand?: (map: Record<string, number>, targetPath?: string) => void
  scrollToPath?: string
  onScrolled?: () => void
}

export function useTreeNode({
  node,
  onLoadChildren,
  autoExpandMap,
  onAutoExpand,
  scrollToPath,
  onScrolled
}: UseTreeNodeOptions) {
  const [countLoading, setCountLoading] = useState(false)

  const canExpand = node.isDirectory && node.hasChildren !== false

  const pagination = useTreePagination({ nodePath: node.path, onLoadChildren })

  useTreePageCount({
    nodePath: node.path,
    expanded: pagination.expanded,
    totalPages: pagination.totalPages,
    setTotalPages: pagination.setTotalPages,
    setCountLoading
  })

  const { handleSearchSubmit } = useTreeSearch({
    nodePath: node.path,
    loading: pagination.loading,
    expanded: pagination.expanded,
    page: pagination.page,
    onLoadChildren,
    autoExpandMap,
    onAutoExpand,
    lastAutoExpandRef: pagination.lastAutoExpandRef,
    setLoading: pagination.setLoading,
    setExpanded: pagination.setExpanded,
    loadPage: pagination.loadPage
  })

  const { highlighted, rowRef } = useTreeScroll({
    nodePath: node.path,
    scrollToPath,
    onScrolled
  })

  return {
    expanded: pagination.expanded,
    loadedChildren: pagination.loadedChildren,
    page: pagination.page,
    totalPages: pagination.totalPages,
    hasMore: pagination.hasMore,
    loading: pagination.loading,
    countLoading,
    highlighted,
    rowRef,
    canExpand,
    handleExpand: (e: React.MouseEvent) => pagination.handleExpand(e, canExpand),
    handleLoadNext: pagination.handleLoadNext,
    handleLoadPrev: pagination.handleLoadPrev,
    handleJumpToPage: pagination.handleJumpToPage,
    handleSearchSubmit
  }
}
