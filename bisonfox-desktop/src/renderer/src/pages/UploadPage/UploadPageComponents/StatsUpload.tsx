import React, { useRef, useEffect, useState } from 'react'

export interface StatsUploadProps {
    totalDiscovered: number
    shown: number
    completedCount: number
    failedCount: number
    overallPercentage: number
    completedBytes: number
    totalBytes: number
}

function formatEta(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}H ${String(m).padStart(2, '0')}M`
    if (m > 0) return `${m}M ${String(s).padStart(2, '0')}S`
    return `${s}S`
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
    // Track when bytes first started flowing so we can derive a stable speed
    const startedAtRef = useRef<number | null>(null)
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        if (completedBytes > 0 && startedAtRef.current === null) {
            startedAtRef.current = Date.now()
        }
    }, [completedBytes])

    // Tick every second so the ETA display stays live
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    const etaLabel = (() => {
        if (overallPercentage >= 100) return '✓'
        if (startedAtRef.current === null || completedBytes <= 0) return '—'
        const elapsedSec = (now - startedAtRef.current) / 1000
        if (elapsedSec < 2) return '—'          // wait a couple of seconds for a stable estimate
        const bytesPerSec = completedBytes / elapsedSec
        const remaining = totalBytes - completedBytes
        return formatEta(remaining / bytesPerSec)
    })()

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
                <div className="stat-card">
                    <div className="stat-val" style={{ fontSize: '1.25rem', direction: 'rtl' }}>
                        {etaLabel}
                    </div>
                    <div className="stat-lbl">זמן משוער לסיום</div>
                </div>
            </div>
        </>
    )
}
