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
]
