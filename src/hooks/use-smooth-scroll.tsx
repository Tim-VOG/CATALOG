import { useEffect, useRef, createContext, useContext, useCallback } from 'react'
import Lenis from 'lenis'

const SmoothScrollContext = createContext(null)

/**
 * SmoothScrollProvider — wraps the app with Lenis smooth scroll.
 * Place inside BrowserRouter but outside route components.
 */
export function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return (
    <SmoothScrollContext.Provider value={lenisRef}>
      {children}
    </SmoothScrollContext.Provider>
  )
}

/**
 * useSmoothScroll — access the Lenis instance directly.
 */
export function useSmoothScroll() {
  const lenisRef = useContext(SmoothScrollContext)
  return lenisRef?.current ?? null
}

/**
 * useScrollTo — smooth scroll to a target (element, selector, or number).
 */
export function useScrollTo() {
  const lenisRef = useContext(SmoothScrollContext)

  return useCallback((target, options = {}) => {
    const lenis = lenisRef?.current
    if (!lenis) {
      // Fallback if Lenis not available
      if (typeof target === 'string') {
        document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
      } else if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
      return
    }

    lenis.scrollTo(target, {
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      offset: 0,
      ...options,
    })
  }, [lenisRef])
}

/**
 * useScrollToTop — scrolls to top. Useful on route change.
 */
export function useScrollToTop() {
  const scrollTo = useScrollTo()
  return useCallback(() => scrollTo(0, { duration: 0 }), [scrollTo])
}
