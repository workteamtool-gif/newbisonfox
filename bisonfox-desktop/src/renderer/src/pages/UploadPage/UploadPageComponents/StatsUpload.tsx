import React from 'react'

export interface StatsUploadProps {
    totalDiscovered: number
    shown: number
    completedCount: number
    failedCount: number
    overallPercentage: number
    completedBytes: number
    totalBytes: number
}

export function StatsUpload({
    totalDiscovered,
    shown,
    completedCount,
    failedCount,
    overallPercentage,
    completedBytes,
    totalBytes
}: StatsUploadProps): React.JSX.Element {

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <>
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
        </>
    )
}
