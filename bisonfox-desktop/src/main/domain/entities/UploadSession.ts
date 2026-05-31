import { DiskSession } from "@shared/entities/DiskSession"

export interface UploadSession {
  id: string
  userName: string
  diskSessions: DiskSession[]
  destination: string
  progress: Record<string, number>
  status: 'pending' | 'uploading' | 'complete' | 'cancelled' | 'error'
  completedCount: number
  failedCount: number
  failedFiles: { path: string; reason: string }[]
  totalCount: number
  createdAt: Date
  lastUpdate: Date
}