import { JSX } from 'react'
import '@renderer/components/EasterEggs/EasterEgg/EasterEgg.css'
import easterEggImage from '@renderer/images/EasterEgg.png'

interface EasterEggProps {
  isVisible: boolean
}

export function EasterEgg({ isVisible }: EasterEggProps): JSX.Element | null {
  if (!isVisible) return null

  return (
    <div className="easter-egg-overlay">
      <div className="easter-egg-container">
        <img src={easterEggImage} alt="Easter Egg" className="easter-egg-image" />
        <p className="easter-egg-text">תחליט אם אתה יוצא או לא, השועל מאוכזב ממך...</p>
      </div>
    </div>
  )
}
