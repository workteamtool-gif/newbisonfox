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
  { key: 'setup', label: 'להתחיל את ההעברה', steps: [SetUsernamePage] },
  {
    key: 'prepare',
    label: 'להכין את הקבצים',
    steps: [InsertDiskPage, SubfolderPage, SelectFilesPage, ReviewPage],
    loop: true
  },
  { key: 'transfer', label: 'להעביר את הקבצים', steps: [UploadPage], loop: true },
  { key: 'wrapup', label: 'לסיים את ההעברה', steps: [PullDiskPage, AnotherDiskPage], loop: true }
]
