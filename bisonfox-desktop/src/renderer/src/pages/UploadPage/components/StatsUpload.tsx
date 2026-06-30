import React, { useRef, useEffect, useState } from 'react'

export interface StatsUploadProps {
  totalDiscovered: number
  shown: number
  completedCount: number
  failedCount: number
  overallPercentage: number
  completedBytes: number
  totalBytes: number
  showTotalReview: boolean
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
  totalBytes,
  showTotalReview
}: StatsUploadProps): React.JSX.Element {
  // Track when bytes first started flowing so we can derive a stable speed
  const startedAtRef = useRef<number | null>(null)
  const startCompletedCountRef = useRef<number>(0)
  const prevPercentageRef = useRef(overallPercentage)
  const [now, setNow] = useState(() => Date.now())

  // Enterprise ETA Algorithm References
  const historyRef = useRef<{ time: number; bytes: number }[]>([])
  const emaRef = useRef<number | null>(null)

  const ETA_WINDOW_MS = 3000 // 3 seconds sliding window
  const ETA_ALPHA = 0.2 // Smoothing factor for EMA

  useEffect(() => {
    if (overallPercentage === 0 && prevPercentageRef.current > 0) {
      startedAtRef.current = null
      startCompletedCountRef.current = completedCount
      historyRef.current = []
      emaRef.current = null
    }
    prevPercentageRef.current = overallPercentage
  }, [overallPercentage, completedCount])

  useEffect(() => {
    if (
      (completedBytes > 0 || completedCount > startCompletedCountRef.current) &&
      startedAtRef.current === null
    ) {
      startedAtRef.current = Date.now()
    }
  }, [completedBytes, completedCount])

  // Pass 2 (Execution): Track byte progression events
  useEffect(() => {
    const time = Date.now()
    const history = historyRef.current
    
    // Sample transfer state to prevent array flooding (e.g. every 250ms)
    if (history.length === 0 || time - history[history.length - 1].time >= 250) {
      history.push({ time, bytes: completedBytes })
      
      // Keep memory clean: drop anything older than our window + buffer
      while (history.length > 0 && time - history[0].time > ETA_WINDOW_MS + 1000) {
        history.shift()
      }
    }
  }, [completedBytes])

  // Tick every second so the ETA display stays live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const etaLabel = (() => {
    if (overallPercentage >= 100) return '✓'
    if (startedAtRef.current === null) return '—'
    
    const elapsedTotal = (now - startedAtRef.current) / 1000
    if (elapsedTotal < 2) return '—' // wait for initialization

    let rollingSpeed = 0
    
    // 1. Sliding Window (Speed Measurement)
    // Filter strictly against 'now' so if the transfer stalls (bytes stop updating), 
    // the window empties and speed mathematically drops exactly to zero.
    const validHistory = historyRef.current.filter(h => now - h.time <= ETA_WINDOW_MS)
    
    if (validHistory.length >= 2) {
      const oldest = validHistory[0]
      const newest = validHistory[validHistory.length - 1]
      const windowElapsed = (newest.time - oldest.time) / 1000
      
      if (windowElapsed > 0) {
        rollingSpeed = (newest.bytes - oldest.bytes) / windowElapsed
      }
    }

    // 2. Exponential Moving Average (UI Smoothing)
    // Formula: EMA_current = alpha * Speed_rolling + (1 - alpha) * EMA_previous
    if (emaRef.current === null) {
      emaRef.current = rollingSpeed
    } else {
      emaRef.current = ETA_ALPHA * rollingSpeed + (1 - ETA_ALPHA) * emaRef.current
    }

    const currentSpeed = emaRef.current
    const remainingBytes = Math.max(0, totalBytes - completedBytes)

    if (currentSpeed < 1024) {
      // Complete stall fallback: if speed is ~0, fallback to overall historical average
      // to prevent "Infinity" ETA or jumping to massive numbers momentarily.
      const overallSpeed = elapsedTotal > 0 ? completedBytes / elapsedTotal : 0
      if (overallSpeed > 0) {
        return formatEta(remainingBytes / overallSpeed)
      }
      return '—'
    }

    return formatEta(remainingBytes / currentSpeed)
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
      <div className={`upload-stats ${!showTotalReview ? 'upload-stats--4cols' : ''}`}>
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
          <div className="stat-val upload-stat-val-ltr">
            {formatSize(completedBytes)} / {formatSize(totalBytes)}
          </div>
          <div className="stat-lbl">גודל הועתק</div>
        </div>
        {showTotalReview && (
          <>
            <div className="stat-card">
              <div className="stat-val">{overallPercentage}%</div>
              <div className="stat-lbl">סה"כ</div>
            </div>
            <div className="stat-card">
              <div className="stat-val upload-stat-val-rtl">{etaLabel}</div>
              <div className="stat-lbl">זמן משוער לסיום</div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
