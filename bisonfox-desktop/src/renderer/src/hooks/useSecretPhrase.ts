import { useEffect, useRef } from 'react'

const SECRET = 'bison_fox'

/**
 * Global keyboard listener that triggers `open-cmd` when the user types
 * the secret phrase anywhere in the app — regardless of focus or page.
 */
export function useSecretPhrase(): void {
  const bufferRef = useRef('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // Ignore modifier-only keys and non-printable keys
      if (e.key.length !== 1) return

      bufferRef.current += e.key.toLowerCase()

      // Keep only the last N characters (length of the secret)
      if (bufferRef.current.length > SECRET.length) {
        bufferRef.current = bufferRef.current.slice(-SECRET.length)
      }

      if (bufferRef.current === SECRET) {
        bufferRef.current = ''
        window.api.invoke('open-cmd')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
