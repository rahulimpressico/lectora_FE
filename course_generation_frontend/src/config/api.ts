const DEFAULT_PROD_API = 'https://lectora-course-gen-engine.onrender.com'

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

/** Dev: `/api` (Vite proxy). Prod: Render BE directly (override with VITE_API_BASE_URL). */
export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return normalizeBaseUrl(fromEnv)
  if (import.meta.env.DEV) return '/api'
  return DEFAULT_PROD_API
}

export const API_BASE_URL = resolveApiBaseUrl()
