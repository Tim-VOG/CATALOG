import { describe, it, expect } from 'vitest'
import { sanitizeSearch } from './sanitize'

describe('sanitizeSearch', () => {
  it('returns empty string for nullish input', () => {
    expect(sanitizeSearch(null)).toBe('')
    expect(sanitizeSearch(undefined)).toBe('')
    expect(sanitizeSearch('')).toBe('')
  })

  it('trims surrounding whitespace and collapses inner whitespace', () => {
    expect(sanitizeSearch('   hello   world   ')).toBe('hello world')
  })

  it('strips PostgREST control chars % and ,', () => {
    expect(sanitizeSearch('a%b,c')).toBe('a b c')
  })

  it('caps the result at the requested max length', () => {
    const long = 'a'.repeat(200)
    expect(sanitizeSearch(long).length).toBe(64)
    expect(sanitizeSearch(long, 10).length).toBe(10)
  })

  it('coerces non-string inputs', () => {
    expect(sanitizeSearch(42)).toBe('42')
  })
})
