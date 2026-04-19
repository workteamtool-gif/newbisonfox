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
  failedFiles?: { path: string; reason: string }[]
  total?: number
  totalBytes?: number
  progress?: Record<string, number>
  status?: string
}
