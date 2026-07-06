import { describe, it, expect } from 'vitest'
import { subjectLabelFor, subjectNameFor, formatDate } from './request-status-service'

describe('subjectLabelFor', () => {
  it('labels the subject per request type', () => {
    expect(subjectLabelFor('onboarding')).toBe('New hire')
    expect(subjectLabelFor('offboarding')).toBe('Person leaving')
    expect(subjectLabelFor('mailbox')).toBe('Mailbox')
    expect(subjectLabelFor('equipment')).toBe('Request')
    expect(subjectLabelFor('anything-else')).toBe('Request')
  })
})

describe('subjectNameFor', () => {
  it('uses the full name for onboarding/offboarding', () => {
    expect(subjectNameFor({ first_name: 'Jean', last_name: 'Dupont' }, 'onboarding')).toBe('Jean Dupont')
    expect(subjectNameFor({ data: { first_name: 'Sam', last_name: 'Leaving' } }, 'offboarding')).toBe('Sam Leaving')
  })

  it('uses the mailbox email for mailbox requests', () => {
    expect(subjectNameFor({ email_to_create: 'team@vo-group.be' }, 'mailbox')).toBe('team@vo-group.be')
    expect(subjectNameFor({ data: { email_to_create: 'x@vo.be' } }, 'mailbox')).toBe('x@vo.be')
  })

  it('falls back to a short request id when nothing identifies the request', () => {
    expect(subjectNameFor({ id: '1234567890abcdef' }, 'equipment')).toBe('#12345678')
  })

  it('returns a dash when there is nothing at all', () => {
    expect(subjectNameFor({}, 'equipment')).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats an ISO date as dd Mon yyyy (en-GB)', () => {
    expect(formatDate('2026-03-07')).toMatch(/07 Mar 2026/)
  })
})
