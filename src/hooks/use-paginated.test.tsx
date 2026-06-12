import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaginated } from './use-paginated'

const seed = (n) => Array.from({ length: n }, (_, i) => ({ id: i }))

describe('usePaginated', () => {
  it('exposes the first page of items', () => {
    const { result } = renderHook(() => usePaginated(seed(120), 50))
    expect(result.current.items).toHaveLength(50)
    expect(result.current.total).toBe(120)
    expect(result.current.hasMore).toBe(true)
  })

  it('loadMore reveals the next page', () => {
    const { result } = renderHook(() => usePaginated(seed(120), 50))
    act(() => result.current.loadMore())
    expect(result.current.items).toHaveLength(100)
    expect(result.current.hasMore).toBe(true)
    act(() => result.current.loadMore())
    expect(result.current.items).toHaveLength(120)
    expect(result.current.hasMore).toBe(false)
  })

  it('reset goes back to the first page', () => {
    const { result } = renderHook(() => usePaginated(seed(120), 50))
    act(() => result.current.loadMore())
    act(() => result.current.reset())
    expect(result.current.items).toHaveLength(50)
  })

  it('handles empty / null lists gracefully', () => {
    const { result } = renderHook(() => usePaginated(null, 10))
    expect(result.current.items).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.hasMore).toBe(false)
  })
})
