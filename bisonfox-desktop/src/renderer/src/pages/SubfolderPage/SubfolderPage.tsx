import { useState, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { JSX } from 'react'
import { SelectFilesPage, InsertDiskPage } from '@renderer/entites/Wizard'
import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'
import { clientLogger } from '@renderer/utils/logger'

export function SubfolderPage(): JSX.Element {
  const { setStep, currentSubfolder, setCurrentSubfolder, currentDisk, userName, sessionId, isCancelModalOpen, setKeyboardVisible } = useWizardStore()
  useDriveMonitor()
  const [subfolder, setSubfolder] = useState(currentSubfolder)
  const [error, setError] = useState('')

  const IS_TOUCHSCREEN = import.meta.env.VITE_IS_TOUCHSCREEN === 'true'
  const [openKeyboard] = useState(IS_TOUCHSCREEN)
  const showKeyboard = openKeyboard && !isCancelModalOpen

  // Signal keyboard visibility to the outer WizardLayout grid
  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const trimmed = subfolder.trim()
    if (trimmed && !/^[a-zA-Z0-9\s-_]+$/.test(trimmed)) {
      setError('Name can only contain letters, numbers, spaces, dashes, and underscores.')
      return
    }
    setCurrentSubfolder(trimmed)
    if (trimmed) {
      clientLogger.info('SubfolderPage', `For user: ${userName} in session: ${sessionId} specified subfolder: "${trimmed}"`)
    } else {
      clientLogger.info('SubfolderPage', `For user: ${userName} in session: ${sessionId} did not specify a subfolder`)
    }
    setStep(SelectFilesPage)
  }

  const trimmedSubfolder = subfolder.trim()
  const destinationUserEndpoint = import.meta.env.VITE_ENDPOINT_DESTINATION_FOLDER

  return (
    <>
      <div className="glass-card">
        <p className="page-title">Name this Disk&apos;s folder</p>
        <p className="page-subtitle">
          Specify a subfolder name for the data from <strong>{currentDisk?.driveLabel}</strong>. The
          data will be uploaded to: <br />
          <code style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
            {destinationUserEndpoint}\{userName}\{trimmedSubfolder}
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
              maxLength={20}
              value={subfolder}
              onChange={(e) => {
                setSubfolder(e.target.value.slice(0, 20))
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
              onClick={() => {
                clientLogger.info('SubfolderPage', `The user: ${userName} in session: ${sessionId} navigating back to InsertDiskPage`)
                setStep(InsertDiskPage)
              }}
            >
              ← Back
            </button>
            <button type="submit" className="btn btn-primary btn-lg">
              Next: Select Files →
            </button>
          </div>
        </form>
      </div>
      {showKeyboard && (
        <VirtualKeyboard
          currentValue={subfolder}
          onChange={(newVal) => {
            setSubfolder(newVal.slice(0, 20))
            setError('')
          }}
        />
      )}
    </>
  )
}
