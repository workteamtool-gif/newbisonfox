import {
  InsertDiskPage,
  SelectFilesPage,
  SubfolderPage,
  ReviewPage,
  UploadPage,
  PullDiskPage,
  AnotherDiskPage,
  SetUsernamePage,
  WizardStep
} from '@renderer/entites/Wizard'

export interface Phase {
  key: string
  label: string
  steps: WizardStep[]
  loop?: boolean
}

export const PHASES: Phase[] = [
  { key: 'setup', label: 'Identity', steps: [SetUsernamePage] },
  {
    key: 'prepare',
    label: 'Prepare Data',
    steps: [InsertDiskPage, SubfolderPage, SelectFilesPage, ReviewPage],
    loop: true
  },
  { key: 'transfer', label: 'Transfer', steps: [UploadPage], loop: true },
  { key: 'wrapup', label: 'Wrap Up', steps: [PullDiskPage, AnotherDiskPage], loop: true }
]
