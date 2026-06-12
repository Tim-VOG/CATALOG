import { useState, useEffect, useRef } from 'react'

/**
 * useScrollProgress — returns 0-1 progress of how far the page has been scrolled.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handler = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        setProgress(Math.min(scrollTop / docHeight, 1))
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return progress
}

/**
 * useScrollDirection — returns 'up' | 'down' based on scroll direction.
 * Useful for auto-hide bottom bar, header shrink, etc.
 */
export function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState('up')
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY
      const diff = scrollY - lastScrollY.current

      if (Math.abs(diff) > threshold) {
        setDirection(diff > 0 ? 'down' : 'up')
        lastScrollY.current = scrollY
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])

  return direction
}

/**
 * useParallax — returns a parallax offset for an element based on scroll position.
 * Attach the ref to the element, and use the offset for translateY.
 */
export function useParallax(speed = 0.3) {
  const ref = useRef(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handler = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const viewCenter = window.innerHeight / 2
      setOffset((center - viewCenter) * speed)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [speed])

  return { ref, offset }
}
