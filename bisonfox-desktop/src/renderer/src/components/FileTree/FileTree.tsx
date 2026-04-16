import { FileNode } from '@shared/entities/FileNode'
import { PaginatedResult } from '@shared/entities/PaginatedResult'
import { TreeNode } from './TreeNode'
import './FileTree.css'
import { JSX } from 'react'

export interface FileTreeProps {
  nodes: FileNode[]
  selected: Set<string>
  excluded: Set<string>
  onToggleSelect: (path: string, isDir: boolean, isExcluded: boolean, isInherited: boolean) => void
  onLoadChildren: (path: string, page: number) => Promise<PaginatedResult<FileNode[]>>
  autoExpandMap?: Record<string, number>
  onAutoExpand?: (map: Record<string, number>, targetPath?: string) => void
  scrollToPath?: string
  onScrolled?: () => void
}

export function FileTree({
  nodes,
  selected,
  excluded,
  onToggleSelect,
  onLoadChildren,
  autoExpandMap,
  onAutoExpand,
  scrollToPath,
  onScrolled
}: FileTreeProps): JSX.Element {
  return (
    <div className="file-tree">
      {nodes.length === 0 ? (
        <div className="no-files-found">No files found on this drive.</div>
      ) : (
        nodes.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            selected={selected}
            excluded={excluded}
            inheritedCheck={false}
            depth={0}
            onToggleSelect={onToggleSelect}
            onLoadChildren={onLoadChildren}
            autoExpandMap={autoExpandMap}
            onAutoExpand={onAutoExpand}
            scrollToPath={scrollToPath}
            onScrolled={onScrolled}
          />
        ))
      )}
    </div>
  )
}
