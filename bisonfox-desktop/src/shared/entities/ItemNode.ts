export interface ItemNode {
  name: string
  absolutePath: string
  isDirectory: boolean
  children?: ItemNode[]
  hasChildren?: boolean
  sizeInBytes?: number
}
