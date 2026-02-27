import { useState, useCallback } from 'react'
import { DEFAULT_LAYOUTS } from '@/components/admin/dashboard/dashboard-layouts'

const STORAGE_KEY = 'vo-dashboard-layout'

function loadLayouts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Validate it has at least lg key
      if (parsed && parsed.lg) return parsed
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_LAYOUTS
}

export function useDashboardLayout() {
  const [layouts, setLayouts] = useState(loadLayouts)

  const onLayoutChange = useCallback((_layout, allLayouts) => {
    setLayouts(allLayouts)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts))
    } catch {
      // ignore quota errors
    }
  }, [])

  const resetLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { layouts, onLayoutChange, resetLayout }
}
