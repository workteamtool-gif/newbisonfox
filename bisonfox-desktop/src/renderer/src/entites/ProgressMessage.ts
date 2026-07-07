import { FailedFile } from '@shared/entities/FailedFile'

export interface ProgressMessage {
  type: 'progress' | 'done' | 'error' | 'sync' | 'discovery'
  file?: string
  percent?: number
  message?: string
  count?: number
  size?: number
  completed?: number
  completedBytes?: number
  failed?: number
  failedFiles?: FailedFile[]
  total?: number
  totalBytes?: number
  progress?: Record<string, number>
  status?: string
}
