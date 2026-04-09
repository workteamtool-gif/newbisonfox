import { useEffect } from 'react'
import { useUploadManager } from '@renderer/hooks/useUploadManager'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import loadingVideo from '@renderer/videos/uploadingvideo.mp4'
import { JSX } from 'react'
import { InsertDiskPage, ReviewPage } from '@renderer/entites/Wizard'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { clientLogger } from '@renderer/utils/logger'

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
      ? <>מכין...</>
      : phase === 'scanning'
        ? <>סורק... נמצאו {totalDiscovered.toLocaleString()} קבצים</>
        : <>מעתיק {totalDiscovered.toLocaleString()} / {doneTotal.toLocaleString()} קבצים</>

  // Show failed files review when upload is done AND there are failures
  const showFailedReview = uploadDone && failedFilesList.length > 0

  const MAX_FAILED_FILES_TO_SHOW = 20

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        {/* === SCENARIO 1: ERROR === */}
        {uploadError && (
          <>
            <p className="page-title" style={{ color: 'var(--accent-red)' }}>
              שגיאה בהעתקה
            </p>
            <div
              className="info-box"
              style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
            >
              {uploadError}
            </div>
            <div className="action-row">
              <button className="btn btn-secondary" onClick={() => setStep(ReviewPage)}>
                חזרה לבדיקה ←
              </button>
            </div>
          </>
        )
        }

        {/* === SCENARIO 2: READY === */}
        {
          !uploadError && phase === 'ready' && (
            <div style={{ textAlign: 'center' }}>
              <p className="page-title">מוכן להעתקה
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
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <span className="spin">⟳</span>
                    {preCalcTotal
                      ? ` נמצאו ${preCalcTotal.toLocaleString()} קבצים עד כה...`
                      : ' סופרים קבצים...'}
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                      {preCalcTotal?.toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      קבצים להעתקה</span>
                  </>
                )}
              </div>

              {/* <div className="action-row" style={{ justifyContent: 'center' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={startUpload}
                  disabled={!countingComplete}
                >
                  Start Copying →
                </button>
              </div> */}

              <NavigationOptions
                onBack={() => {
                  clientLogger.info('UploadPage', 'User navigating back to ReviewPage')
                  setStep(ReviewPage)
                }}
                onForward={startUpload}
                forwardDisabled={!countingComplete}
              />
            </div>
          )
        }

        {/* === SCENARIO 3: UPLOADING / DONE === */}
        {
          !uploadError && phase !== 'ready' && (
            <div style={{ height: '720px' }}>
              <p className="page-title">
                {showFailedReview
                  ? <>⚠️ חלק מהקבצים נכשלו</>
                  : uploadDone
                    ? <>✅ ההעלאה הושלמה!</>
                    : <>🚀 מעלה קבצים...</>}
              </p>

              {/* Status Video — hide during failed review */}
              {!showFailedReview && (
                <div
                  style={{
                    borderRadius: 'var(--r-lg)',
                    overflow: 'hidden',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-glass)',
                    height: '60%'
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
                      padding: '1rem 1.4rem',
                      direction: 'ltr'
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
                  <div className="stat-lbl">סה"כ קבצים</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">{completedCount.toLocaleString()}</div>
                  <div className="stat-lbl">הועתקו</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-val"
                    style={{ color: failedCount > 0 ? 'var(--accent-red)' : undefined }}
                  >
                    {failedCount > 0 ? failedCount.toLocaleString() : '—'}
                  </div>
                  <div className="stat-lbl">נכשלו</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">{overallPercentage}%</div>
                  <div className="stat-lbl">סה"כ</div>
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
                    textAlign: 'left',
                    position: 'relative'
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
                    ⚠️ לא ניתן היה להעתיק {failedCount} קבצים
                  </h4>
                  <div
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontSize: '0.82rem',
                      width: '100%'
                    }}
                  >
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {failedFilesList.slice(0, MAX_FAILED_FILES_TO_SHOW).map((f, i) => (
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
                            סיבה: {f.reason}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {failedCount > MAX_FAILED_FILES_TO_SHOW && (
                      <div
                        style={{
                          fontStyle: 'italic',
                          color: 'var(--text-secondary)',
                          marginTop: '0.3rem',
                          direction: 'rtl'
                        }}
                      >
                        ...ועוד {failedCount - MAX_FAILED_FILES_TO_SHOW} (רק {MAX_FAILED_FILES_TO_SHOW} הכשלונות הראשונים מוצגים).
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginTop: '0.75rem',
                      width: '100%',
                      justifyItems: 'flex-end',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between'
                    }}
                  >
                    <button className="btn btn-secondary" onClick={skipFailed}>
                      דלג על פריטים שנכשלו
                    </button>
                    <button className="btn btn-primary" onClick={retryFailed}>
                      🔄 נסה שוב פריטים שנכשלו
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
                  ⚠️ <strong>{failedCount.toLocaleString()} קבצים נכשלו</strong> — דולגו כדי להמשיך בהעתקה.
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
                      style={{ width: `${overallPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div >
    </div >
  )
}
