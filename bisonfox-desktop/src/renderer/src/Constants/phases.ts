import {
  SelectItemsPage,
  ReviewSelectedItemsPage,
  UploadPage,
  AnotherDiskPage,
  SetupPage,
  WizardStep
} from '@renderer/entites/Wizard'

interface PhaseGroup {
  key: string
  label: string
  steps: WizardStep[]
}

export const PHASE_GROUPS: PhaseGroup[] = [
  { key: 'setup', label: 'הכנה להעברה', steps: [SetupPage] },
  { key: 'select', label: 'בחירת קבצים', steps: [SelectItemsPage] },
  { key: 'review', label: 'אישור קבצים', steps: [ReviewSelectedItemsPage] },
  { key: 'upload', label: 'העברה', steps: [UploadPage] },
  { key: 'finish', label: 'סיום', steps: [AnotherDiskPage] }
]
