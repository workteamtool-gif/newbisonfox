import { useState, useEffect } from 'react'
import { IPC_CHANNELS } from '@shared/constants/ipcChannels'

// Return true if keyboard is detected
export function useKeyboardDetection(): boolean {
  const [, setHasKeyboard] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkKeyboard(): Promise<void> {
      try {
        const result = (await window.api.invoke(IPC_CHANNELS.SYSTEM.DETECT_KEYBOARD)) as {
          hasKeyboard: boolean
        }
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
