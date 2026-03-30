import { useEffect } from 'react'
import { useUploadManager } from '@renderer/hooks/useUploadManager'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import loadingVideo from '@renderer/videos/uploadingvideo.mp4'
import { JSX } from 'react'
import { InsertDiskPage, ReviewPage } from '@renderer/entites/Wizard'

export function UploadPage(): JSX.Element | null {
  const {
    phase,
    uploadError,
    uploadDone,
    preCalcTotal,
    countingComplete,
    totalDiscovered,
    completedCount,
    failedCount,
    overallPercentage,
    currentDisk,
    failedFilesList,
    startUpload,
    retryFailed,
    skipFailed,
    setStep
  } = useUploadManager()

  useDriveMonitor()

  useEffect(() => {
    if (!currentDisk) setStep(InsertDiskPage)
  }, [currentDisk, setStep])

  if (!currentDisk) return null

  const shown = totalDiscovered || preCalcTotal || currentDisk.selectedFiles.length
  const doneTotal = completedCount + failedCount

  const phaseLabel =
    phase === 'preparing'
      ? 'Preparing…'
      : phase === 'scanning'
        ? `Scanning… ${totalDiscovered.toLocaleString()} files found`
        : `Copying ${doneTotal.toLocaleString()} / ${totalDiscovered.toLocaleString()} files`

  // Show failed files review when upload is done AND there are failures
  const showFailedReview = uploadDone && failedFilesList.length > 0

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        {/* === SCENARIO 1: ERROR === */}
        {uploadError && (
          <>
            <p className="page-title" style={{ color: 'var(--accent-red)' }}>
              Upload Error
            </p>
            <div
              className="info-box"
              style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
            >
              {uploadError}
            </div>
            <div className="action-row">
              <button className="btn btn-secondary" onClick={() => setStep(ReviewPage)}>
                ← Back to Review
              </button>
            </div>
          </>
        )}

        {/* === SCENARIO 2: READY === */}
        {!uploadError && phase === 'ready' && (
          <div style={{ textAlign: 'center' }}>
            <p className="page-title">Ready to Copy</p>
            <p className="page-subtitle">
              You&apos;re about to copy files from <strong>{currentDisk.driveLabel}</strong>.
            </p>

            <div
              className="info-box"
              style={{
                margin: '2rem 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</span>
              {!countingComplete ? (
                <span style={{ color: 'var(--text-muted)' }}>
                  <span className="spin">⟳</span>
                  {preCalcTotal
                    ? ` Found ${preCalcTotal.toLocaleString()} files so far...`
                    : ' Counting total files...'}
                </span>
              ) : (
                <>
                  <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {preCalcTotal?.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>Files to be copied</span>
                </>
              )}
            </div>

            <div className="action-row" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={startUpload}
                disabled={!countingComplete}
              >
                Start Copying →
              </button>
            </div>
          </div>
        )}

        {/* === SCENARIO 3: UPLOADING / DONE === */}
        {!uploadError && phase !== 'ready' && (
          <>
            <p className="page-title">
              {showFailedReview
                ? '⚠️ Some Files Failed'
                : uploadDone
                  ? '✅ Upload Complete!'
                  : '🚀 Uploading Files…'}
            </p>
            <p className="page-subtitle">
              {showFailedReview
                ? `${completedCount.toLocaleString()} files were copied successfully, but ${failedFilesList.length} file(s) could not be copied.`
                : uploadDone
                  ? `Uploaded ${completedCount.toLocaleString()} files to ${currentDisk.subfolder}`
                  : `Copying files from ${currentDisk.driveLabel} to ${currentDisk.subfolder}`}
            </p>

            {/* Status Video — hide during failed review */}
            {!showFailedReview && (
              <div
                style={{
                  borderRadius: 'var(--r-lg)',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  position: 'relative',
                  height: '160px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <video
                  src={loadingVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    filter: 'brightness(0.8) contrast(1.1)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(6,12,32,0.9) 0%, transparent 60%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '1rem 1.4rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    <span
                      className="spin"
                      style={{
                        display: 'inline-block',
                        marginRight: '10px',
                        color: 'var(--accent-cyan)'
                      }}
                    >
                      ⟳
                    </span>
                    {phaseLabel}
                  </span>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="upload-stats">
              <div className="stat-card">
                <div className="stat-val">
                  {totalDiscovered > 0 ? totalDiscovered.toLocaleString() : shown}
                </div>
                <div className="stat-lbl">Total Files</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{completedCount.toLocaleString()}</div>
                <div className="stat-lbl">Copied</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-val"
                  style={{ color: failedCount > 0 ? 'var(--accent-red)' : undefined }}
                >
                  {failedCount > 0 ? failedCount.toLocaleString() : '—'}
                </div>
                <div className="stat-lbl">Failed</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{overallPercentage}%</div>
                <div className="stat-lbl">Overall</div>
              </div>
            </div>

            {/* Failed files review panel */}
            {showFailedReview && (
              <div
                className="info-box"
                style={{
                  borderColor: 'var(--accent-red)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left'
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--accent-red)'
                  }}
                >
                  ⚠️ {failedFilesList.length} file(s) could not be copied
                </h4>
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    fontSize: '0.82rem',
                    width: '100%'
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                    {failedFilesList.slice(0, 20).map((f, i) => (
                      <li key={i} style={{ marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {f.path}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--accent-red)',
                            opacity: 0.85
                          }}
                        >
                          {f.reason}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {failedFilesList.length > 20 && (
                    <div
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--text-muted)',
                        marginTop: '0.3rem'
                      }}
                    >
                      …and {failedFilesList.length - 20} more.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                    justifyContent: 'flex-end',
                    width: '100%'
                  }}
                >
                  <button className="btn btn-secondary" onClick={skipFailed}>
                    Skip Failed Items →
                  </button>
                  <button className="btn btn-primary" onClick={retryFailed}>
                    🔄 Retry Failed Items
                  </button>
                </div>
              </div>
            )}

            {/* Failure notice during active copy */}
            {!showFailedReview && failedCount > 0 && (
              <div
                className="info-box"
                style={{
                  borderColor: 'var(--accent-red)',
                  color: 'var(--accent-red)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem'
                }}
              >
                ⚠️ <strong>{failedCount.toLocaleString()} file(s) failed</strong> — skipped to keep
                the copy running.
              </div>
            )}

            {/* Overall progress bar — hide during failed review */}
            {!showFailedReview && (
              <div className="progress-item" style={{ marginBottom: '1.4rem' }}>
                <div className="progress-header">
                  <span
                    className="progress-name"
                    style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    {phaseLabel}
                  </span>
                  <span className="progress-pct">{overallPercentage}%</span>
                </div>
                <div className="progress-track" style={{ height: '10px' }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${overallPercentage}%`, transition: 'width 0.3s ease' }}
                  />
                </div>
              </div>
            )}

            {uploadDone && !showFailedReview && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '1.5rem',
                  color: 'var(--text-muted)',
                  fontSize: '.85rem'
                }}
              >
                Finalizing session…
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
