import { PublicClientApplication } from '@azure/msal-browser'
import { getMsalConfig, msalAuthEnabled } from '@/auth/msalConfig'

export const msalInstance = msalAuthEnabled()
  ? new PublicClientApplication(getMsalConfig())
  : null

export async function initializeMsal(): Promise<void> {
  if (msalInstance) {
    await msalInstance.initialize()
  }
}
