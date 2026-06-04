import { JSX } from 'react'

interface AnotherDiskChoicesProps {
  onYes: () => void
  onNo: () => void
}

export function AnotherDiskChoices({ onYes, onNo }: AnotherDiskChoicesProps): JSX.Element {
  return (
    <div className="choice-row">
      <div
        id="another-disk-yes"
        className="choice-card yes"
        onClick={onYes}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onYes()}
      >
        <span className="choice-emoji">💿</span>
        <span className="choice-label">כן, הוסף עוד כונן</span>
        <span className="choice-sub">חבר כונן נוסף כדי להמשיך</span>
      </div>

      <div
        id="another-disk-no"
        className="choice-card no"
        onClick={onNo}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onNo()}
      >
        <span className="choice-emoji">✅</span>
        <span className="choice-label">לא, סיימתי</span>
        <span className="choice-sub">עבור לעמוד הסיום</span>
      </div>
    </div>
  )
}
