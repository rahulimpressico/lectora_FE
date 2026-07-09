/**
 * auth/getAccessToken.ts
 *
 * Single source of truth for acquiring a backend-API access token from MSAL.
 *
 * Tokens are always fetched fresh via `acquireTokenSilent()` (MSAL manages its
 * own encrypted cache internally). We never read/write access tokens from
 * localStorage/sessionStorage ourselves, and no client secret is involved.
 */
import {
  AuthError,
  BrowserAuthError,
  InteractionRequiredAuthError,
} from '@azure/msal-browser'
import type { AccountInfo } from '@azure/msal-browser'
import { msalInstance } from '@/auth/msalInstance'
import { getApiScope, getApiTokenRequest } from '@/auth/msalConfig'

const CONSENT_ERROR_CODES = new Set([
  'consent_required',
  'invalid_grant',
  'interaction_required',
])

const CONSENT_MESSAGE_PATTERNS = [
  /AADSTS65001/i,
  /AADSTS90094/i,
  /admin consent/i,
  /has not consented/i,
  /consent.*required/i,
  /need admin approval/i,
]

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

/** No MSAL account is available to acquire an API access token. */
export class NoActiveAccountError extends Error {
  constructor() {
    super(
      'No active Microsoft account is available. Sign in before calling protected APIs.',
    )
    this.name = 'NoActiveAccountError'
  }
}

/**
 * Interactive sign-in is required before a token can be obtained (MSAL session
 * expired or silent acquisition needs user interaction). Does not clear account
 * state — the route guard handles re-login.
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
 * Backend API access token could not be acquired (consent, config, network, etc.).
 * The MSAL account/session is left intact — only the API request is blocked.
 */
export class ApiTokenAcquisitionError extends Error {
  readonly scope: string

  constructor(message: string, options: { scope: string; cause?: unknown }) {
    super(message)
    this.name = 'ApiTokenAcquisitionError'
    this.scope = options.scope
    if (options.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

function errorText(error: unknown): string {
  if (error instanceof AuthError) {
    return `${error.errorCode} ${error.errorMessage} ${error.message}`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

/** True when MSAL indicates admin/user consent is required for the API scope. */
export function isApiPermissionError(error: unknown): boolean {
  const text = errorText(error)

  if (error instanceof BrowserAuthError || error instanceof AuthError) {
    if (CONSENT_ERROR_CODES.has(error.errorCode)) return true
  }

  return CONSENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(text))
}

/** All typed errors that can be thrown by `getAccessToken()`. */
export type AccessTokenError =
  | MissingApiScopeError
  | NoActiveAccountError
  | InteractiveAuthRequiredError
  | ApiTokenAcquisitionError

export function isAccessTokenError(error: unknown): error is AccessTokenError {
  return (
    error instanceof MissingApiScopeError ||
    error instanceof NoActiveAccountError ||
    error instanceof InteractiveAuthRequiredError ||
    error instanceof ApiTokenAcquisitionError
  )
}

/**
 * Resolve the active MSAL account, promoting the first cached account if needed.
 * Does not mutate AuthContext state — only MSAL's active account pointer.
 */
function resolveActiveAccount(): AccountInfo | null {
  if (!msalInstance) return null

  let account = msalInstance.getActiveAccount()
  if (!account) {
    const cached = msalInstance.getAllAccounts()
    if (cached.length > 0) {
      account = cached[0]
      msalInstance.setActiveAccount(account)
    }
  }
  return account
}

/**
 * Acquire a backend-API access token for the active MSAL account.
 *
 * - Resolves the active account, promoting a cached account if none is active.
 * - Requests only `VITE_AZURE_API_SCOPE` (not Graph/openid/profile).
 * - Returns `result.accessToken` (never the ID token; never stored manually).
 *
 * Throws typed errors — never clears MSAL account state.
 */
export async function getAccessToken(): Promise<string> {
  const scope = getApiScope()
  if (!scope) {
    throw new MissingApiScopeError()
  }

  if (!msalInstance) {
    throw new ApiTokenAcquisitionError(
      'MSAL is not initialized; cannot acquire a backend API access token.',
      { scope },
    )
  }

  const account = resolveActiveAccount()
  if (!account) {
    throw new NoActiveAccountError()
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...getApiTokenRequest(),
      account,
    })

    if (!result.accessToken) {
      throw new ApiTokenAcquisitionError(
        `acquireTokenSilent succeeded but returned no access token for scope "${scope}".`,
        { scope },
      )
    }

    return result.accessToken
  } catch (error) {
    if (isAccessTokenError(error)) {
      throw error
    }

    if (isApiPermissionError(error)) {
      const permissionError = new ApiTokenAcquisitionError(
        `API permission/admin consent required for scope "${scope}".`,
        { scope, cause: error },
      )
      console.error('[auth]', permissionError.message, error)
      throw permissionError
    }

    if (error instanceof InteractionRequiredAuthError) {
      // Stale sessions often have identity tokens but no API-scope token yet.
      // Trigger a one-time interactive consent flow instead of failing silently.
      try {
        await msalInstance.acquireTokenRedirect({
          ...getApiTokenRequest(),
          account,
        })
      } catch (redirectError) {
        console.error('[auth] acquireTokenRedirect failed', redirectError)
      }
      throw new InteractiveAuthRequiredError(
        'API access requires Microsoft sign-in consent. Redirecting…',
        { cause: error },
      )
    }

    const acquisitionError = new ApiTokenAcquisitionError(
      `Failed to acquire backend API access token for scope "${scope}".`,
      { scope, cause: error },
    )
    console.error('[auth]', acquisitionError.message, error)
    throw acquisitionError
  }
}
