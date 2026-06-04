import React from 'react'
import { ItemNode } from '@shared/entities/ItemNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import './FileTree.css'
import { useTreeNode } from './hooks/useTreeNode'
import { TreeNodeRow } from './TreeNodeRow'
import { TreeNodeChildren } from './TreeNodeChildren'

export interface TreeNodeProps {
  node: ItemNode
  selected: Set<string>
  excluded: Set<string>
  inheritedCheck: boolean
  depth: number
  onToggleSelect: (path: string, isDir: boolean, isExcluded: boolean, isInherited: boolean) => void
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<ItemNode[]>>
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
  const {
    expanded,
    loadedChildren,
    page,
    totalPages,
    hasMore,
    loading,
    countLoading,
    highlighted,
    rowRef,
    canExpand,
    handleExpand,
    handleLoadNext,
    handleLoadPrev,
    handleJumpToPage,
    handleSearchSubmit
  } = useTreeNode({ node, onLoadChildren, autoExpandMap, onAutoExpand, scrollToPath, onScrolled })

  const isExcluded = excluded.has(node.path)
  const isExplicitlyChecked = selected.has(node.path)
  const checked = isExplicitlyChecked || (inheritedCheck && !isExcluded)

  const showChildren = node.isDirectory && expanded && loadedChildren && loadedChildren.length > 0

  return (
    <div>
      <TreeNodeRow
        node={node}
        checked={checked}
        highlighted={highlighted}
        expanded={expanded}
        loading={loading}
        loadedChildren={loadedChildren}
        canExpand={canExpand}
        depth={depth}
        isExcluded={isExcluded}
        inheritedCheck={inheritedCheck}
        rowRef={rowRef}
        onExpand={handleExpand}
        onToggleSelect={onToggleSelect}
      />

      {showChildren && (
        <TreeNodeChildren
          children={loadedChildren!}
          parentPath={node.path}
          selected={selected}
          excluded={excluded}
          parentChecked={checked}
          depth={depth}
          page={page}
          totalPages={totalPages}
          hasMore={hasMore}
          loading={loading}
          countLoading={countLoading}
          onToggleSelect={onToggleSelect}
          onLoadChildren={onLoadChildren}
          onLoadPrev={handleLoadPrev}
          onLoadNext={handleLoadNext}
          onJumpToPage={handleJumpToPage}
          onSearchSubmit={handleSearchSubmit}
          autoExpandMap={autoExpandMap}
          onAutoExpand={onAutoExpand}
          scrollToPath={scrollToPath}
          onScrolled={onScrolled}
        />
      )}

      {node.isDirectory && expanded && loadedChildren && loadedChildren.length === 0 && (
        <div className="tree-empty" style={{ paddingLeft: `${depth * 3}vh` }}>
          Empty folder
        </div>
      )}
    </div>
  )
}
