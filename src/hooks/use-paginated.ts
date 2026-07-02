import { useMemo, useState } from 'react'

/**
 * Client-side pagination + "load more" — works great up to a few
 * thousand rows already loaded in memory. For tables hitting that
 * ceiling, swap for a server-side .range() pagination instead.
 *
 * Usage:
 *   const { items, hasMore, loadMore, reset, total } =
 *     usePaginated(filtered, 50)
 */
export function usePaginated(allItems: any, pageSize = 50) {
  const [visible, setVisible] = useState(pageSize)

  // Reset visible count when the underlying list shrinks below it
  // (e.g. when a search filter narrows the dataset).
  const total = allItems?.length || 0
  const items = useMemo(() => (allItems || []).slice(0, visible), [allItems, visible])
  const hasMore = total > visible

  return {
    items,
    total,
    visible,
    hasMore,
    loadMore: () => setVisible((v: any) => v + pageSize),
    reset: () => setVisible(pageSize),
  }
}
