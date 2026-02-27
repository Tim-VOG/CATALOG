// Default widget positions for the admin dashboard grid (12-col grid)
export const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'stat-pending',    x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-active',     x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-overdue',    x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-pickup',     x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'active-loans',    x: 6, y: 0, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'recent-requests', x: 0, y: 4, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'overdue-returns', x: 0, y: 9, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'low-stock',       x: 6, y: 5, w: 6, h: 4, minW: 4, minH: 3 },
  ],
  md: [
    { i: 'stat-pending',    x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-active',     x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-overdue',    x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'stat-pickup',     x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'active-loans',    x: 0, y: 4, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'recent-requests', x: 0, y: 9, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'overdue-returns', x: 0, y: 14, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'low-stock',       x: 0, y: 18, w: 6, h: 4, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'stat-pending',    x: 0, y: 0,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'stat-active',     x: 0, y: 2,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'stat-overdue',    x: 0, y: 4,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'stat-pickup',     x: 0, y: 6,  w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'active-loans',    x: 0, y: 8,  w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'recent-requests', x: 0, y: 13, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'overdue-returns', x: 0, y: 18, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'low-stock',       x: 0, y: 22, w: 1, h: 4, minW: 1, minH: 3 },
  ],
}

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 0 }
export const COLS = { lg: 12, md: 6, sm: 1 }
export const ROW_HEIGHT = 60
