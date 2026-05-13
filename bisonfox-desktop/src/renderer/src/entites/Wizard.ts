import { DiskSession } from '@shared/entities/DiskSession'
import React from 'react'

export const WelcomePage = React.lazy(() =>
  import('@renderer/pages/WelcomePage/WelcomePage').then((m) => ({ default: m.WelcomePage }))
)
export const SetUsernamePage = React.lazy(() =>
  import('@renderer/pages/SetUsernamePage/SetUsernamePage').then((m) => ({
    default: m.SetUsernamePage
  }))
)
export const InsertDiskPage = React.lazy(() =>
  import('@renderer/pages/InsertDiskPage/InsertDiskPage').then((m) => ({
    default: m.InsertDiskPage
  }))
)
export const SubfolderPage = React.lazy(() =>
  import('@renderer/pages/SubfolderPage/SubfolderPage').then((m) => ({ default: m.SubfolderPage }))
)
export const SelectFilesPage = React.lazy(() =>
  import('@renderer/pages/SelectFilesPage/SelectFilesPage').then((m) => ({
    default: m.SelectFilesPage
  }))
)
export const ReviewPage = React.lazy(() =>
  import('@renderer/pages/ReviewPage/ReviewPage').then((m) => ({ default: m.ReviewPage }))
)
export const UploadPage = React.lazy(() =>
  import('@renderer/pages/UploadPage/UploadPage').then((m) => ({ default: m.UploadPage }))
)
export const AnotherDiskPage = React.lazy(() =>
  import('@renderer/pages/AnotherDiskPage/AnotherDiskPage').then((m) => ({
    default: m.AnotherDiskPage
  }))
)
export const SuccessPage = React.lazy(() =>
  import('@renderer/pages/SuccessPage/SuccessPage').then((m) => ({ default: m.SuccessPage }))
)

export type WizardStep =
  | typeof WelcomePage
  | typeof SetUsernamePage
  | typeof InsertDiskPage
  | typeof SubfolderPage
  | typeof SelectFilesPage
  | typeof ReviewPage
  | typeof UploadPage
  | typeof AnotherDiskPage
  | typeof SuccessPage

export interface WizardData {
  step: React.LazyExoticComponent<() => React.JSX.Element | null>
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
  isCancelModalOpen: boolean
  isKeyboardVisible: boolean
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
  setCancelModalOpen: (open: boolean) => void
  setKeyboardVisible: (visible: boolean) => void
}
