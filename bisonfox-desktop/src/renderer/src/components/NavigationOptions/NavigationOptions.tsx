import React from 'react'

interface NavigationOptionsProps {
  onBack?: () => void
  backLabel?: React.ReactNode
  backDisabled?: boolean

  onForward?: () => void
  forwardLabel?: React.ReactNode
  forwardDisabled?: boolean
}

export function NavigationOptions({
  onBack,
  backLabel = '→ חזור',
  backDisabled = false,
  onForward,
  forwardLabel = 'המשך ←',
  forwardDisabled = false
}: NavigationOptionsProps): React.JSX.Element {
  return (
    <div className="action-row" style={{ justifyContent: 'space-between' }}>
      {onBack ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={backDisabled}
        >
          {backLabel}
        </button>
      ) : (
        // placeholder to keep forward button on the right
        <span />
      )}

      {onForward ? (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onForward}
          disabled={forwardDisabled}
        >
          {forwardLabel}
        </button>
      ) : (
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={forwardDisabled}
        >
          {forwardLabel}
        </button>
      )}
    </div>
  )
}
