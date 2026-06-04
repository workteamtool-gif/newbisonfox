import { useState, useEffect, useRef } from 'react'

export interface EasterEggTriggerConfig {
  triggerCount: number
  durationMs: number
}

export function useEasterEggTrigger(
  isModalOpen: boolean,
  config: EasterEggTriggerConfig = { triggerCount: 7, durationMs: 5000}
): boolean {
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const prevIsOpen = useRef(isModalOpen)
  const count = useRef(0)
  const displayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Increment the count when the modal transitions from open to closed
    if (prevIsOpen.current && !isModalOpen) {
      count.current += 1

      // Reset the counter if the user doesn't close it again within the timeout
      if (resetTimer.current) {
        clearTimeout(resetTimer.current)
      }

      if (count.current >= config.triggerCount) {
        setShowEasterEgg(true)
        count.current = 0

        if (displayTimer.current) clearTimeout(displayTimer.current)
        displayTimer.current = setTimeout(() => {
          setShowEasterEgg(false)
        }, config.durationMs)
      }
    }
    
    prevIsOpen.current = isModalOpen
  }, [isModalOpen, config.triggerCount, config.durationMs])

  useEffect(() => {
    return () => {
      if (displayTimer.current) clearTimeout(displayTimer.current)
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  return showEasterEgg
}
