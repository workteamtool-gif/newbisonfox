export interface DiskSession {
  driveLabel: string
  driveLetter?: string
  subfolder?: string
  selectedFiles: string[]
  excludedFiles?: string[]
  copiedCount?: number
  failedFiles?: string[]
}
