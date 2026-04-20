import React, { JSX } from 'react'
import { FailedItemsUpload } from './FailedItemsUpload'
import { StatsUpload } from './StatsUpload'
import { VideoUpload } from './VideoUpload'
export interface UploadComponentProps {
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
    retryAll: () => void
    loadingVideo: string
    completedBytes: number
    totalBytes: number
}

export function UploadComponent({
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
    retryAll,
    loadingVideo,
    completedBytes,
    totalBytes
}: UploadComponentProps): React.JSX.Element {
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
                <VideoUpload
                    loadingVideo={loadingVideo}
                    phaseLabel={phaseLabel}
                />
            )}

            {/* Stats row */}
            <StatsUpload
                totalDiscovered={totalDiscovered}
                shown={shown}
                completedCount={completedCount}
                failedCount={failedCount}
                overallPercentage={overallPercentage}
                completedBytes={completedBytes}
                totalBytes={totalBytes}
            />

            {/* Failed files review panel */}
            {showFailedReview && (
                <FailedItemsUpload
                    failedCount={failedCount}
                    failedFilesList={failedFilesList}
                    MAX_FAILED_FILES_TO_SHOW={MAX_FAILED_FILES_TO_SHOW}
                    skipFailed={skipFailed}
                    retryFailed={retryFailed}
                    retryAll={retryAll}
                />
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
