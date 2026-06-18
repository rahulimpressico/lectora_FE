/**
 * Shared date-formatting utilities for storage entries.
 * Uses Intl.DateTimeFormat so output respects the user's locale.
 */

const _shortFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const _dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/**
 * Format an ISO timestamp as "Jun 9, 2026, 02:47 PM".
 * Returns null when iso is undefined or unparseable.
 */
export function formatStorageDate(iso?: string): string | null {
  if (!iso) return null
  try {
    return _shortFmt.format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Format an ISO timestamp as a date-only string: "Jun 9, 2026".
 * Returns null when iso is undefined or unparseable.
 */
export function formatStorageDateShort(iso?: string): string | null {
  if (!iso) return null
  try {
    return _dateFmt.format(new Date(iso))
  } catch {
    return iso
  }
}
