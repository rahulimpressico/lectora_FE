/** Shared types for the src/shared/api Axios infrastructure. */

/** Standard success envelope returned by Lectora_BE endpoints. */
export interface ApiEnvelope<T> {
  success: boolean
  data: T
}

/** Shape of a typical FastAPI/Lectora_BE error response body. */
export interface ApiErrorResponseBody {
  detail?: unknown
  message?: string
  error?: string
}

/** Normalized error thrown by the response interceptor for every failed request. */
export class ApiError extends Error {
  readonly status?: number
  readonly details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}
