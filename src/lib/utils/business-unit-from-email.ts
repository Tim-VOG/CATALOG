import { BUSINESS_UNITS, type BusinessUnit } from '@/lib/constants/business-units'

// Accept both the constant shape and the DB row shape (only `value` +
// `domain` are needed here), so callers can pass useBusinessUnits().data
// straight through.
type DbBusinessUnit = { value: string; domain: string }
type AnyBusinessUnit = BusinessUnit | DbBusinessUnit

/**
 * Derive a business unit from an email address by matching its domain
 * against the known business units.
 *
 * Used to determine a manager's business unit automatically from their
 * corporate email (e.g. jdupont@vo-europe.eu → "VO EUROPE") instead of
 * relying on an admin having filled `profiles.business_unit` by hand.
 *
 * Returns the BU `value` (e.g. "VO EUROPE") or null when the email is
 * missing/malformed or its domain matches no known business unit.
 */
export function businessUnitFromEmail(
  email: string | null | undefined,
  units: readonly AnyBusinessUnit[] = BUSINESS_UNITS,
): string | null {
  if (!email) return null

  const at = email.lastIndexOf('@')
  if (at < 0) return null

  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain) return null

  const match = units.find((u: any) => u.domain.toLowerCase() === domain)
  return match ? match.value : null
}
