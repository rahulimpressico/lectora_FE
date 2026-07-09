/**
 * shared/api/axios.ts — centralized Axios instance.
 *
 * Base URL comes from `VITE_API_BASE_URL` (falls back to the Vite dev proxy
 * path `/api` in development). Every other file in shared/api builds on top
 * of this single instance instead of creating ad-hoc ones.
 */
import axios from 'axios'
import { attachRequestInterceptor, attachResponseInterceptor } from './interceptors'

const DEFAULT_TIMEOUT_MS = 60_000

function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return import.meta.env.DEV ? '/api' : ''
}

export const axiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

attachRequestInterceptor(axiosInstance)
attachResponseInterceptor(axiosInstance)

export default axiosInstance
