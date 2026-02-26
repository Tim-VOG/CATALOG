import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const LiveRegionContext = createContext(null)

/**
 * LiveRegionProvider — wraps the app and provides an `announce()` function
 * that pushes messages to a visually-hidden aria-live region.
 *
 * Screen readers will read the announcement without interrupting the user.
 */
export function LiveRegionProvider({ children }) {
  const [message, setMessage] = useState('')

  const announce = useCallback((text) => {
    // Clear then set to ensure repeated identical messages are announced
    setMessage('')
    requestAnimationFrame(() => setMessage(text))
  }, [])

  // Auto-clear after 5s
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </LiveRegionContext.Provider>
  )
}

/**
 * useAnnounce — returns the `announce(text)` function from LiveRegionProvider.
 */
export function useAnnounce() {
  const ctx = useContext(LiveRegionContext)
  if (!ctx) {
    // Fallback no-op if used outside provider
    return () => {}
  }
  return ctx
}
