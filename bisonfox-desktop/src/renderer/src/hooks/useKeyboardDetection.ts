import { useState, useEffect } from 'react'

export function useKeyboardDetection(): boolean {
  const [, setHasKeyboard] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkKeyboard(): Promise<void> {
      try {
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

  return false
}
