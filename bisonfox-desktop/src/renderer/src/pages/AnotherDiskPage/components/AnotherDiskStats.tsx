import { JSX } from 'react'

interface AnotherDiskStatsProps {
  diskSessionsLength: number
  totalFiles: number
}

export function AnotherDiskStats({
  diskSessionsLength,
  totalFiles
}: AnotherDiskStatsProps): JSX.Element {
  return (
    <div className="another-disk-stats full-width">
      <div className="stat-card">
        <div className="stat-icon">📤</div>
        <div className="stat-val another-disk-stat-val accent">{diskSessionsLength}</div>
        <div className="stat-lbl">העברות שבוצעו</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📄</div>
        <div className="stat-val another-disk-stat-val accent-green">
          {totalFiles.toLocaleString()}
        </div>
        <div className="stat-lbl">סה"כ קבצים שהועלו</div>
      </div>
    </div>
  )
}
