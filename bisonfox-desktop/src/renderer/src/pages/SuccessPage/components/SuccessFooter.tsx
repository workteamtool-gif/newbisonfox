import { JSX } from 'react'

interface SuccessFooterProps {
  countdown: number;
  onReturnHome: () => void;
}

export function SuccessFooter({ countdown, onReturnHome }: SuccessFooterProps): JSX.Element {
  return (
    <div
      style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <p className="success-countdown" style={{ marginBottom: '1rem' }}>
        חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
      </p>

      <button id="back-home-btn" className="btn btn-primary btn-lg" onClick={onReturnHome}>
        ↩ לחזור הביתה כעת
      </button>
    </div>
  )
}
