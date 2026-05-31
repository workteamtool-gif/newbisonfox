import { JSX } from 'react'

interface SuccessFooterProps {
  countdown: number;
  onReturnHome: () => void;
}

export function SuccessFooter({ countdown, onReturnHome }: SuccessFooterProps): JSX.Element {
  return (
    <div className="success-footer-container">
      <p className="success-countdown">
        חוזרים למסך הבית בעוד <strong>{countdown}</strong> שניות…
      </p>

      <button id="back-home-btn" className="btn btn-primary btn-lg" onClick={onReturnHome}>
        ↩ לחזור הביתה כעת
      </button>
    </div>
  )
}
