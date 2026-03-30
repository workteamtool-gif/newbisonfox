export interface ProgressMessage {
  type: 'progress' | 'done' | 'error' | 'sync' | 'discovery'
  file?: string
  percent?: number
  message?: string
  count?: number
  completed?: number
  failed?: number
  failedFiles?: string[]
  total?: number
  progress?: Record<string, number>
  status?: string
}
