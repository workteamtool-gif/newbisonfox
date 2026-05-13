import { useWizardStore } from '@renderer/store/useWizardStore'
import './WelcomePage.css'
import { JSX } from 'react'
import { SetUsernamePage } from '@renderer/entites/Wizard'
import iconImg from '@renderer/images/icon.png'

export function WelcomePage(): JSX.Element {
  const setStep = useWizardStore((s) => s.setStep)

  return (
    <div className="welcome-page">
      <div className="welcome-content glass-card">
        <img src={iconImg} style={
          {
            width: '35vw',
            height: 'auto',
          }
        } alt="LightningFox" />
        <h1 className="welcome-title">lightningFox</h1>
        <p className="welcome-sub">
          ברוכים הבאים לשועל ברזל החדש! כאן ניתן להעביר קבצים מכוננים חיצוניים לתוך רשת היחידה
        </p>

        <button
          id="start-btn"
          className="btn btn-primary btn-xl"
          onClick={() => setStep(SetUsernamePage)}
        >
          ⚡ לחץ כדי להתחיל
        </button>
      </div>
    </div>
  )
}
