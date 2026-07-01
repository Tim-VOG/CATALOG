import { describe, it, expect } from 'vitest'
import { generateCorporateEmail } from './generate-email'

describe('generateCorporateEmail', () => {
  describe('initial_last pattern (VO GROUP, VO EUROPE, VO EVENT)', () => {
    it('builds first-initial + last-name @ domain', () => {
      expect(generateCorporateEmail('John', 'Doe', 'VO GROUP')).toBe('jdoe@vo-group.be')
      expect(generateCorporateEmail('Anna', 'Smith', 'VO EUROPE')).toBe('asmith@vo-europe.eu')
      expect(generateCorporateEmail('Marc', 'Dupont', 'VO EVENT')).toBe('mdupont@vo-event.be')
    })
  })

  describe('first pattern (THE LITTLE VOICE, MAX, ART ON PAPER)', () => {
    it('uses only the first name as the local part', () => {
      expect(generateCorporateEmail('John', 'Doe', 'THE LITTLE VOICE')).toBe('john@thelittlevoice.be')
      expect(generateCorporateEmail('Marc', 'Dupont', 'MAX')).toBe('marc@vo-event-max.be')
      expect(generateCorporateEmail('Eva', 'Lopez', 'ART ON PAPER')).toBe('eva@artonpaper.be')
    })
  })

  describe('initials pattern (SIGN BRUSSELS)', () => {
    it('uses first + last initial', () => {
      expect(generateCorporateEmail('John', 'Doe', 'SIGN BRUSSELS')).toBe('jd@sign.brussels')
    })
  })

  describe('ACT-EVENTS (added later, initial_last pattern)', () => {
    it('builds first-initial + last-name @ act-events.com', () => {
      expect(generateCorporateEmail('John', 'Doe', 'ACT-EVENTS')).toBe('jdoe@act-events.com')
      expect(generateCorporateEmail('Sophie', 'Martin', 'ACT-EVENTS')).toBe('smartin@act-events.com')
    })
  })

  describe('custom units list (e.g. the live DB list)', () => {
    it('resolves the pattern from the passed-in units, supporting snake_case email_pattern', () => {
      const dbUnits = [{ value: 'NEW BU', domain: 'newbu.example', email_pattern: 'first' as const }]
      expect(generateCorporateEmail('John', 'Doe', 'NEW BU', dbUnits)).toBe('john@newbu.example')
    })

    it('returns empty string when the BU is not in the supplied list', () => {
      const dbUnits = [{ value: 'NEW BU', domain: 'newbu.example', email_pattern: 'first' as const }]
      expect(generateCorporateEmail('John', 'Doe', 'VO GROUP', dbUnits)).toBe('')
    })
  })

  describe('name normalization', () => {
    it('strips diacritics so accented names produce valid addresses', () => {
      expect(generateCorporateEmail('Hélène', 'Müller', 'VO GROUP')).toBe('hmuller@vo-group.be')
      expect(generateCorporateEmail('José', 'García', 'VO EUROPE')).toBe('jgarcia@vo-europe.eu')
      expect(generateCorporateEmail('Renée', 'O\'Connor', 'VO EVENT')).toBe('roconnor@vo-event.be')
    })

    it('removes spaces, hyphens and apostrophes from compound names', () => {
      expect(generateCorporateEmail('Jean-Marc', 'De La Fontaine', 'VO GROUP')).toBe('jdelafontaine@vo-group.be')
      expect(generateCorporateEmail("Marie", "D'Aragon", 'VO EUROPE')).toBe('mdaragon@vo-europe.eu')
    })

    it('lowercases regardless of casing on input', () => {
      expect(generateCorporateEmail('JOHN', 'DOE', 'VO GROUP')).toBe('jdoe@vo-group.be')
    })
  })

  describe('edge cases', () => {
    it('returns empty string when business unit is unknown', () => {
      expect(generateCorporateEmail('John', 'Doe', 'UNKNOWN UNIT')).toBe('')
      expect(generateCorporateEmail('John', 'Doe', '')).toBe('')
    })

    it('returns empty string when first or last name is missing', () => {
      expect(generateCorporateEmail('', 'Doe', 'VO GROUP')).toBe('')
      expect(generateCorporateEmail('John', '', 'VO GROUP')).toBe('')
      expect(generateCorporateEmail(null, null, 'VO GROUP')).toBe('')
    })

    it('returns empty string when the normalized name has no a-z chars', () => {
      // "李" + "王" → empty after diacritic strip + non-a-z filter
      expect(generateCorporateEmail('李', '王', 'VO GROUP')).toBe('')
      expect(generateCorporateEmail('---', '...', 'VO GROUP')).toBe('')
    })
  })
})
