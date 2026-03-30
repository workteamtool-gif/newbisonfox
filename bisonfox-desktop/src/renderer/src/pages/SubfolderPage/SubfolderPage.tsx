import { useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { JSX } from 'react'
import { SelectFilesPage, InsertDiskPage } from '@renderer/entites/Wizard'

export function SubfolderPage(): JSX.Element {
  const { setStep, currentSubfolder, setCurrentSubfolder, currentDisk } = useWizardStore()
  useDriveMonitor()
  const [subfolder, setSubfolder] = useState(currentSubfolder)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const trimmed = subfolder.trim()
    if (trimmed && !/^[a-zA-Z0-9\s-_]+$/.test(trimmed)) {
      setError('Name can only contain letters, numbers, spaces, dashes, and underscores.')
      return
    }
    setCurrentSubfolder(trimmed)
    setStep(SelectFilesPage)
  }

  const trimmedSubfolder = subfolder.trim()

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        <p className="page-title">Name this Disk&apos;s folder</p>
        <p className="page-subtitle">
          Specify a subfolder name for the data from <strong>{currentDisk?.driveLabel}</strong>. The
          data will be uploaded to: <br />
          <code style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
            ...\{trimmedSubfolder || '<root folder>'}
          </code>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="subfolder-input">
              Subfolder Name (Optional)
            </label>
            <input
              id="subfolder-input"
              className={`form-input ${error ? 'error' : ''}`}
              type="text"
              placeholder="e.g. project_alpha"
              value={subfolder}
              onChange={(e) => {
                setSubfolder(e.target.value)
                setError('')
              }}
              autoFocus
            />
            {error && <span className="form-msg error">⚠ {error}</span>}
          </div>

          <div className="action-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(InsertDiskPage)}
            >
              ← Back
            </button>
            <button type="submit" className="btn btn-primary btn-lg">
              Next: Select Files →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
