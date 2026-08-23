import { JSX } from 'react'
import '@renderer/components/EasterEggs/EasterEgg/EasterEgg.css'
import '@renderer/components/EasterEggs/EasterEgg2/EasterEgg2.css'
import easterEggImage from '@renderer/images/EasterEgg2.png'

interface EasterEgg2Props {
  isVisible: boolean
}

export function EasterEgg2({ isVisible }: EasterEgg2Props): JSX.Element | null {
  if (!isVisible) return null

  return (
    <div className="easter-egg-overlay">
      <div className="easter-egg-container">
        <img src={easterEggImage} alt="Easter Egg" className="easter-egg-image" />
        <p className="easter-egg-text-hebrew">התחזות זו עבירה חמורה</p>
      </div>
    </div>
  )
}
