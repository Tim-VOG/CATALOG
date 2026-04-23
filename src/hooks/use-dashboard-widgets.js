import { useState, useCallback } from 'react'

const ALL_WIDGETS = {
  'stat-pending':     { label: 'Pending Requests',   group: 'stats',  defaultVisible: true },
  'stat-active':      { label: 'In Progress',        group: 'stats',  defaultVisible: true },
  'stat-pickup':      { label: 'Ready',              group: 'stats',  defaultVisible: true },
  'chart-requests':   { label: 'Requests Chart',     group: 'charts', defaultVisible: true },
  'chart-categories': { label: 'Category Breakdown', group: 'charts', defaultVisible: false },
  'chart-loans':      { label: 'Request Activity',   group: 'charts', defaultVisible: false },
  'timeline':         { label: 'Planning Timeline',  group: 'charts', defaultVisible: true },
  'active-loans':     { label: 'In Progress List',   group: 'lists',  defaultVisible: true },
  'recent-requests':  { label: 'Recent Requests',    group: 'lists',  defaultVisible: true },
  'low-stock':        { label: 'Low Stock Alert',    group: 'lists',  defaultVisible: true },
  'qr-usage':         { label: 'QR Usage by Category', group: 'charts', defaultVisible: true },
  'qr-overdue':       { label: 'Overdue Equipment',  group: 'lists',  defaultVisible: true },
}

const STORAGE_KEY = 'vo-dashboard-widgets'

function getInitialVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const merged = {}
      for (const [id, w] of Object.entries(ALL_WIDGETS)) {
        merged[id] = parsed[id] ?? w.defaultVisible
      }
      return merged
    }
  } catch {}
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
