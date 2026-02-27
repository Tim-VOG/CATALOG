import { BUSINESS_UNITS } from '@/lib/constants/business-units'

/**
 * Normalize a name for email generation:
 * - lowercase
 * - strip diacritics (é → e, ü → u, etc.)
 * - remove non-alpha characters (spaces, hyphens, apostrophes)
 */
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z]/g, '')          // only keep a-z
}

/**
 * Generate a corporate email address based on first name, last name,
 * and business unit selection.
 *
 * Rules per business unit:
 *   VO GROUP        → jdoe@vo-group.be      (first initial + last name)
 *   THE LITTLE VOICE → john@thelittlevoice.be (first name)
 *   VO EUROPE       → jdoe@vo-europe.eu     (first initial + last name)
 *   VO EVENT        → jdoe@vo-event.be      (first initial + last name)
 *   MAX             → john@vo-event-max.be  (first name)
 *   SIGN BRUSSELS   → jd@sign.brussels      (initials)
 *   ART ON PAPER    → john@artonpaper.be    (first name)
 *
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} businessUnit - must match one of BUSINESS_UNITS[].value
 * @returns {string} generated email or empty string
 */
export function generateCorporateEmail(firstName, lastName, businessUnit) {
  const unit = BUSINESS_UNITS.find((u) => u.value === businessUnit)
  if (!unit) return ''

  const first = normalizeName(firstName)
  const last = normalizeName(lastName)

  if (!first || !last) return ''

  switch (unit.emailPattern) {
    case 'initial_last':
      return `${first[0]}${last}@${unit.domain}`
    case 'first':
      return `${first}@${unit.domain}`
    case 'initials':
      return `${first[0]}${last[0]}@${unit.domain}`
    default:
      return ''
  }
}
