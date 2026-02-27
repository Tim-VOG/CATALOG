// Default widget positions for the admin dashboard grid (12-col grid)
export const DEFAULT_LAYOUTS = {
  lg: [
    // Row 1-2: 4 stat cards across top
    { i: 'stat-pending',     x: 0,  y: 0,  w: 3, h: 2, minW: 2, minH: 2, maxH: 3 },
    { i: 'stat-active',      x: 3,  y: 0,  w: 3, h: 2, minW: 2, minH: 2, maxH: 3 },
    { i: 'stat-overdue',     x: 6,  y: 0,  w: 3, h: 2, minW: 2, minH: 2, maxH: 3 },
    { i: 'stat-pickup',      x: 9,  y: 0,  w: 3, h: 2, minW: 2, minH: 2, maxH: 3 },
    // Row 2-6: Charts
    { i: 'chart-requests',   x: 0,  y: 2,  w: 8, h: 5, minW: 4, minH: 3 },
    { i: 'chart-categories', x: 8,  y: 2,  w: 4, h: 5, minW: 3, minH: 3 },
    // Row 7-11: Lists
    { i: 'active-loans',     x: 0,  y: 7,  w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'recent-requests',  x: 6,  y: 7,  w: 6, h: 5, minW: 4, minH: 3 },
    // Row 12+: secondary
    { i: 'chart-loans',      x: 0,  y: 12, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'overdue-returns',  x: 0,  y: 16, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'low-stock',        x: 6,  y: 16, w: 6, h: 4, minW: 4, minH: 3 },
  ],
  md: [
    { i: 'stat-pending',     x: 0, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-active',      x: 3, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-overdue',     x: 0, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-pickup',      x: 3, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'chart-requests',   x: 0, y: 4,  w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'chart-categories', x: 0, y: 9,  w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'active-loans',     x: 0, y: 14, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'recent-requests',  x: 0, y: 19, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'chart-loans',      x: 0, y: 24, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'overdue-returns',  x: 0, y: 28, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'low-stock',        x: 0, y: 32, w: 6, h: 4, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'stat-pending',     x: 0, y: 0,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'stat-active',      x: 0, y: 2,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'stat-overdue',     x: 0, y: 4,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'stat-pickup',      x: 0, y: 6,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'chart-requests',   x: 0, y: 8,  w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'chart-categories', x: 0, y: 13, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'active-loans',     x: 0, y: 18, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'recent-requests',  x: 0, y: 23, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'chart-loans',      x: 0, y: 28, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'overdue-returns',  x: 0, y: 32, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'low-stock',        x: 0, y: 36, w: 1, h: 4, minW: 1, minH: 3 },
  ],
}

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 0 }
export const COLS = { lg: 12, md: 6, sm: 1 }
export const ROW_HEIGHT = 60
