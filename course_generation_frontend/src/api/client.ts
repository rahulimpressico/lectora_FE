/**
 * api/client.ts — shared Axios instance used by every API module.
 *
 * Single source of truth for base URL, default timeouts, and response
 * error normalisation. Import this instead of creating ad-hoc Axios instances.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { ApiClientError } from '@/api/errors'

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
  withCredentials: true,
})

apiClient.interceptors.request.use(
  (config) => config,
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
    const requestUrl = String(error.config?.url ?? '')
    if (
      error.response?.status === 401 &&
      !requestUrl.includes('/login') &&
      !requestUrl.includes('/auth/me')
    ) {
      unauthorizedHandler?.()
    }

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
