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
  step: WizardStep
  loop?: boolean
}

export const PHASES: Phase[] = [
  { key: 'setName', label: 'להגדיר את השם', step: SetUsernamePage },
  { key: 'insertDisk', label: 'להכניס את הדיסק', step: InsertDiskPage },
  { key: 'subfolder', label: 'לבחור תת-תיקייה', step: SubfolderPage },
  { key: 'selectFiles', label: 'לבחור קבצים', step: SelectFilesPage },
  { key: 'review', label: 'לוודא בחירת קבצים', step: ReviewPage },
  { key: 'upload', label: 'להעביר את הקבצים', step: UploadPage, loop: true },
  { key: 'pullDisk', label: 'להוציא את הדיסק', step: PullDiskPage, loop: true },
  { key: 'anotherDisk', label: 'להכניס דיסק נוסף', step: AnotherDiskPage, loop: true }
]
