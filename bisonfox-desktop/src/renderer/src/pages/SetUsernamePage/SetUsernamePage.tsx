import { useState, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { sessionApi } from '@renderer/services/sessionApi'
import { clientLogger } from '@renderer/utils/logger'
import './SetUsernamePage.css'
import { PREFIX_OPTIONS } from '@renderer/Constants/prefixOptions'
import { JSX } from 'react'
import { InsertDiskPage } from '@renderer/entites/Wizard'
import { VirtualKeyboard } from '@renderer/components/VirtualKeyboard/VirtualKeyboard'

export function SetUsernamePage(): JSX.Element {
  const { setStep, setUserName, reset, isCancelModalOpen, setKeyboardVisible } = useWizardStore()
  const [prefix, setPrefix] = useState(PREFIX_OPTIONS[0])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const IS_TOUCHSCREEN = import.meta.env.VITE_IS_TOUCHSCREEN === 'true'
  const [openKeyboard] = useState(IS_TOUCHSCREEN)
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
        setError(result.message ?? 'Invalid name.')
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
        <p className="page-title">What&apos;s your username?</p>
        <p className="page-subtitle">
          Enter your username to begin. It must contain only letters and underscores (maximum 20
          characters).
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Prefix</label>
            <div className="prefix-chips">
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
              Name
            </label>
            <input
              id="name-input"
              className={`form-input ${error ? 'error' : ''}`}
              type="text"
              placeholder="e.g. bison"
              maxLength={20}
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 20))
                setError('')
              }}
              autoFocus
            />
            {error && <span className="form-msg error">⚠ {error}</span>}
          </div>

          {name.trim() && (
            <div className="username-preview">
              Final username: <strong>{fullName}</strong>
            </div>
          )}

          <div className="action-row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={() => {
              clientLogger.info('SetUsernamePage', 'User clicked back button, resetting data')
              reset()
            }}>
              ← Back
            </button>
            <button
              type="submit"
              id="name-submit-btn"
              className="btn btn-primary btn-lg"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <span className="spin">⟳</span> Validating…
                </>
              ) : (
                'Continue →'
              )}
            </button>
          </div>
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