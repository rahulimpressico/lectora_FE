function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Dev: `/api` (Vite proxy to lectora_BE_refine — see vite.config.ts).
 * Prod: requires `VITE_API_BASE_URL` pointing at the deployed lectora_BE_refine
 * instance. No hardcoded fallback — a missing env var fails loudly instead of
 * silently talking to the wrong backend.
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return normalizeBaseUrl(fromEnv)
  if (import.meta.env.DEV) return '/api'
  throw new Error(
    'VITE_API_BASE_URL is not set — required in production to reach lectora_BE_refine.',
  )
}

export const API_BASE_URL = resolveApiBaseUrl()
