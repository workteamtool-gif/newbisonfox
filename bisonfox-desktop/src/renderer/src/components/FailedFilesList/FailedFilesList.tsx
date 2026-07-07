import React from 'react'
import { translateErrorReason } from '@renderer/utils/formatReason'
import { FailedFile } from '@shared/entities/FailedFile'

export interface FailedFilesListProps {
  failedFiles: FailedFile[]
  totalFailedCount: number
  maxToShow: number
  className?: string
}

export function FailedFilesList({
  failedFiles,
  totalFailedCount,
  maxToShow,
  className
}: FailedFilesListProps): React.JSX.Element {
  return (
    <div className={`failed-files-list-container ${className || ''}`}>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', textAlign: 'center' }}>
        {failedFiles.slice(0, maxToShow).map((failedFile, index) => (
          <li key={index} style={{ marginBottom: '2em', wordBreak: 'break-all' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{failedFile.path}</div>
            <div
              style={{
                color: 'var(--accent-red)',
                opacity: 0.85,
                fontSize: '0.85em'
              }}
            >
              סיבה: {translateErrorReason(failedFile.reason)}
            </div>
          </li>
        ))}
      </ul>
      {totalFailedCount > maxToShow && (
        <div
          style={{
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            marginTop: '0.3rem',
            direction: 'rtl',
            fontSize: '0.9em',
            textAlign: 'center'
          }}
        >
          מוצגים רק {maxToShow} הקבצים הראשונים. ישנם עוד {totalFailedCount - maxToShow} קבצים
          שנכשלו.
        </div>
      )}
    </div>
  )
}
