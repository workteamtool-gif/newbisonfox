/**
 * Represents a single file or directory node in a tree listing.
 */
export interface FileNode {
  name: string
  /** Absolute path on disk */
  path: string
  isDirectory: boolean
  children?: FileNode[]
  hasChildren?: boolean
  /** File size in bytes (only for files) */
  size?: number
}
