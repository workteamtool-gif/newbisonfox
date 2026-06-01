import { useState, useEffect, useRef } from 'react'

interface UseTreeScrollOptions {
  nodePath: string
  scrollToPath?: string
  onScrolled?: () => void
}

export function useTreeScroll({ nodePath, scrollToPath, onScrolled }: UseTreeScrollOptions) {
  const [highlighted, setHighlighted] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollToPath && nodePath === scrollToPath && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlighted(true)
      if (onScrolled) onScrolled()

      const timer = setTimeout(() => setHighlighted(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [scrollToPath, nodePath, onScrolled])

  return { highlighted, rowRef }
}
