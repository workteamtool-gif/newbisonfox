export const PHASES = [
  { key: 'setup', label: 'Identity', steps: ['set-username'] },
  {
    key: 'prepare',
    label: 'Prepare Data',
    steps: ['insert-disk', 'subfolder', 'select-files', 'review'],
    loop: true
  },
  { key: 'transfer', label: 'Transfer', steps: ['upload'], loop: true },
  { key: 'wrapup', label: 'Wrap Up', steps: ['pull-disk', 'another-disk'], loop: true }
]
