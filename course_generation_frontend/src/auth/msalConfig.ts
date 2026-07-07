import type { Configuration, PopupRequest, SilentRequest } from '@azure/msal-browser'

// Auth is always on. Tenant/client IDs are NOT secrets (they are sent in the
// public sign-in URL), so we ship defaults and let env vars override them.
const DEFAULT_TENANT_ID = '59abe6c5-fee5-4332-b2dd-5935ec367903'
const DEFAULT_CLIENT_ID = 'f9b43fd2-0414-4454-a4e2-acb5e22a5eb8'

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID?.trim() || DEFAULT_TENANT_ID
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID
const apiScope = import.meta.env.VITE_AZURE_API_SCOPE?.trim() ?? ''
const redirectUri =
  import.meta.env.VITE_AZURE_REDIRECT_URI?.trim() || window.location.origin

// Simulated access-token lifetime in minutes; clamped to 15–60, default 30.
const DEFAULT_REFRESH_MINUTES = 30
const rawRefreshMinutes = Number(import.meta.env.VITE_AZURE_TOKEN_REFRESH_MINUTES)

const SCOPES = ['openid', 'profile', 'User.Read', ...(apiScope ? [apiScope] : [])]

// Always enabled — defaults guarantee tenant/client IDs are present.
export function msalAuthEnabled(): boolean {
  return true
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
