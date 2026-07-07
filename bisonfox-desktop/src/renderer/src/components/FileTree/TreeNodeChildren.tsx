import React from 'react'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { PaginationBar } from './PaginationBar'
import { TreeNode } from './TreeNode'

interface TreeNodeChildrenProps {
  children: ItemNode[]
  parentPath: string
  selected: Set<string>
  excluded: Set<string>
  parentChecked: boolean
  depth: number
  page: number
  totalPages: number
  hasMore: boolean
  loading: boolean
  countLoading: boolean
  onToggleSelect: (path: string, isDir: boolean, isExcluded: boolean, isInherited: boolean) => void
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<ItemNode[]>>
  onLoadPrev: (e: React.MouseEvent) => void
  onLoadNext: (e: React.MouseEvent) => void
  onJumpToPage: (page: number) => void
  onSearchSubmit: (query: string) => Promise<void>
  autoExpandMap?: Record<string, number>
  onAutoExpand?: (map: Record<string, number>, targetPath?: string) => void
  scrollToPath?: string
  onScrolled?: () => void
}

export function TreeNodeChildren({
  children,
  selected,
  excluded,
  parentChecked,
  depth,
  page,
  totalPages,
  hasMore,
  loading,
  countLoading,
  onToggleSelect,
  onLoadChildren,
  onLoadPrev,
  onLoadNext,
  onJumpToPage,
  onSearchSubmit,
  autoExpandMap,
  onAutoExpand,
  scrollToPath,
  onScrolled
}: TreeNodeChildrenProps): React.JSX.Element {
  return (
    <div className="tree-children">
      {children.map((child) => (
        <TreeNode
          key={child.absolutePath}
          node={child}
          selected={selected}
          excluded={excluded}
          inheritedCheck={parentChecked}
          depth={depth + 1}
          onToggleSelect={onToggleSelect}
          onLoadChildren={onLoadChildren}
          autoExpandMap={autoExpandMap}
          onAutoExpand={onAutoExpand}
          scrollToPath={scrollToPath}
          onScrolled={onScrolled}
        />
      ))}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        hasMore={hasMore}
        loading={loading}
        countLoading={countLoading}
        depth={depth}
        onLoadPrev={onLoadPrev}
        onLoadNext={onLoadNext}
        onSearchSubmit={onSearchSubmit}
        onJumpToPage={onJumpToPage}
      />
    </div>
  )
}
