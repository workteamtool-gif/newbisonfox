import { useState, JSX } from 'react'
import './VirtualKeyboard.css'

interface VirtualKeyboardProps {
  currentValue: string
  onChange: (value: string) => void
}

export function VirtualKeyboard({ currentValue, onChange }: VirtualKeyboardProps): JSX.Element {
  const [isCaps, setIsCaps] = useState(false)

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['Shift', '_', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace'],
    ['Space']
  ]

  const handlePress = (key: string) => {
    if (key === 'Backspace') {
      onChange(currentValue.slice(0, -1))
    } else if (key === 'Shift') {
      setIsCaps(!isCaps)
    } else if (key === 'Space') {
      onChange(currentValue + ' ')
    } else {
      const char = isCaps ? key.toUpperCase() : key.toLowerCase()
      onChange(currentValue + char)
    }
  }

  return (
    <div className="vk-overlay">
      <div className="vk-container" onClick={(e) => e.stopPropagation()}>
        <div className="vk-rows">
          {rows.map((row, i) => (
            <div key={i} className="vk-row">
              {row.map((key) => {
                const isSpecial = key.length > 1;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`vk-key vk-${key.toLowerCase()} ${isSpecial ? 'vk-special' : ''} ${key === 'Shift' && isCaps ? 'active' : ''}`}
                    onClick={() => handlePress(key)}
                  >
                    {key === 'Backspace' ? '⌫' : key === 'Shift' ? '⇧' : key}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}