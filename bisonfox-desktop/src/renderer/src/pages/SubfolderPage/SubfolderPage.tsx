import { useState, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { JSX } from 'react'
import { SelectFilesPage, InsertDiskPage } from '@renderer/entites/Wizard'
import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'
import { clientLogger } from '@renderer/utils/logger'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { useKeyboardDetection } from '@renderer/hooks/useKeyboardDetection'

export function SubfolderPage(): JSX.Element {
  const { setStep, currentSubfolder, setCurrentSubfolder, userName, sessionId, isCancelModalOpen, setKeyboardVisible } = useWizardStore()
  useDriveMonitor()
  const [subfolder, setSubfolder] = useState(currentSubfolder)
  const [error, setError] = useState('')

  const openKeyboard = useKeyboardDetection()
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
      setError('השם יכול להכיל רק אותיות, מספרים, רווחים, מקפים וקווים תחתונים.')
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
        <p className="page-title">תן שם לתיקיית הכונן</p>
        <p className="page-subtitle">
          המסלול לנתונים ייראה כך: <br />
          <code style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
            {destinationUserEndpoint}\{userName}\{trimmedSubfolder}
          </code>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="subfolder-input">
              שם תת-תיקייה (אופציונלי)
            </label>
            <input
              id="subfolder-input"
              className={`form-input ${error ? 'error' : ''}`}
              type="text"
              placeholder="For example: project_alpha"
              maxLength={20}
              value={subfolder}
              style={{ direction: 'ltr' }}
              onChange={(e) => {
                setSubfolder(e.target.value.slice(0, 20))
                setError('')
              }}
              autoFocus
            />
            {error && <span className="form-msg error">⚠ {error}</span>}
          </div>


          <NavigationOptions
            onBack={() => {
              clientLogger.info('SubfolderPage', `The user: ${userName} in session: ${sessionId} navigating back to InsertDiskPage`)
              setStep(InsertDiskPage)
            }}
          />
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
