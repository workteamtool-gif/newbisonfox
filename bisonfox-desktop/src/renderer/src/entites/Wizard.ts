import { DiskSession } from '@shared/entities/DiskSession'
import React from 'react'

export const WelcomePage = React.lazy(() =>
  import('@renderer/pages/WelcomePage/WelcomePage').then((m) => ({ default: m.WelcomePage }))
)
export const SetupPage = React.lazy(() =>
  import('@renderer/pages/SetupPage/SetupPage').then((m) => ({
    default: m.SetupPage
  }))
)
export const SelectItemsPage = React.lazy(() =>
  import('@renderer/pages/SelectItemsPage/SelectItemsPage').then((m) => ({
    default: m.SelectItemsPage
  }))
)
export const ReviewSelectedItemsPage = React.lazy(() =>
  import('@renderer/pages/ReviewSelectedItemsPage/ReviewSelectedItemsPage').then((m) => ({ default: m.ReviewSelectedItemsPage }))
)
export const UploadPage = React.lazy(() =>
  import('@renderer/pages/UploadPage/UploadPage').then((m) => ({ default: m.UploadPage }))
)
export const AnotherDiskPage = React.lazy(() =>
  import('@renderer/pages/AnotherDiskPage/AnotherDiskPage').then((m) => ({
    default: m.AnotherDiskPage
  }))
)
export const FinalPage = React.lazy(() =>
  import('@renderer/pages/FinalPage/FinalPage').then((m) => ({ default: m.FinalPage }))
)

export type WizardStep =
  | typeof WelcomePage
  | typeof SetupPage
  | typeof SelectItemsPage
  | typeof ReviewSelectedItemsPage
  | typeof UploadPage
  | typeof AnotherDiskPage
  | typeof FinalPage

export interface WizardData {
  step: React.LazyExoticComponent<() => React.JSX.Element | null>
  username: string
  sessionId: string
  diskSessions: DiskSession[]
  currentDisk: DiskSession | null
  currentSubfolder: string
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
  setUploadDone: (done: boolean) => void
  setCompletedFiles: (count: number) => void
  setToast: (msg: string | null, type?: WizardData['toast']['type']) => void
  reset: () => void
  setCancelModalOpen: (open: boolean) => void
  setKeyboardVisible: (visible: boolean) => void
}
