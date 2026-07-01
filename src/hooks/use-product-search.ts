import { useState, useMemo } from 'react'
import { useProducts } from './use-products'

/**
 * Lightweight product search hook.
 * - Performs client-side filtering on the full product list (already cached by React Query).
 * - Returns top N matches for a given query string.
 * - Used by the Header quick-search and can be shared with other pages.
 */
export function useProductSearch(query, { limit = 6 } = {}) {
  const { data: products = [], isLoading } = useProducts()

  const results = useMemo(() => {
    if (!query || query.length < 2) return []

    const q = query.toLowerCase()
    const matches = products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q)
    )

    return matches.slice(0, limit)
  }, [products, query, limit])

  return {
    results,
    isLoading,
    hasResults: results.length > 0,
    totalProducts: products.length,
  }
}
