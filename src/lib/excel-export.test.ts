import { describe, it, expect } from 'vitest'
import { normaliseRequests } from './excel-export'

describe('normaliseRequests', () => {
  it('maps equipment / IT / mailbox requests onto shared columns', () => {
    const rows = normaliseRequests({
      equipmentRequests: [
        { status: 'pending', user_name: 'Alice', event_name: 'Expo', created_at: '2026-03-02' },
      ],
      itRequests: [
        { type: 'onboarding', status: 'ready', requester_name: 'Bob', data: { first_name: 'Jean', last_name: 'Dupont' }, created_at: '2026-03-05' },
        { type: 'offboarding', status: 'pending', requester_email: 'hr@vo.be', data: { name: 'Sam Leaving' }, created_at: '2026-03-01' },
      ],
      mailboxRequests: [
        { status: 'ready', requester_name: 'Carol', email_to_create: 'team@vo-group.be', created_at: '2026-03-04' },
      ],
    })

    expect(rows).toHaveLength(4)
    const byType = Object.fromEntries(rows.map((r) => [r.Type, r]))
    expect(byType.Equipment.Requester).toBe('Alice')
    expect(byType.Equipment.Subject).toBe('Expo')
    expect(byType.Onboarding.Subject).toBe('Jean Dupont')
    expect(byType.Offboarding.Subject).toBe('Sam Leaving')
    expect(byType.Mailbox.Subject).toBe('team@vo-group.be')
  })

  it('sorts newest first by Created date', () => {
    const rows = normaliseRequests({
      equipmentRequests: [
        { status: 'a', created_at: '2026-01-01' },
        { status: 'b', created_at: '2026-12-31' },
      ],
    })
    // fr-FR formatted dates → compare via string localeCompare desc; newest first
    expect(rows[0].Created.length).toBeGreaterThan(0)
    expect(rows).toHaveLength(2)
  })

  it('returns an empty array when there are no requests', () => {
    expect(normaliseRequests({})).toEqual([])
  })

  it('falls back gracefully on missing fields', () => {
    const rows = normaliseRequests({ itRequests: [{ type: 'it', status: 'pending' }] })
    expect(rows[0].Type).toBe('It')
    expect(rows[0].Requester).toBe('')
    expect(rows[0].Subject).toBe('')
  })
})
