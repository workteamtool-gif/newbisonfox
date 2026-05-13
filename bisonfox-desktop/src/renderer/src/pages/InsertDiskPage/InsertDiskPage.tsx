import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { driveApi } from '@renderer/services/driveApi'
import { SelectFilesPage, SuccessPage, SetUsernamePage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { sessionApi } from '@renderer/services/sessionApi'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'
import { useKeyboardDetection } from '@renderer/hooks/useKeyboardDetection'

export function InsertDiskPage(): React.JSX.Element {
  const {
    setStep,
    setCurrentDisk,
    currentDisk,
    diskSessions,
    userName,
    sessionId,
    setSessionId,
    currentSubfolder,
    setCurrentSubfolder,
    isCancelModalOpen,
    setKeyboardVisible
  } = useWizardStore()

  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<string>(currentDisk?.driveLetter || '')

  // Subfolder state
  const [subfolder, setSubfolder] = useState(currentSubfolder)
  const [subfolderError, setSubfolderError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openKeyboard = useKeyboardDetection()
  const showKeyboard = openKeyboard && !isCancelModalOpen

  const validPattern = /^[a-zA-Z0-9 _-]+$/
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

  // Signal keyboard visibility to the outer WizardLayout grid
  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  useEffect(() => {
    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout>

    const pollDrives = async (): Promise<void> => {
      try {
        const data = await driveApi.listDrives()
        if (!isMounted) return

        setDrives(data)

        setSelectedLetter((currentSelection) => {
          if (currentSelection && !data.some((d) => d.letter === currentSelection)) {
            return ''
          }
          return currentSelection
        })
      } catch {
        // Silently ignore scan errors during polling
      } finally {
        if (isMounted) {
          setLoading(false)
          timeoutId = setTimeout(pollDrives, 3000)
        }
      }
    }

    pollDrives()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  function validateSubfolder(name: string): boolean {
    const trimmedName = name.trim()
    if (trimmedName && reserved.test(trimmedName)) {
      setSubfolderError('שם המשתמש שבחרת הינו אסור לשימוש במערכת')
      return false
    }
    if (trimmedName && !validPattern.test(trimmedName)) {
      setSubfolderError('שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים וקו תחתון.')
      return false
    }
    setSubfolderError('')
    return true
  }

  const maxLength = Number(import.meta.env.VITE_SUBFOLDER_LENGTH)

  const handleContinue = async (): Promise<void> => {
    const drive = drives.find((d) => d.letter === selectedLetter)
    if (!drive) return

    setSubmitting(true)
    setSubfolderError('')

    const trimmed = subfolder.trim()

    // Backend subfolder validation only if a subfolder is provided
    if (trimmed) {
      try {
        const result = await sessionApi.validateSubfolder(trimmed)
        if (!result.valid) {
          setSubfolderError(result.message || 'שם התיקייה אינו תקין.')
          setSubmitting(false)
          return
        }
      } catch {
        setSubfolderError('Connection error. Make sure the backend is running.')
        setSubmitting(false)
        return
      }
    }

    try {
      const { sessionId: newSessionId } = await sessionApi.createSession(userName)
      setSessionId(newSessionId)

      setCurrentDisk({
        driveLetter: drive.letter,
        subfolder: '',
        selectedFiles: [],
        excludedFiles: []
      })

      setCurrentSubfolder(trimmed)

      if (trimmed) {
        clientLogger.info(
          'InsertDiskPage',
          `For user: ${userName} in session: ${newSessionId} chose drive: ${drive.letter} with subfolder: "${trimmed}"`
        )
      } else {
        clientLogger.info(
          'InsertDiskPage',
          `For user: ${userName} in session: ${newSessionId} chose drive: ${drive.letter} without subfolder`
        )
      }

      setStep(SelectFilesPage)
    } catch {
      clientLogger.error('InsertDiskPage', 'Failed to create session')
    }

    setSubmitting(false)
  }

  return (
    <>
      <div className="glass-card">

        <p className="page-title" style={{ marginBottom: '1rem' }}>חבר כונן חיצוני</p>
        <div className="form-group" style={{ gap: '1rem' }}>

          {drives.length === 0 && !loading ? (
            <div className="info-box" style={{ fontSize: '2rem' }}>
              ממתין לחיבור כונן...
            </div>
          ) : (<>
            <label
              className="form-label"
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span>בחר כונן:</span>
              {loading && <span className="badge badge-info pulse">סורק...</span>}
            </label>          <div className="drive-list">
              {drives.map((drive) => (
                <div
                  key={drive.letter}
                  className={`drive-option ${selectedLetter === drive.letter ? 'selected' : ''} ${!drive.selectable ? 'disabled' : ''}`}
                  onClick={() => drive.selectable && setSelectedLetter(drive.letter)}
                  style={!drive.selectable ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                  title={drive.disabledReason || ''}
                >
                  <div className="drive-icon">{drive.selectable ? '💾' : '🚫'}</div>
                  <div className="drive-info">
                    <div className="drive-name">
                      ({drive.letter})
                    </div>
                    <div className="drive-meta">
                      {drive.selectable
                        ? `${Math.round(drive.totalSize / 1024 / 1024 / 1024)}GB`
                        : drive.disabledReason || <>לא זמין</>}
                    </div>
                  </div>
                  {drive.selectable && <div className="drive-check">✓</div>}
                </div>
              ))}
            </div></>
          )}
        </div>

        {/* Subfolder section — merged from SubfolderPage */}
        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <label className="form-label" htmlFor="subfolder-input">
            בחר שם להעברה שלך (אופציונלי)
          </label>
          <input
            id="subfolder-input"
            className={`form-input ${subfolderError ? 'error' : ''}`}
            type="text"
            maxLength={maxLength}
            value={subfolder}
            style={{ direction: 'ltr' }}
            onChange={(e) => {
              validateSubfolder(e.target.value)
              setSubfolder(e.target.value)
            }}
          />
          <span className="form-msg error" style={{ minHeight: '1.4em', display: 'block', visibility: subfolderError ? 'visible' : 'hidden' }}>
            ⚠ {subfolderError}
          </span>
        </div>

        <NavigationOptions
          onBack={() => {
            if (diskSessions.length > 0) {
              clientLogger.info('InsertDiskPage', `The user: ${userName} in session: ${sessionId} clicked Finish Session from drive selection.`)
              setStep(SuccessPage)
            } else {
              clientLogger.info('InsertDiskPage', `The user: ${userName} in session: ${sessionId} going back to SetUsernamePage`)
              setStep(SetUsernamePage)
            }
          }}
          backLabel={diskSessions.length > 0 ? 'סיום העברה' : '→ חזור'}
          onForward={handleContinue}
          forwardDisabled={!selectedLetter || submitting || subfolderError !== ''}
          forwardLabel={submitting ? <><span className="spin">⟳</span> בודק...</> : <>המשך ←</>}
        />
      </div>
      {showKeyboard && (
        <VirtualKeyboard
          currentValue={subfolder}
          onChange={(newVal) => {
            setSubfolder(newVal.slice(0, maxLength))
            setSubfolderError('')
          }}
        />
      )}
    </>
  )
}
