/**
 * api/client.ts — shared Axios instance used by every API module.
 *
 * Single source of truth for base URL, default timeouts, and response
 * error normalisation. Import this instead of creating ad-hoc Axios instances.
 */
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
})

apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

export default apiClient
