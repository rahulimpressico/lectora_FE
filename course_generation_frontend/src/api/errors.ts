/** Error thrown by api/client when a request fails — preserves HTTP status. */
export class ApiClientError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
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
