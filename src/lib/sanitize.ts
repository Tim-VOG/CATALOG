/**
 * Trim + cap a search query before it hits Supabase `.ilike()` filters.
 * Strips PostgREST control chars that could break the filter syntax,
 * caps at 64 characters to prevent log-flooding & cheap DoS.
 */
export function sanitizeSearch(value: unknown, max = 64): string {
  if (value == null) return ''
  return String(value)
    .replace(/[%,]/g, ' ')   // % is the wildcard, comma splits .or() args
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
