import { DiskSession } from '@shared/entities/DiskSession'

export type WizardStep =
  | 'welcome'
  | 'set-username'
  | 'insert-disk'
  | 'subfolder'
  | 'select-files'
  | 'review'
  | 'upload'
  | 'pull-disk'
  | 'another-disk'
  | 'success'

export interface WizardData {
  step: WizardStep
  userName: string
  sessionId: string
  diskSessions: DiskSession[]
  currentDisk: DiskSession | null
  currentSubfolder: string
  uploadProgress: Record<string, number>
  uploadDone: boolean
  completedFiles: number
  toast: {
    message: string | null
    type: 'success' | 'warning' | 'error' | 'info'
  }
}

export interface WizardActions {
  setStep: (step: WizardStep) => void
  setUserName: (name: string) => void
  setSessionId: (id: string) => void
  setCurrentSubfolder: (name: string) => void
  addDiskSession: (s: DiskSession) => void
  updateLastDiskSession: (updates: Partial<DiskSession>) => void
  setCurrentDisk: (s: DiskSession | null) => void
  removeFile: (diskIndex: number, filePath: string) => void
  setUploadProgress: (progress: Record<string, number>) => void
  setUploadDone: (done: boolean) => void
  setCompletedFiles: (count: number) => void
  setToast: (msg: string | null, type?: WizardData['toast']['type']) => void
  reset: () => void
}
