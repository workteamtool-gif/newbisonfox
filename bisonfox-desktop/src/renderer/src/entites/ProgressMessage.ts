export interface ProgressMessage {
  type: 'progress' | 'done' | 'error' | 'sync' | 'discovery'
  file?: string
  percent?: number
  message?: string
  count?: number
  completed?: number
  failed?: number
  failedFiles?: { path: string; reason: string }[]
  total?: number
  progress?: Record<string, number>
  status?: string
}
