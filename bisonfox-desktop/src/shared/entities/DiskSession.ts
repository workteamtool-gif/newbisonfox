import { FailedFile } from '@shared/entities/FailedFile'

export interface DiskSession {
  driveLetter: string
  subfolder?: string
  selectedItemPaths: string[]
  excludedItemPaths?: string[]
  copiedCount?: number
  failedCount?: number
  failedItems?: FailedFile[]
}
