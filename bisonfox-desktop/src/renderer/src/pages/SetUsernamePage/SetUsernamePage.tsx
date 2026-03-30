import { useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { sessionApi } from '@renderer/services/sessionApi'
import './SetUsernamePage.css'
import { PREFIX_OPTIONS } from '@renderer/Constants/prefixOptions'
import { JSX } from 'react'
import { InsertDiskPage } from '@renderer/entites/Wizard'

export function SetUsernamePage(): JSX.Element {
  const { setStep, setUserName, setSessionId, reset } = useWizardStore()
  const [prefix, setPrefix] = useState(PREFIX_OPTIONS[0])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      const { sessionId } = await sessionApi.createSession(fullName)
      setUserName(fullName)
      setSessionId(sessionId)
      setStep(InsertDiskPage)
    } catch {
      setError('Connection error. Make sure the backend is running.')
    }
    setLoading(false)
  }

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        <p className="page-title">What&apos;s your username?</p>
        <p className="page-subtitle">
          Enter your username to begin. It must contain only letters and underscores (maximum 50
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
              value={name}
              onChange={(e) => {
                setName(e.target.value)
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
            <button type="button" className="btn btn-secondary" onClick={() => reset()}>
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
    </div>
  )
}
