/**
 * api/client.ts — shared Axios instance used by every API module.
 *
 * Single source of truth for base URL, default timeouts, and response
 * error normalisation. Import this instead of creating ad-hoc Axios instances.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { ApiClientError } from '@/api/errors'
import {
  getAccessToken,
  MissingApiScopeError,
  NoActiveAccountError,
  InteractiveAuthRequiredError,
  ApiTokenAcquisitionError,
  isAccessTokenError,
} from '@/auth/getAccessToken'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
})

/** Timeout for slow LLM-backed calls (TO generate/regenerate/revise/upload). */
export const LLM_REQUEST_TIMEOUT_MS = 10 * 60 * 1_000
/**
 * Map typed auth/token errors to `ApiClientError` so callers get a consistent
 * shape. Re-throws anything that is not a known access-token error.
 */
function toApiClientAuthError(error: unknown): ApiClientError {
  if (error instanceof MissingApiScopeError) {
    console.error('[auth]', error.message)
    return new ApiClientError(error.message, 500)
  }

  if (error instanceof NoActiveAccountError) {
    console.error('[auth]', error.message)
    return new ApiClientError(error.message, 401)
  }

  if (error instanceof InteractiveAuthRequiredError) {
    console.error('[auth]', error.message, error.cause ?? '')
    return new ApiClientError(error.message, 401)
  }

  if (error instanceof ApiTokenAcquisitionError) {
    console.error('[auth]', error.message, error.cause ?? '')
    return new ApiClientError(error.message, 403)
  }

  if (isAccessTokenError(error)) {
    return new ApiClientError(error.message)
  }

  throw error
}

/**
 * Auth request interceptor.
 *
 * Every request made through this client is treated as protected: we attach a
 * fresh MSAL access token (`Authorization: Bearer <token>`) before the request
 * leaves the browser. There is no public/protected split — all backend routes
 * behind `apiClient` require auth. If a token cannot be acquired the request is
 * rejected so no unauthenticated call ever reaches the backend.
 *
 * Remaining gaps (not covered here): SSE `EventSource`, `<img src>`/`<a href>`
 * via `storageFileUrl`, and any raw `fetch()` calls.
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken()
      config.headers.set('Authorization', `Bearer ${token}`)
      return config
    } catch (error) {
      return Promise.reject(toApiClientAuthError(error))
    }
  },
  (error) => Promise.reject(error),
)

function normalizeErrorMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeErrorMessage(item))
      .filter(Boolean)
    return parts.join('; ')
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message
    }
    if (typeof record.detail === 'string' && record.detail.trim()) {
      return record.detail
    }
    if (Array.isArray(record.detail)) {
      const detail = normalizeErrorMessage(record.detail)
      if (detail) return detail
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    let payload = error.response?.data

    // Blob downloads (`responseType: 'blob'`) still return JSON error bodies as
    // Blobs — parse them so callers get the real `detail` / `message`.
    if (payload instanceof Blob) {
      try {
        const text = await payload.text()
        payload = text ? JSON.parse(text) : undefined
      } catch {
        payload = undefined
      }
    }

    const message = normalizeErrorMessage(
      payload?.detail ??
        payload?.message ??
        error.message ??
        'An unexpected error occurred',
    )
    return Promise.reject(
      new ApiClientError(message, error.response?.status),
    )
  },
)

export default apiClient
