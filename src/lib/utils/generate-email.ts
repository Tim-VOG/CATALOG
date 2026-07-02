import { BUSINESS_UNITS, type BusinessUnit, type EmailPattern } from '@/lib/constants/business-units'

// Shape accepted from the DB hook (snake_case email_pattern) so callers
// can pass `useBusinessUnits().data` directly without reshaping.
type DbBusinessUnit = { value: string; domain: string; email_pattern: EmailPattern }
type AnyBusinessUnit = BusinessUnit | DbBusinessUnit

function pattern(unit: AnyBusinessUnit): EmailPattern {
  return 'emailPattern' in unit ? unit.emailPattern : unit.email_pattern
}

/**
 * Normalize a name for email generation:
 * - lowercase
 * - strip diacritics (é → e, ü → u, etc.)
 * - remove non-alpha characters (spaces, hyphens, apostrophes)
 */
function normalizeName(name: string | null | undefined): string {
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
 */
export function generateCorporateEmail(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  businessUnit: string | null | undefined,
  units: readonly AnyBusinessUnit[] = BUSINESS_UNITS,
): string {
  const unit = units.find((u: any) => u.value === businessUnit)
  if (!unit) return ''

  const first = normalizeName(firstName)
  const last = normalizeName(lastName)

  if (!first || !last) return ''

  switch (pattern(unit)) {
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
