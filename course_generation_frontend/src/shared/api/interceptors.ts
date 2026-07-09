/** Request/response interceptors for the src/shared/api Axios instance. */
import type { AxiosError, AxiosInstance } from 'axios'
import { ApiError, type ApiErrorResponseBody } from './types'

function extractErrorMessage(error: AxiosError<ApiErrorResponseBody>): string {
  const data = error.response?.data

  if (data) {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .filter(Boolean)
        .join('; ')
    }
    if (typeof data.message === 'string') return data.message
    if (typeof data.error === 'string') return data.error
  }

  return error.message || 'An unexpected error occurred'
}

/** Attaches the request interceptor: currently a pass-through hook point for
 * future concerns (auth tokens, request IDs, etc.) without touching call sites. */
export function attachRequestInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error),
  )
}

/** Attaches the response interceptor: normalizes every failure into an ApiError
 * so callers can rely on `.message` and `.status` regardless of failure shape. */
export function attachResponseInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorResponseBody>) => {
      const message = extractErrorMessage(error)
      return Promise.reject(new ApiError(message, error.response?.status, error.response?.data))
    },
  )
}
