import { JSX } from 'react'

interface AnotherDiskStatsProps {
  diskSessionsLength: number;
  totalFiles: number;
}

export function AnotherDiskStats({ diskSessionsLength, totalFiles }: AnotherDiskStatsProps): JSX.Element {
  return (
    <div className="another-disk-stats" style={{ width: '100%' }}>
      <div className="stat-card">
        <div className="stat-icon">
          📤
        </div>
        <div className="stat-val" style={{ color: 'var(--accent)' }}>
          {diskSessionsLength}
        </div>
        <div className="stat-lbl">העברות שבוצעו</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          📄
        </div>
        <div className="stat-val" style={{ color: 'var(--accent-green)' }}>
          {totalFiles.toLocaleString()}
        </div>
        <div className="stat-lbl">סה"כ קבצים שהועלו</div>
      </div>
    </div>
  )
}
