/**
 * Centralized date formatting utility.
 * Use these functions everywhere instead of inline toLocaleDateString calls.
 */

const DATE_LOCALE = 'en-GB'

export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateLong(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString(DATE_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
