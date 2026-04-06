import { useEffect, useState } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { DriveInfo } from '@shared/entities/DriveInfo'
import { driveApi } from '@renderer/services/driveApi'
import { SubfolderPage, SuccessPage, SetUsernamePage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { sessionApi } from '@renderer/services/sessionApi'

export function InsertDiskPage(): React.JSX.Element {
  const { setStep, setCurrentDisk, diskSessions, userName, sessionId, setSessionId } = useWizardStore()

  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState<string>('')

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

    pollDrives() // Kick off the first scan

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  const handleContinue = async (): Promise<void> => {
    const drive = drives.find((d) => d.letter === selectedLetter)
    if (!drive) return

    try {
      const { sessionId: newSessionId } = await sessionApi.createSession(userName)
      setSessionId(newSessionId)

      setCurrentDisk({
        driveLabel: drive.label || `Disk (${drive.letter})`,
        driveLetter: drive.letter,
        subfolder: '',
        selectedFiles: [],
        excludedFiles: []
      })
      clientLogger.info(
        'InsertDiskPage',
        `For user: ${userName} in session: ${newSessionId} chose drive: ${drive.label} (${drive.letter})`
      )
      setStep(SubfolderPage)
    } catch {
      clientLogger.error('InsertDiskPage', 'Failed to create session')
    }
  }

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        <div className="disk-visual">
          <div className="disk-emoji">💿</div>
          <div className="disk-arrow">↓</div>
          <div className="pc-emoji">💻</div>
        </div>

        <p className="page-title">Connect a Disk</p>
        <p className="page-subtitle">
          Please plug in your physical disk or USB drive. We&apos;ll find it for you automatically.
        </p>

        <div className="form-group">
          <label
            className="form-label"
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <span>Select Drive</span>
            {loading && <span className="badge badge-info pulse">Scanning...</span>}
          </label>

          {drives.length === 0 && !loading ? (
            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <div>Waiting for disk connection... Please plug in your drive.</div>
            </div>
          ) : (
            <div className="drive-list">
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
                      {drive.label} ({drive.letter})
                    </div>
                    <div className="drive-meta">
                      {drive.selectable
                        ? `${Math.round(drive.totalSize / 1024 / 1024 / 1024)}GB`
                        : drive.disabledReason || 'Not available'}
                    </div>
                  </div>
                  {drive.selectable && <div className="drive-check">✓</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="action-row" style={{ justifyContent: 'space-between' }}>
          {diskSessions.length > 0 ? (
            <button className="btn btn-secondary" onClick={() => {
              clientLogger.info('InsertDiskPage', `The user: ${userName} in session: ${sessionId} clicked Finish Session from drive selection.`)
              setStep(SuccessPage)
            }}>
              Finish Session
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => {
              clientLogger.info('InsertDiskPage', `The user: ${userName} in session: ${sessionId} going back to SetUsernamePage`)
              setStep(SetUsernamePage)
            }}>
              ← Back
            </button>
          )}

          <button
            className="btn btn-primary btn-lg"
            onClick={handleContinue}
            disabled={!selectedLetter}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
