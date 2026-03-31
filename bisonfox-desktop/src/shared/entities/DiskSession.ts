export interface DiskSession {
  driveLabel: string
  driveLetter?: string
  subfolder?: string
  selectedFiles: string[]
  excludedFiles?: string[]
  copiedCount?: number
  failedCount?: number
  failedFiles?: { path: string; reason: string }[]
}
