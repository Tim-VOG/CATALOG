// Fallback list mirroring the `business_units` table seed (migration 109).
//
// The canonical source of truth is the `business_units` DB table, edited
// from /admin/business-units. This array is a stable fallback for:
//   - unit tests (no Supabase client)
//   - first-paint dropdowns before the React Query fetch resolves
//   - generateCorporateEmail() callers that don't have the DB list yet
//
// Keep this in sync when you add or rename a BU in the DB seed.

export type EmailPattern = 'initial_last' | 'first' | 'initials'

export interface BusinessUnit {
  value: string
  domain: string
  emailPattern: EmailPattern
}

export const BUSINESS_UNITS: readonly BusinessUnit[] = [
  { value: 'VO GROUP',         domain: 'vo-group.be',       emailPattern: 'initial_last' },
  { value: 'THE LITTLE VOICE', domain: 'thelittlevoice.be', emailPattern: 'first' },
  { value: 'VO EUROPE',        domain: 'vo-europe.eu',      emailPattern: 'initial_last' },
  { value: 'VO EVENT',         domain: 'vo-event.be',       emailPattern: 'initial_last' },
  { value: 'MAX',              domain: 'vo-event-max.be',   emailPattern: 'first' },
  { value: 'SIGN BRUSSELS',    domain: 'sign.brussels',     emailPattern: 'initials' },
  { value: 'ART ON PAPER',     domain: 'artonpaper.be',     emailPattern: 'first' },
  { value: 'ACT-EVENTS',       domain: 'act-events.com',    emailPattern: 'initial_last' },
]
