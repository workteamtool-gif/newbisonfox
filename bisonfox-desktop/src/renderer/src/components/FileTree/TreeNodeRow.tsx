import React from 'react'
import { ItemNode } from '@shared/entities/ItemNode'
import { formatSize } from '@renderer/utils/formatSize'

interface TreeNodeRowProps {
  node: ItemNode
  checked: boolean
  highlighted: boolean
  expanded: boolean
  loading: boolean
  loadedChildren: ItemNode[] | null
  canExpand: boolean
  depth: number
  isExcluded: boolean
  inheritedCheck: boolean
  rowRef: React.RefObject<HTMLDivElement | null>
  onExpand: (e: React.MouseEvent) => void
  onToggleSelect: (path: string, isDir: boolean, isExcluded: boolean, isInherited: boolean) => void
}

export function TreeNodeRow({
  node,
  checked,
  highlighted,
  expanded,
  loading,
  loadedChildren,
  canExpand,
  depth,
  isExcluded,
  inheritedCheck,
  rowRef,
  onExpand,
  onToggleSelect
}: TreeNodeRowProps): React.JSX.Element {
  return (
    <div
      ref={rowRef}
      className={`tree-row ${checked ? 'selected' : ''} ${highlighted ? 'highlighted-node' : ''}`}
      style={{ paddingLeft: `${depth}vh` }}
      onClick={onExpand}
    >
      <div
        className="tree-checkbox-hit-area"
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect(node.absolutePath, node.isDirectory, isExcluded, inheritedCheck)
        }}
      >
        <div className={`tree-checkbox ${checked ? 'checked' : ''}`} />
      </div>

      {canExpand && (
        <span className="tree-toggle">
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
      {!node.isDirectory && <span className="tree-size">{formatSize(node.sizeInBytes)}</span>}
    </div>
  )
}
