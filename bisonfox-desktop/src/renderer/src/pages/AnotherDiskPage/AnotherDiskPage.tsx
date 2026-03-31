import { useWizardStore } from '@renderer/store/useWizardStore'
import './AnotherDiskPage.css'
import { InsertDiskPage, SuccessPage } from '@renderer/entites/Wizard'

export function AnotherDiskPage(): React.JSX.Element {
  const { setStep, diskSessions } = useWizardStore()

  function handleYes(): void {
    setStep(InsertDiskPage)
  }

  function handleNo(): void {
    setStep(SuccessPage)
  }

  const totalFiles = diskSessions.reduce(
    (acc, d) => acc + (d.copiedCount ?? d.selectedFiles.length),
    0
  )
  const failedCountTotal = diskSessions.reduce((acc, d) => acc + (d.failedCount ?? 0), 0)
  const failedFiles = diskSessions.flatMap((d) => d.failedFiles || [])

  const MAX_FAILED_FILES_TO_SHOW = 5

  return (
    <div className="wizard-layout">
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <p className="page-title">Another Disk?</p>

        <p className="page-subtitle" style={{ marginBottom: '2rem' }}>
          Awesome! You&apos;ve successfully processed the previous disk.
        </p>

        <p className="page-subtitle" style={{ marginBottom: '2rem' }}>
          Summary of all of the sessions:
        </p>

        <div className="stats-dashboard another-disk-stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              📤
            </div>
            <div className="stat-val" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>
              {diskSessions.length}
            </div>
            <div className="stat-lbl">Session{diskSessions.length !== 1 ? 's' : ''} Processed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              📄
            </div>
            <div className="stat-val" style={{ color: 'var(--accent-green)', fontSize: '1.8rem' }}>
              {totalFiles.toLocaleString()}
            </div>
            <div className="stat-lbl">Total Files Uploaded</div>
          </div>
        </div>

        {failedCountTotal > 0 && (
          <div className="info-box failed-files-box">
            <h4 className="failed-files-title">
              ⚠️ {failedCountTotal} file(s) could not be copied
            </h4>
            <div className="failed-files-list" style={{}}>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {failedFiles.slice(0, MAX_FAILED_FILES_TO_SHOW).map((f, i) => (
                  <li key={i} style={{ wordBreak: 'break-all', marginBottom: '0.4rem' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.path}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Reason: {f.reason}</div>
                  </li>
                ))}
              </ul>
              {failedCountTotal > MAX_FAILED_FILES_TO_SHOW && (
                <div style={{ marginTop: '0.3rem', fontStyle: 'italic' }}>
                  ...and {failedCountTotal - MAX_FAILED_FILES_TO_SHOW} more (Only the first {MAX_FAILED_FILES_TO_SHOW} failures are shown).
                </div>
              )}
            </div>
          </div>
        )}

        <h3 className="another-disk-question">Do you want to add another disk?</h3>

        <div className="choice-row">
          <div
            id="another-disk-yes"
            className="choice-card yes"
            onClick={handleYes}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleYes()}
          >
            <span className="choice-emoji">💿</span>
            <span className="choice-label">Yes, add another</span>
            <span className="choice-sub">Insert another disk to continue</span>
          </div>

          <div
            id="another-disk-no"
            className="choice-card no"
            onClick={handleNo}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNo()}
          >
            <span className="choice-emoji">✅</span>
            <span className="choice-label">No, I&apos;m done</span>
            <span className="choice-sub">Proceed to success page</span>
          </div>
        </div>
      </div>
    </div>
  )
}
