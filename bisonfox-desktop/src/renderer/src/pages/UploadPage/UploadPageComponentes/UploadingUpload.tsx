import React, { JSX } from 'react'
export interface UploadingUploadProps {
    showFailedReview: boolean
    uploadDone: boolean
    phaseLabel: JSX.Element
    totalDiscovered: number
    shown: number
    completedCount: number
    failedCount: number
    overallPercentage: number
    failedFilesList: { path: string; reason: string }[]
    MAX_FAILED_FILES_TO_SHOW: number
    skipFailed: () => void
    retryFailed: () => void
    loadingVideo: string
    completedBytes: number
    totalBytes: number
}

export function UploadingUpload({
    showFailedReview,
    uploadDone,
    phaseLabel,
    totalDiscovered,
    shown,
    completedCount,
    failedCount,
    overallPercentage,
    failedFilesList,
    MAX_FAILED_FILES_TO_SHOW,
    skipFailed,
    retryFailed,
    loadingVideo,
    completedBytes,
    totalBytes
}: UploadingUploadProps): React.JSX.Element {

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
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
                    <div className="stat-val" style={{ fontSize: '1.2rem', direction: 'ltr' }}>
                        {formatSize(completedBytes)} / {formatSize(totalBytes)}
                    </div>
                    <div className="stat-lbl">גודל הועתק</div>
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
                        <button className="btn" style={{ background: 'hsl(142, 71%, 45%, .8)' }} onClick={skipFailed}>
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
