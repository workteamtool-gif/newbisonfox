import { useState, useEffect } from 'react'

export function useKeyboardDetection(): boolean {
  // Assume a keyboard is connected initially so we don't flash the virtual keyboard unnecessarily
  const [hasKeyboard, setHasKeyboard] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkKeyboard(): Promise<void> {
      try {
        // Assume API has been exposed via preload
        const result = await window.api.invoke('detect-keyboard')
        if (isMounted) {
          setHasKeyboard(result.hasKeyboard)
        }
      } catch (error) {
        console.error('Failed to detect keyboard:', error)
      }
    }

    checkKeyboard()

    return () => {
      isMounted = false
    }
  }, [])

  return false // Return true if virtual keyboard should be shown
}
