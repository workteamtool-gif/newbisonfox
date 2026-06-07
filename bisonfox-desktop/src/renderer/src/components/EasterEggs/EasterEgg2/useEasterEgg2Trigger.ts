import { useState, useEffect, useRef } from 'react'

export function useUsernameEasterEggTrigger(
  name: string,
  targetUsername: string = 't_t_t_lightning_fox',
  durationMs: number = 5000
): boolean {
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const hasTriggered = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const sanitizedName = name.trim()
    if (sanitizedName === targetUsername) {
      if (!hasTriggered.current) {
        setShowEasterEgg(true)
        hasTriggered.current = true

        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          setShowEasterEgg(false)
        }, durationMs)
      }
    } else {
      // Reset so it can be triggered again if they edit and re-type it
      hasTriggered.current = false
    }
  }, [name, targetUsername, durationMs])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return showEasterEgg
}
