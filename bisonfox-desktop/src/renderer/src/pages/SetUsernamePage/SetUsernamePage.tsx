import { useState, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { sessionApi } from '@renderer/services/sessionApi'
import { clientLogger } from '@renderer/utils/logger'
import './SetUsernamePage.css'
import { PREFIX_OPTIONS } from '@renderer/Constants/prefixOptions'
import { JSX } from 'react'
import { InsertDiskPage } from '@renderer/entites/Wizard'
import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { useKeyboardDetection } from '@renderer/hooks/useKeyboardDetection'

export function SetUsernamePage(): JSX.Element {
  const { setStep, setUserName, reset, isCancelModalOpen, setKeyboardVisible, userName } = useWizardStore()

  const existingPrefix = PREFIX_OPTIONS.find(p => userName.startsWith(p.value)) || PREFIX_OPTIONS[0]

  const [name, setName] = useState(userName.startsWith(existingPrefix.value) ? userName.slice(existingPrefix.value.length) : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const openKeyboard = useKeyboardDetection()
  const showKeyboard = openKeyboard && !isCancelModalOpen

  const maxLength = Number(import.meta.env.VITE_USERNAME_LENGTH)
  const validPattern = /^[a-zA-Z0-9_.-]+$/
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  const fullName = name.trim()

  function ValidateName(name: string): void {
    const trimmedName = name.trim()
    if (trimmedName && reserved.test(trimmedName)) {
      setError('שם המשתמש שבחרת הינו אסור לשימוש במערכת')
      return
    }
    if (trimmedName && !validPattern.test(trimmedName)) {
      setError('שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, קו תחתון ומקף.')
      return
    }
    setError('')
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await sessionApi.validateName(fullName)
      if (!result.valid) {
        setError('שם המשתמש אינו תקין. עליו להכיל רק אותיות באנגלית, מספרים, קו תחתון ומקף.')
        setLoading(false)
        return
      }
      setUserName(fullName)
      clientLogger.info('SetUsernamePage', `User ${fullName} logged in.`)
      setStep(InsertDiskPage)
    } catch {
      setError('Connection error. Make sure the backend is running.')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="glass-card">
        <p className="page-title">מה שם המשתמש שלך?</p>

        <form onSubmit={handleSubmit}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name-input">
                שם:
              </label>
              <input
                id="name-input"
                className={`form-input ${error ? 'error' : ''}`}
                type="text"
                maxLength={maxLength}
                value={name}
                style={{ direction: 'ltr' }}
                onChange={(e) => {
                  ValidateName(e.target.value)
                  setName(e.target.value)
                }}
                autoFocus
              />
              <span className="form-msg error" style={{ minHeight: '1.4em', display: 'block', visibility: error ? 'visible' : 'hidden' }}>
                ⚠ {error}
              </span>
            </div>
          </div>

          <NavigationOptions
            onBack={() => {
              clientLogger.info('SetUsernamePage', 'User clicked back button, resetting data')
              reset()
            }}
            forwardLabel={loading ? <><span className="spin">⟳</span> בודק...</> : <>המשך ←</>}
            forwardDisabled={loading || !name.trim()}
          />
        </form>
      </div>

      {showKeyboard && (
        <VirtualKeyboard
          currentValue={name}
          onChange={(newVal) => {
            setName(newVal.slice(0, maxLength))
            setError('')
          }}
        />
      )}
    </>
  )
}