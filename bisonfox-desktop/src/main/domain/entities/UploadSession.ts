import { DiskSession } from '@shared/entities/DiskSession'
import { FailedFile } from '@shared/entities/FailedFile'

export interface UploadSession {
  id: string
  username: string
  diskSessions: DiskSession[]
  destination: string
  progress: Record<string, number>
  status: 'pending' | 'uploading' | 'complete' | 'cancelled' | 'error'
  completedCount: number
  failedCount: number
  failedFiles: FailedFile[]
  totalCount: number
  createdAt: Date
  lastUpdate: Date
}
