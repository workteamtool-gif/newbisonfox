import { useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { sessionApi } from '@renderer/services/sessionApi'
import { clientLogger } from '@renderer/utils/logger'
import { SelectFilesPage, SuccessPage } from '@renderer/entites/Wizard'
import { createTimeFolderName } from '@renderer/utils/folderCreator'
import { DriveInfo } from '@shared/entities/DriveInfo'

export function useSetupForm(
  drives: DriveInfo[],
  selectedLetter: string
) {
  const {
    setStep,
    setUserName,
    userName,
    reset,
    setCurrentDisk,
    diskSessions,
    setSessionId,
    currentSubfolder,
    setCurrentSubfolder
  } = useWizardStore()

  const [name, setName] = useState(userName || '')
  const [nameError, setNameError] = useState('')

  const [subfolder, setSubfolder] = useState(currentSubfolder || '')
  const [subfolderError, setSubfolderError] = useState('')

  const [loading, setLoading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [activeInput, setActiveInput] = useState<'name' | 'subfolder'>('name')

  const maxNameLength = Number(import.meta.env.VITE_USERNAME_LENGTH)
  const maxSubfolderLength = Number(import.meta.env.VITE_SUBFOLDER_LENGTH)

  const validNamePattern = /^[a-zA-Z0-9_.-]+$/
  const validSubfolderPattern = /^[a-zA-Z0-9 _-]+$/
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

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
      const nameResult = await sessionApi.validateName(trimmedName)
      if (!nameResult.valid) {
        setNameError(
          'שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, נקודה, קו תחתון ומקף.'
        )
        setLoading(false)
        return
      }

      if (trimmedSubfolder) {
        const subResult = await sessionApi.validateSubfolder(trimmedSubfolder)
        if (!subResult.valid) {
          setSubfolderError(subResult.message || 'שם התיקייה אינו תקין.')
          setLoading(false)
          return
        }
      }

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
      setUserName(trimmedName)
      clientLogger.info('SetupPage', `User ${trimmedName} logged in.`)

      const { sessionId: newSessionId } = await sessionApi.createSession(trimmedName)
      setSessionId(newSessionId)

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

      setStep(SelectFilesPage)
    } catch {
      clientLogger.error('SetupPage', 'Failed to create session')
      setNameError('שגיאה ביצירת סשן, אנא נסה שוב.')
    }
    setLoading(false)
  }

  const handleVirtualKeyboardChange = (newVal: string) => {
    if (activeInput === 'name') {
      setName(newVal.slice(0, maxNameLength))
      setNameError('')
    } else {
      setSubfolder(newVal.slice(0, maxSubfolderLength))
      setSubfolderError('')
    }
  }

  const handleBack = () => {
    if (diskSessions.length > 0) {
      clientLogger.info('SetupPage', `User ${userName} clicked Finish Session.`)
      setStep(SuccessPage)
    } else {
      clientLogger.info('SetupPage', 'User clicked back, resetting data')
      reset()
    }
  }

  const isFormValid = name.trim() !== '' && selectedLetter !== '' && nameError === '' && subfolderError === ''

  return {
    name,
    setName,
    nameError,
    subfolder,
    setSubfolder,
    subfolderError,
    loading,
    isConfirmOpen,
    setIsConfirmOpen,
    activeInput,
    setActiveInput,
    maxNameLength,
    maxSubfolderLength,
    validateName,
    validateSubfolder,
    handleSubmit,
    handleConfirm,
    handleVirtualKeyboardChange,
    handleBack,
    isFormValid,
    diskSessionsLength: diskSessions.length,
    userName
  }
}
