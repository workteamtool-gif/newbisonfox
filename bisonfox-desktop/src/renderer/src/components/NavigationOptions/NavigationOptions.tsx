import React from 'react'

interface NavigationOptionsProps {
  /** Called when back button is clicked. If omitted, back button is not rendered. */
  onBack?: () => void
  /** Label for the back button. Defaults to '→ חזור' */
  backLabel?: React.ReactNode
  /** Whether the back button should be disabled */
  backDisabled?: boolean

  /** Called when forward button is clicked. If omitted, forward is a submit button. */
  onForward?: () => void
  /** Label for the forward button. Defaults to 'המשך ←' */
  forwardLabel?: React.ReactNode
  /** Whether the forward button should be disabled */
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
