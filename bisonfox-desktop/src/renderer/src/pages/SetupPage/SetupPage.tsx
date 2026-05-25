import { useState, useEffect } from 'react'
import { JSX } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { sessionApi } from '@renderer/services/sessionApi'
import { driveApi } from '@renderer/services/driveApi'
import { clientLogger } from '@renderer/utils/logger'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { SelectFilesPage, SuccessPage } from '@renderer/entites/Wizard'

import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { ConfirmModal } from '@renderer/components/ConfirmModal/ConfirmModal'
import { useKeyboardDetection } from '@renderer/hooks/useKeyboardDetection'
import { createTimeFolderName } from '@renderer/utils/folderCreator'

import './SetupPage.css'

export function SetupPage(): JSX.Element {
  const {
    setStep,
    setUserName,
    userName,
    reset,
    isCancelModalOpen,
    setKeyboardVisible,
    setCurrentDisk,
    currentDisk,
    diskSessions,
    setSessionId,
    currentSubfolder,
    setCurrentSubfolder
  } = useWizardStore()

  // --- Username State ---
  const [name, setName] = useState(userName || '')
  const [nameError, setNameError] = useState('')

  // --- Drive & Subfolder State ---
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [loadingDrives, setLoadingDrives] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<string>(currentDisk?.driveLetter || '')

  const [subfolder, setSubfolder] = useState(currentSubfolder || '')
  const [subfolderError, setSubfolderError] = useState('')

  // --- Global Page State ---
  const [loading, setLoading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [activeInput, setActiveInput] = useState<'name' | 'subfolder'>('name')

  const openKeyboard = useKeyboardDetection()
  const showKeyboard = openKeyboard && !isCancelModalOpen && !isConfirmOpen

  const maxNameLength = Number(import.meta.env.VITE_USERNAME_LENGTH)
  const maxSubfolderLength = Number(import.meta.env.VITE_SUBFOLDER_LENGTH)

  const validNamePattern = /^[a-zA-Z0-9_.-]+$/
  const validSubfolderPattern = /^[a-zA-Z0-9 _-]+$/
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

  // --- Keyboard Visibility ---
  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  // --- Drive Polling ---
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
        // Silently ignore scan errors
      } finally {
        if (isMounted) {
          setLoadingDrives(false)
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

  // --- Validation ---
  function validateName(val: string): boolean {
    const trimmed = val.trim()
    if (trimmed && reserved.test(trimmed)) {
      setNameError('שם המשתמש שבחרת הינו אסור לשימוש במערכת')
      return false
    }
    if (trimmed && !validNamePattern.test(trimmed)) {
      setNameError(
        'שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, נקודה, קו תחתון ומקף.'
      )
      return false
    }
    setNameError('')
    return true
  }

  function validateSubfolder(val: string): boolean {
    const trimmed = val.trim()
    if (trimmed && reserved.test(trimmed)) {
      setSubfolderError('שם התיקייה שבחרת הינו אסור לשימוש במערכת')
      return false
    }
    if (trimmed && !validSubfolderPattern.test(trimmed)) {
      setSubfolderError('שם התיקייה אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים וקו תחתון.')
      return false
    }
    setSubfolderError('')
    return true
  }

  // --- Submission Process ---
  async function handleSubmit(e?: React.FormEvent): Promise<void> {
    if (e) e.preventDefault()

    const trimmedName = name.trim()
    const trimmedSubfolder = subfolder.trim()

    if (!validateName(trimmedName) || !validateSubfolder(trimmedSubfolder)) return
    if (!selectedLetter) return

    setLoading(true)
    setNameError('')
    setSubfolderError('')

    try {
      // 1. Validate User Name via API
      const nameResult = await sessionApi.validateName(trimmedName)
      if (!nameResult.valid) {
        setNameError(
          'שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, נקודה, קו תחתון ומקף.'
        )
        setLoading(false)
        return
      }

      // 2. Validate Subfolder via API (if exists)
      if (trimmedSubfolder) {
        const subResult = await sessionApi.validateSubfolder(trimmedSubfolder)
        if (!subResult.valid) {
          setSubfolderError(subResult.message || 'שם התיקייה אינו תקין.')
          setLoading(false)
          return
        }
      }

      // 3. Open Confirmation Modal
      setIsConfirmOpen(true)
    } catch {
      setNameError('Connection error. Make sure the backend is running.')
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    setIsConfirmOpen(false)
    setLoading(true)

    const trimmedName = name.trim()
    const trimmedSubfolder = subfolder.trim()
    const drive = drives.find((d) => d.letter === selectedLetter)

    try {
      // Update User
      setUserName(trimmedName)
      clientLogger.info('SetupPage', `User ${trimmedName} logged in.`)

      // Create Session
      const { sessionId: newSessionId } = await sessionApi.createSession(trimmedName)
      setSessionId(newSessionId)

      // Set Disk & Subfolder
      if (drive) {
        setCurrentDisk({
          driveLetter: drive.letter,
          subfolder: '',
          selectedItemPaths: [],
          excludedItemPaths: []
        })
      }

      if (trimmedSubfolder === '' || trimmedSubfolder === undefined) {
        setCurrentSubfolder(createTimeFolderName())
      } else {
        setCurrentSubfolder(trimmedSubfolder)
      }

      clientLogger.info(
        'SetupPage',
        `User: ${trimmedName} | Session: ${newSessionId} | Drive: ${drive?.letter} | Subfolder: "${trimmedSubfolder}"`
      )

      // Proceed
      setStep(SelectFilesPage)
    } catch {
      clientLogger.error('SetupPage', 'Failed to create session')
      setNameError('שגיאה ביצירת סשן, אנא נסה שוב.')
    }
    setLoading(false)
  }

  // Handle Keyboard Output
  const handleVirtualKeyboardChange = (newVal: string) => {
    if (activeInput === 'name') {
      setName(newVal.slice(0, maxNameLength))
      setNameError('')
    } else {
      setSubfolder(newVal.slice(0, maxSubfolderLength))
      setSubfolderError('')
    }
  }

  const isFormValid = name.trim() && selectedLetter && !nameError && !subfolderError

  return (
    <>
      <div className="glass-card">
        <p className="page-title" style={{ marginBottom: '2rem' }}>
          הגדרת העברה
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          {/* 2-Column Grid/Flex layout */}
          <div style={{ display: 'flex', gap: '3rem', flex: 1, alignItems: 'flex-start' }}>
            {/* RIGHT SIDE (in RTL): User Name */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="name-input">
                  שם המשתמש:
                </label>
                <input
                  id="name-input"
                  className={`form-input ${nameError ? 'error' : ''}`}
                  type="text"
                  maxLength={maxNameLength}
                  value={name}
                  style={{ direction: 'ltr' }}
                  onFocus={() => setActiveInput('name')}
                  placeholder="t_lightning_fox"
                  onChange={(e) => {
                    validateName(e.target.value)
                    setName(e.target.value)
                  }}
                  autoFocus
                />
                <span
                  className="form-msg"
                  style={{
                    minHeight: '1.4em',
                    display: 'block',
                    visibility: nameError || name.length >= maxNameLength ? 'visible' : 'hidden',
                    color: nameError ? 'var(--accent-red)' : 'var(--accent-orange)'
                  }}
                >
                  ⚠{' '}
                  {nameError ||
                    (name.length >= maxNameLength
                      ? `הגעת למגבלת התווים המקסימלית (${maxNameLength} תווים).`
                      : '')}
                </span>
              </div>
            </div>

            {/* DIVIDER */}
            <div
              style={{
                width: '1px',
                background: 'rgba(255, 255, 255, 0.15)',
                height: '80%',
                alignSelf: 'center'
              }}
            />

            {/* LEFT SIDE: Drive & Subfolder */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <div className="form-group">
                {drives.length === 0 && !loadingDrives ? (
                  <div className="info-box" style={{ fontSize: '1.5rem' }}>
                    ממתין לחיבור כונן...
                  </div>
                ) : (
                  <>
                    <label
                      className="form-label"
                      style={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>בחר כונן:</span>
                      {loadingDrives && <span className="badge pulse">סורק...</span>}
                    </label>
                    <div className="drive-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {drives.map((drive) => (
                        <div
                          key={drive.letter}
                          className={`drive-option ${selectedLetter === drive.letter ? 'selected' : ''} ${!drive.selectable ? 'disabled' : ''}`}
                          onClick={() => drive.selectable && setSelectedLetter(drive.letter)}
                          style={
                            !drive.selectable ? { opacity: 0.45, cursor: 'not-allowed' } : undefined
                          }
                          title={drive.disabledReason || ''}
                        >
                          <div className="drive-icon">{drive.selectable ? '💾' : '🚫'}</div>
                          <div className="drive-info">
                            <div className="drive-name">({drive.letter})</div>
                            <div className="drive-meta">
                              {drive.selectable
                                ? `${Math.round(drive.totalSize / 1024 / 1024 / 1024)}GB`
                                : drive.disabledReason || <>לא זמין</>}
                            </div>
                          </div>
                          {drive.selectable && <div className="drive-check">✓</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subfolder-input">
                  בחר שם להעברה שלך (אופציונלי):
                </label>
                <input
                  id="subfolder-input"
                  className={`form-input ${subfolderError ? 'error' : ''}`}
                  type="text"
                  maxLength={maxSubfolderLength}
                  value={subfolder}
                  style={{ direction: 'ltr' }}
                  onFocus={() => setActiveInput('subfolder')}
                  onChange={(e) => {
                    validateSubfolder(e.target.value)
                    setSubfolder(e.target.value)
                  }}
                />
                <span
                  className="form-msg"
                  style={{
                    minHeight: '1.4em',
                    display: 'block',
                    visibility:
                      subfolderError || subfolder.length >= maxSubfolderLength
                        ? 'visible'
                        : 'hidden',
                    color: subfolderError ? 'var(--accent-red)' : 'var(--accent-orange)'
                  }}
                >
                  ⚠{' '}
                  {subfolderError ||
                    (subfolder.length >= maxSubfolderLength
                      ? `הגעת למגבלת התווים המקסימלית (${maxSubfolderLength} תווים).`
                      : '')}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ marginTop: 'auto' }}>
            <NavigationOptions
              onBack={() => {
                if (diskSessions.length > 0) {
                  clientLogger.info('SetupPage', `User ${userName} clicked Finish Session.`)
                  setStep(SuccessPage)
                } else {
                  clientLogger.info('SetupPage', 'User clicked back, resetting data')
                  reset()
                }
              }}
              backLabel={diskSessions.length > 0 ? 'סיום העברה' : '→ חזור'}
              onForward={handleSubmit}
              forwardDisabled={!isFormValid || loading}
              forwardLabel={
                loading ? (
                  <>
                    <span className="spin">⟳</span> בודק...
                  </>
                ) : (
                  <>המשך ←</>
                )
              }
            />
          </div>
        </form>
      </div>

      {showKeyboard && (
        <VirtualKeyboard
          currentValue={activeInput === 'name' ? name : subfolder}
          onChange={handleVirtualKeyboardChange}
        />
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="אישור נתונים"
        message={`האם אתה בטוח ששם המשתמש "${name.trim()}" הוא נכון?`}
        confirmText="כן, זה נכון"
        cancelText="לא, חזור לחלון הקודם"
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
