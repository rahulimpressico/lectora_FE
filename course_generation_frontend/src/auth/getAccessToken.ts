/**
 * auth/getAccessToken.ts
 *
 * Single source of truth for acquiring a backend-API access token from MSAL.
 *
 * Tokens are always fetched fresh via `acquireTokenSilent()` (MSAL manages its
 * own encrypted cache internally). We never read/write access tokens from
 * localStorage/sessionStorage ourselves, and no client secret is involved.
 */
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { msalInstance } from '@/auth/msalInstance'
import { getApiScope, getApiTokenRequest } from '@/auth/msalConfig'

/** Backend API scope (`VITE_AZURE_API_SCOPE`) is not configured. */
export class MissingApiScopeError extends Error {
  constructor() {
    super(
      'VITE_AZURE_API_SCOPE is not configured. A backend API access token ' +
        'cannot be requested — set VITE_AZURE_API_SCOPE (e.g. ' +
        'api://<app-id>/access_as_user) and expose that scope in the Entra app.',
    )
    this.name = 'MissingApiScopeError'
  }
}

/**
 * Interactive sign-in is required before a token can be obtained (no account,
 * or the refresh token expired). The auth layer / route guard should surface a
 * login redirect; the API call must NOT proceed unauthenticated.
 */
export class InteractiveAuthRequiredError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'InteractiveAuthRequiredError'
    if (options?.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

/**
 * Acquire a backend-API access token for the active MSAL account.
 *
 * - Resolves the active account, promoting a cached account if none is active.
 * - Requests the configured backend API scope (not Graph/openid/profile).
 * - Returns `result.accessToken` (never stored manually).
 *
 * Throws:
 * - `MissingApiScopeError` when the backend scope is not configured.
 * - `InteractiveAuthRequiredError` when there is no usable account or silent
 *   acquisition needs interaction — the caller/auth layer handles login.
 * - Any other MSAL/network error is re-thrown unchanged (never swallowed).
 */
export async function getAccessToken(): Promise<string> {
  if (!msalInstance) {
    throw new InteractiveAuthRequiredError(
      'MSAL is not initialized; cannot acquire an access token.',
    )
  }

  if (!getApiScope()) {
    throw new MissingApiScopeError()
  }

  // Ensure there is an active account; promote a cached one if needed.
  let account = msalInstance.getActiveAccount()
  if (!account) {
    const cached = msalInstance.getAllAccounts()
    if (cached.length > 0) {
      account = cached[0]
      msalInstance.setActiveAccount(account)
    }
  }

  if (!account) {
    throw new InteractiveAuthRequiredError(
      'No active Microsoft account; interactive sign-in is required.',
    )
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...getApiTokenRequest(),
      account,
    })
    return result.accessToken
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      throw new InteractiveAuthRequiredError(
        'Silent token acquisition failed; interactive sign-in is required.',
        { cause: error },
      )
    }
    // Do not swallow — network/config/other errors propagate to the caller.
    throw error
  }
}
