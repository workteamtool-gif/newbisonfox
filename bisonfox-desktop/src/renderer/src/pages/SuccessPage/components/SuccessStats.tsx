import { JSX } from 'react'

interface SuccessStatsProps {
  diskSessionsLength: number
  totalFilesAmount: number
}

export function SuccessStats({ diskSessionsLength, totalFilesAmount }: SuccessStatsProps): JSX.Element {
  return (
    <div className="success-stats-row">
      <div className="stat-card">
        <div className="stat-icon success-stat-icon">📤</div>
        <div className="stat-val success-stat-val accent">{diskSessionsLength}</div>
        <div className="stat-lbl">סה"כ העברות שבוצעו</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon success-stat-icon">📄</div>
        <div className="stat-val success-stat-val accent-green">{totalFilesAmount.toLocaleString()}</div>
        <div className="stat-lbl">סה"כ קבצים שהועלו</div>
      </div>
    </div>
  )
}
