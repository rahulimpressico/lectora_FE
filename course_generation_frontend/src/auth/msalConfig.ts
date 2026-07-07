import type { Configuration, PopupRequest, SilentRequest } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID?.trim() ?? ''
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID?.trim() ?? ''
const apiScope = import.meta.env.VITE_AZURE_API_SCOPE?.trim() ?? ''
const redirectUri =
  import.meta.env.VITE_AZURE_REDIRECT_URI?.trim() || window.location.origin

// Simulated access-token lifetime in minutes; clamped to 15–60, default 30.
const DEFAULT_REFRESH_MINUTES = 30
const rawRefreshMinutes = Number(import.meta.env.VITE_AZURE_TOKEN_REFRESH_MINUTES)

function parseScopes(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean)
}

/** Identity / consent scopes from `VITE_AZURE_SCOPES` (comma-separated). */
const identityScopes = parseScopes(import.meta.env.VITE_AZURE_SCOPES)

/** Login and session-refresh scopes: identity scopes plus the backend API scope. */
function getAuthScopes(): string[] {
  const scopes = [...identityScopes]
  if (apiScope && !scopes.includes(apiScope)) {
    scopes.push(apiScope)
  }
  return scopes
}

export function msalAuthEnabled(): boolean {
  return Boolean(tenantId && clientId)
}

/**
 * Names of required MSAL environment variables that are missing/blank.
 *
 * These are mandatory in EVERY environment (local, UAT, production) — there is
 * no bypass. `VITE_AZURE_REDIRECT_URI` is intentionally excluded because it
 * safely falls back to `window.location.origin`.
 */
export function getMissingAuthConfig(): string[] {
  const missing: string[] = []
  if (!tenantId) missing.push('VITE_AZURE_TENANT_ID')
  if (!clientId) missing.push('VITE_AZURE_CLIENT_ID')
  if (!apiScope) missing.push('VITE_AZURE_API_SCOPE')
  return missing
}

/** True only when all required MSAL configuration is present. */
export function isAuthConfigValid(): boolean {
  return getMissingAuthConfig().length === 0
}

export function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri,
      postLogoutRedirectUri: redirectUri,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  }
}

export function getLoginRequest(): PopupRequest {
  return { scopes: getAuthScopes() }
}

export function getTokenRequest(): Omit<SilentRequest, 'account'> {
  return { scopes: getAuthScopes() }
}

/** Session-refresh request — identity scopes only (no backend API scope). */
export function getIdentityTokenRequest(): Omit<SilentRequest, 'account'> {
  return { scopes: identityScopes }
}

/**
 * The backend API scope (`VITE_AZURE_API_SCOPE`, e.g.
 * `api://<app-id>/access_as_user`). Empty string when not configured.
 * A token minted for this scope is what the backend validates — Graph scopes
 * like `User.Read`/`openid` are NOT accepted by the API.
 */
export function getApiScope(): string {
  return apiScope
}

/** Silent-token request scoped to the backend API (not Graph). */
export function getApiTokenRequest(): Omit<SilentRequest, 'account'> {
  return { scopes: [apiScope] }
}

export function getTokenRefreshMs(): number {
  const minutes =
    Number.isFinite(rawRefreshMinutes) && rawRefreshMinutes > 0
      ? rawRefreshMinutes
      : DEFAULT_REFRESH_MINUTES
  return Math.min(60, Math.max(15, minutes)) * 60 * 1000
}
