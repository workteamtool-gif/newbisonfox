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
  
  const [prefix, setPrefix] = useState(existingPrefix)
  const [name, setName] = useState(userName.startsWith(existingPrefix.value) ? userName.slice(existingPrefix.value.length) : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const openKeyboard = useKeyboardDetection()
  const showKeyboard = openKeyboard && !isCancelModalOpen

  useEffect(() => {
    setKeyboardVisible(showKeyboard)
    return () => setKeyboardVisible(false)
  }, [showKeyboard, setKeyboardVisible])

  const fullName = prefix.value + name.trim()

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await sessionApi.validateName(fullName)
      if (!result.valid) {
        setError('שם המשתמש אינו תקין. הוא חייב לכלול עד 20 תווים (אותיות באנגלית, מספרים וקו תחתון בלבד)')
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
        <p className="page-subtitle">
          הזן שם משתמש כדי להתחיל. עליו להכיל רק אותיות, מספרים וקווים תחתונים (מקסימום 20 תווים).
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '2vh' }}>קידומת:</label>
            <div className="prefix-chips" style={{ direction: 'ltr' }}>
              {PREFIX_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`prefix-chip ${prefix.value === opt.value ? 'active' : ''}`}
                  onClick={() => setPrefix(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name-input">
              שם
            </label>
            <input
              id="name-input"
              className={`form-input ${error ? 'error' : ''}`}
              type="text"
              placeholder="For example: bison"
              maxLength={20}
              value={name}
              style={{ direction: 'ltr' }}
              onChange={(e) => {
                setName(e.target.value.slice(0, 20))
                setError('')
              }}
              autoFocus
            />
            {error && <span className="form-msg error">⚠ {error}</span>}
          </div>

          {name.trim() && (<>
            <div style={{ margin: '1vh' }}> שם המשתמש הסופי: </div>
            <div className="username-preview" style={{ direction: 'ltr' }}>
              <strong>{fullName}</strong>
            </div></>
          )}

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
            setName(newVal.slice(0, 20))
            setError('')
          }}
        />
      )}
    </>
  )
}