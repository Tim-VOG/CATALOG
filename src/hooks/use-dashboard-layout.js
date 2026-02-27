import { useState, useCallback } from 'react'
import { DEFAULT_LAYOUTS } from '@/components/admin/dashboard/dashboard-layouts'

const STORAGE_KEY = 'vo-dashboard-layout'

/**
 * Merge saved layouts with defaults so new widgets always have positions.
 * Saved positions take priority; missing widgets get their default positions.
 */
function mergeWithDefaults(saved) {
  const merged = {}
  for (const bp of Object.keys(DEFAULT_LAYOUTS)) {
    const savedBp = saved[bp] || []
    const savedIds = new Set(savedBp.map((item) => item.i))
    // Start with saved positions
    const items = [...savedBp]
    // Append any missing widget defaults
    for (const defaultItem of DEFAULT_LAYOUTS[bp]) {
      if (!savedIds.has(defaultItem.i)) {
        items.push(defaultItem)
      }
    }
    merged[bp] = items
  }
  return merged
}

function loadLayouts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Validate it has at least lg key
      if (parsed && parsed.lg) return mergeWithDefaults(parsed)
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
