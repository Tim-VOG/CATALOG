import { describe, it, expect } from 'vitest'
import {
  STATUS_TRANSITIONS,
  getAvailableTransitions,
  buildTimeline,
} from './request-status-service'

describe('STATUS_TRANSITIONS', () => {
  it('is a forward-only graph: pending → in_progress → ready → returned', () => {
    expect(STATUS_TRANSITIONS.pending).toEqual(['in_progress'])
    expect(STATUS_TRANSITIONS.in_progress).toEqual(['ready'])
    expect(STATUS_TRANSITIONS.ready).toEqual(['returned'])
    expect(STATUS_TRANSITIONS.returned).toEqual([])
  })
})

describe('getAvailableTransitions', () => {
  it('returns the configured next-states for known statuses', () => {
    expect(getAvailableTransitions('pending')).toEqual(['in_progress'])
    expect(getAvailableTransitions('in_progress')).toEqual(['ready'])
    expect(getAvailableTransitions('ready')).toEqual(['returned'])
  })

  it('returns an empty array for terminal statuses', () => {
    expect(getAvailableTransitions('returned')).toEqual([])
  })

  it('returns an empty array for unknown statuses (no crash)', () => {
    expect(getAvailableTransitions('weird')).toEqual([])
    expect(getAvailableTransitions(undefined)).toEqual([])
    expect(getAvailableTransitions(null)).toEqual([])
  })
})

describe('buildTimeline', () => {
  const t0 = '2026-01-01T10:00:00Z'
  const t1 = '2026-01-02T15:00:00Z'

  it('always seeds a "Submitted" event from created_at', () => {
    const events = buildTimeline({ status: 'pending', created_at: t0, updated_at: t0 })
    expect(events[0]).toEqual({ label: 'Submitted', date: t0 })
    expect(events).toHaveLength(1)
  })

  it('appends an "In Progress" event once status moves past pending', () => {
    const events = buildTimeline({ status: 'in_progress', created_at: t0, updated_at: t1 })
    expect(events.map((e: any) => e.label)).toEqual(['Submitted', 'In Progress'])
    expect(events[1].date).toBe(t1)
  })

  it('appends both "In Progress" and "Ready" when status is ready', () => {
    const events = buildTimeline({ status: 'ready', created_at: t0, updated_at: t1 })
    expect(events.map((e: any) => e.label)).toEqual(['Submitted', 'In Progress', 'Ready'])
  })

  it('appends "Returned" as the final event when status is returned', () => {
    const events = buildTimeline({ status: 'returned', created_at: t0, updated_at: t1 })
    expect(events.map((e: any) => e.label)).toEqual(['Submitted', 'In Progress', 'Ready', 'Returned'])
  })
})
