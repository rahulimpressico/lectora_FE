/**
 * api/client.ts — shared Axios instance used by every API module.
 *
 * Single source of truth for base URL, default timeouts, and response
 * error normalisation. Import this instead of creating ad-hoc Axios instances.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { ApiClientError } from '@/api/errors'
import { getAccessToken } from '@/auth/getAccessToken'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
})

/**
 * Auth request interceptor.
 *
 * Every request made through this client is treated as protected: we attach a
 * fresh MSAL access token (`Authorization: Bearer <token>`) before the request
 * leaves the browser. There is no public/protected split — all backend routes
 * behind `apiClient` require auth. If a token cannot be acquired the request is
 * rejected so no unauthenticated call ever reaches the backend.
 *
 * Note: browser-native requests that bypass axios (SSE `EventSource`,
 * `<img src>`/`<a href>` via `storageFileUrl`) are NOT covered here — see the
 * review notes for those gaps.
 */
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken()
    config.headers.set('Authorization', `Bearer ${token}`)
    return config
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
  (error) => {
    const message = normalizeErrorMessage(
      error.response?.data?.detail ??
        error.response?.data?.message ??
        error.message ??
        'An unexpected error occurred',
    )
    return Promise.reject(
      new ApiClientError(message, error.response?.status),
    )
  },
)

export default apiClient
