import { useState, useCallback } from 'react'

// All available dashboard widgets with display info and default visibility
const ALL_WIDGETS = {
  'stat-pending':     { label: 'Pending Requests',   group: 'stats',  defaultVisible: true },
  'stat-active':      { label: 'Active Loans',       group: 'stats',  defaultVisible: true },
  'stat-overdue':     { label: 'Overdue Count',      group: 'stats',  defaultVisible: true },
  'stat-pickup':      { label: 'Awaiting Pickup',    group: 'stats',  defaultVisible: true },
  'chart-requests':   { label: 'Requests Chart',     group: 'charts', defaultVisible: true },
  'chart-categories': { label: 'Category Breakdown', group: 'charts', defaultVisible: false },
  'chart-loans':      { label: 'Loan Activity',      group: 'charts', defaultVisible: false },
  'timeline':         { label: 'Planning Timeline',  group: 'charts', defaultVisible: true },
  'active-loans':     { label: 'Active Loans List',  group: 'lists',  defaultVisible: true },
  'recent-requests':  { label: 'Recent Requests',    group: 'lists',  defaultVisible: true },
  'overdue-returns':  { label: 'Overdue Returns',    group: 'lists',  defaultVisible: false },
  'low-stock':        { label: 'Low Stock Alert',    group: 'lists',  defaultVisible: false },
}

const STORAGE_KEY = 'vo-dashboard-widgets'

function getInitialVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle new widgets added after initial save
      const merged = {}
      for (const [id, w] of Object.entries(ALL_WIDGETS)) {
        merged[id] = parsed[id] ?? w.defaultVisible
      }
      return merged
    }
  } catch {}
  // Use defaults
  const defaults = {}
  for (const [id, w] of Object.entries(ALL_WIDGETS)) {
    defaults[id] = w.defaultVisible
  }
  return defaults
}

export function useDashboardWidgets() {
  const [visibility, setVisibility] = useState(getInitialVisibility)

  const toggleWidget = useCallback((id) => {
    setVisibility((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetWidgets = useCallback(() => {
    const defaults = {}
    for (const [id, w] of Object.entries(ALL_WIDGETS)) {
      defaults[id] = w.defaultVisible
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    setVisibility(defaults)
  }, [])

  const isVisible = useCallback((id) => {
    return visibility[id] ?? ALL_WIDGETS[id]?.defaultVisible ?? true
  }, [visibility])

  return {
    visibility,
    toggleWidget,
    resetWidgets,
    isVisible,
    allWidgets: ALL_WIDGETS,
  }
}
