import { JSX } from 'react'
import { DriveInfo } from '@shared/entities/DriveInfo'

interface DriveListProps {
  drives: DriveInfo[];
  loadingDrives: boolean;
  selectedLetter: string;
  onSelectLetter: (letter: string) => void;
}

export function DriveList({ drives, loadingDrives, selectedLetter, onSelectLetter }: DriveListProps): JSX.Element {
  return (
    <div className="form-group">
      {drives.length === 0 && !loadingDrives ? (
        <div className="info-box" style={{ fontSize: '1.5rem' }}>
          ממתין לחיבור כונן...
        </div>
      ) : (
        <>
          <label
            className="form-label"
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <span>בחר כונן:</span>
            {loadingDrives && <span className="badge pulse">סורק...</span>}
          </label>
          <div className="drive-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {drives.map((drive) => (
              <div
                key={drive.letter}
                className={`drive-option ${selectedLetter === drive.letter ? 'selected' : ''} ${!drive.selectable ? 'disabled' : ''}`}
                onClick={() => drive.selectable && onSelectLetter(drive.letter)}
                style={
                  !drive.selectable ? { opacity: 0.45, cursor: 'not-allowed' } : undefined
                }
                title={drive.disabledReason || ''}
              >
                <div className="drive-icon">{drive.selectable ? '💾' : '🚫'}</div>
                <div className="drive-info">
                  <div className="drive-name">({drive.letter})</div>
                  <div className="drive-meta">
                    {drive.selectable
                      ? `${Math.round(drive.totalSize / 1024 / 1024 / 1024)}GB`
                      : drive.disabledReason || <>לא זמין</>}
                  </div>
                </div>
                {drive.selectable && <div className="drive-check">✓</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
