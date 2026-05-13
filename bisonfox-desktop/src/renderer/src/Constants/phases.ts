import {
  InsertDiskPage,
  SelectFilesPage,
  ReviewPage,
  UploadPage,
  AnotherDiskPage,
  SetUsernamePage,
  WizardStep
} from '@renderer/entites/Wizard'

export interface Phase {
  key: string
  label: string
  step: WizardStep
  loop?: boolean
}

export const PHASES: Phase[] = [
  { key: 'setName', label: 'להגדיר את השם', step: SetUsernamePage },
  { key: 'insertDisk', label: 'להכניס את הדיסק', step: InsertDiskPage },
  { key: 'selectFiles', label: 'לבחור קבצים', step: SelectFilesPage },
  { key: 'review', label: 'לוודא בחירת קבצים', step: ReviewPage },
  { key: 'upload', label: 'להעביר את הקבצים', step: UploadPage, loop: true },
  { key: 'anotherDisk', label: 'להכניס דיסק נוסף', step: AnotherDiskPage, loop: true }
]

export interface PhaseGroup {
  key: string
  label: string
  steps: WizardStep[]
}

export const PHASE_GROUPS: PhaseGroup[] = [
  { key: 'identify', label: 'הזדהות', steps: [SetUsernamePage] },
  { key: 'setup', label: 'הכנה להעברה', steps: [InsertDiskPage] },
  { key: 'select', label: 'בחירת קבצים', steps: [SelectFilesPage, ReviewPage] },
  { key: 'upload', label: 'העברה', steps: [UploadPage] },
  { key: 'finish', label: 'סיום', steps: [AnotherDiskPage] }
]
