/** Error thrown by api/client when a request fails — preserves HTTP status. */
export class ApiClientError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

/** True for an Axios client-side timeout (the request never got a response). */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && /timeout of \d+ms exceeded/i.test(error.message)
}

/**
 * User-facing error text. Axios timeouts surface as a raw "timeout of
 * 300000ms exceeded" string — replace that with something actionable;
 * everything else falls back to the normalized error message.
 */
export function getDisplayErrorMessage(
  error: unknown,
  fallback = 'An error occurred. Please try again.',
): string {
  if (isTimeoutError(error)) {
    return 'This is taking longer than expected and timed out. Please try again — if it keeps happening, try smaller or fewer source documents.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function isExpiredJobError(error: unknown): boolean {
  if (error instanceof ApiClientError && error.status === 404) return true
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('unknown or expired jobid') ||
    message.includes('unknown jobid') ||
    message.includes('expired jobid') ||
    message.includes('job not found')
  )
}
