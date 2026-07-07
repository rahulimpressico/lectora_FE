import type { Configuration, PopupRequest, SilentRequest } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID?.trim() ?? ''
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID?.trim() ?? ''
const apiScope = import.meta.env.VITE_AZURE_API_SCOPE?.trim() ?? ''
const redirectUri =
  import.meta.env.VITE_AZURE_REDIRECT_URI?.trim() || window.location.origin

// Simulated access-token lifetime in minutes; clamped to 15–60, default 30.
const DEFAULT_REFRESH_MINUTES = 30
const rawRefreshMinutes = Number(import.meta.env.VITE_AZURE_TOKEN_REFRESH_MINUTES)

const SCOPES = ['openid', 'profile', 'User.Read', ...(apiScope ? [apiScope] : [])]

export function msalAuthEnabled(): boolean {
  return Boolean(tenantId && clientId)
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
  return { scopes: SCOPES }
}

export function getTokenRequest(): Omit<SilentRequest, 'account'> {
  return { scopes: SCOPES }
}

export function getTokenRefreshMs(): number {
  const minutes =
    Number.isFinite(rawRefreshMinutes) && rawRefreshMinutes > 0
      ? rawRefreshMinutes
      : DEFAULT_REFRESH_MINUTES
  return Math.min(60, Math.max(15, minutes)) * 60 * 1000
}
