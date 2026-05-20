/**
 * Represents a single file or directory node in a tree listing.
 */
export interface ItemNode {
  name: string
  /** Absolute path on disk */
  path: string
  isDirectory: boolean
  children?: ItemNode[]
  hasChildren?: boolean
  /** Item size in bytes (only for files) */
  size?: number
}
