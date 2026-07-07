import type { Configuration, PopupRequest } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID?.trim() ?? ''
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID?.trim() ?? ''
const apiScope = import.meta.env.VITE_AZURE_API_SCOPE?.trim() ?? ''

export function msalAuthEnabled(): boolean {
  return Boolean(tenantId && clientId)
}

export function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: `${window.location.origin}/login`,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  }
}

export function getLoginRequest(): PopupRequest {
  const scopes = ['openid', 'profile', 'User.Read']
  if (apiScope) {
    scopes.push(apiScope)
  }
  return { scopes }
}
