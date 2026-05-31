import { JSX } from 'react'

interface SuccessStatsProps {
  diskSessionsLength: number;
  totalFiles: number;
}

export function SuccessStats({ diskSessionsLength, totalFiles }: SuccessStatsProps): JSX.Element {
  return (
    <div className="success-stats-row">
      <div className="stat-card">
        <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          📤
        </div>
        <div className="stat-val" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>
          {diskSessionsLength}
        </div>
        <div className="stat-lbl">סה"כ העברות שבוצעו</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          📄
        </div>
        <div className="stat-val" style={{ color: 'var(--accent-green)', fontSize: '1.8rem' }}>
          {totalFiles.toLocaleString()}
        </div>
        <div className="stat-lbl">סה"כ קבצים שהועלו</div>
      </div>
    </div>
  )
}
