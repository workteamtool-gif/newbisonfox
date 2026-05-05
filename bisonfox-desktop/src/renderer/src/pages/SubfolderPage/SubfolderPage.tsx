import { useState, useEffect } from 'react'
import { sessionApi } from '@renderer/services/sessionApi'
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
  const [loading, setLoading] = useState(false)

  const openKeyboard = useKeyboardDetection()
  const showKeyboard = openKeyboard && !isCancelModalOpen

  const validPattern = /^[a-zA-Z0-9 _-]+$/
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  function ValidateSubfolder(name: string): void {
    const trimmedName = name.trim()
    if (trimmedName && reserved.test(trimmedName)) {
      setError('שם המשתמש שבחרת הינו אסור לשימוש במערכת')
      return
    }
    if (trimmedName && !validPattern.test(trimmedName)) {
      setError('שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים וקו תחתון.')
      return
    }

    setError('')
  }

  // Signal keyboard visibility to the outer WizardLayout grid
  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')

    const trimmed = subfolder.trim()

    // Backend validation only if a subfolder is provided
    if (trimmed) {
      try {
        const result = await sessionApi.validateSubfolder(trimmed)
        if (!result.valid) {
          setError(result.message || 'שם התיקייה אינו תקין.')
          setLoading(false)
          return
        }
      } catch {
        setError('Connection error. Make sure the backend is running.')
        setLoading(false)
        return
      }
    }

    setCurrentSubfolder(trimmed)
    if (trimmed) {
      clientLogger.info('SubfolderPage', `For user: ${userName} in session: ${sessionId} specified subfolder: "${trimmed}"`)
    } else {
      clientLogger.info('SubfolderPage', `For user: ${userName} in session: ${sessionId} did not specify a subfolder`)
    }
    setStep(SelectFilesPage)
    setLoading(false)
  }

  const trimmedSubfolder = subfolder.trim()
  const destinationUserEndpoint = import.meta.env.VITE_ENDPOINT_DESTINATION_FOLDER
  const maxLength = Number(import.meta.env.VITE_SUBFOLDER_LENGTH)

  return (
    <>
      <div className="glass-card">
        <p className="page-title">תן שם לתיקיית הכונן</p>
        <p className="page-subtitle">
          המסלול לנתונים ייראה כך: <br />
          <code style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>
            {destinationUserEndpoint}\{userName}\{trimmedSubfolder}
          </code>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label className="form-label" htmlFor="subfolder-input">
              שם תת-תיקייה (אופציונלי)
            </label>
            <input
              id="subfolder-input"
              className={`form-input ${error ? 'error' : ''}`}
              type="text"
              maxLength={maxLength}
              value={subfolder}
              style={{ direction: 'ltr' }}
              onChange={(e) => {
                ValidateSubfolder(e.target.value)
                setSubfolder(e.target.value)
              }}
              autoFocus
            />
            {error && <span className="form-msg error">⚠ {error}</span>}
          </div>


          <NavigationOptions
            onBack={() => {
              clientLogger.info('SubfolderPage', `The user: ${userName} in session: ${sessionId} navigating back to InsertDiskPage`)
              setCurrentSubfolder(subfolder.trim())
              setStep(InsertDiskPage)
            }}
            forwardLabel={loading ? <><span className="spin">⟳</span> בודק...</> : <>המשך ←</>}
            forwardDisabled={loading || error !== ''}
          />
        </form>
      </div>
      {showKeyboard && (
        <VirtualKeyboard
          currentValue={subfolder}
          onChange={(newVal) => {
            setSubfolder(newVal.slice(0, maxLength))
            setError('')
          }}
        />
      )}
    </>
  )
}
