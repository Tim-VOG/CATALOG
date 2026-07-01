import { describe, it, expect } from 'vitest'
import { businessUnitFromEmail } from './business-unit-from-email'

describe('businessUnitFromEmail', () => {
  describe('maps a corporate email domain to its business unit', () => {
    it('resolves every seeded business unit from its domain', () => {
      expect(businessUnitFromEmail('jdupont@vo-group.be')).toBe('VO GROUP')
      expect(businessUnitFromEmail('asmith@vo-europe.eu')).toBe('VO EUROPE')
      expect(businessUnitFromEmail('mdupont@vo-event.be')).toBe('VO EVENT')
      expect(businessUnitFromEmail('john@thelittlevoice.be')).toBe('THE LITTLE VOICE')
      expect(businessUnitFromEmail('marc@vo-event-max.be')).toBe('MAX')
      expect(businessUnitFromEmail('jd@sign.brussels')).toBe('SIGN BRUSSELS')
      expect(businessUnitFromEmail('eva@artonpaper.be')).toBe('ART ON PAPER')
      expect(businessUnitFromEmail('jdoe@act-events.com')).toBe('ACT-EVENTS')
    })
  })

  describe('is case- and whitespace-insensitive on the domain', () => {
    it('matches regardless of casing', () => {
      expect(businessUnitFromEmail('Jean.Dupont@VO-EUROPE.EU')).toBe('VO EUROPE')
      expect(businessUnitFromEmail('ADMIN@Vo-Group.Be')).toBe('VO GROUP')
    })

    it('trims surrounding whitespace', () => {
      expect(businessUnitFromEmail('  jdupont@vo-europe.eu  ')).toBe('VO EUROPE')
    })
  })

  describe('returns null when it cannot resolve a unit', () => {
    it('returns null for an unknown domain', () => {
      expect(businessUnitFromEmail('someone@gmail.com')).toBeNull()
      expect(businessUnitFromEmail('someone@vo-europe.com')).toBeNull() // .com not .eu
    })

    it('returns null for missing or malformed emails', () => {
      expect(businessUnitFromEmail('')).toBeNull()
      expect(businessUnitFromEmail(null)).toBeNull()
      expect(businessUnitFromEmail(undefined)).toBeNull()
      expect(businessUnitFromEmail('not-an-email')).toBeNull()
      expect(businessUnitFromEmail('trailing@')).toBeNull()
    })
  })

  describe('accepts a custom units list (e.g. the live DB list)', () => {
    it('resolves against the passed-in units, not just the constant', () => {
      const dbUnits = [{ value: 'NEW BU', domain: 'newbu.example' }]
      expect(businessUnitFromEmail('someone@newbu.example', dbUnits)).toBe('NEW BU')
      // a constant-only domain is NOT matched when a custom list is supplied
      expect(businessUnitFromEmail('jdupont@vo-europe.eu', dbUnits)).toBeNull()
    })
  })
})
