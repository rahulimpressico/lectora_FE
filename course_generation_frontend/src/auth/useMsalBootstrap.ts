import { useEffect, useState } from 'react'
import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'

export function useMsalBootstrap(
  instance: IPublicClientApplication,
  accounts: AccountInfo[],
): boolean {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const redirectResult = await instance.handleRedirectPromise()
        if (redirectResult?.account) {
          instance.setActiveAccount(redirectResult.account)
        } else if (accounts.length > 0 && !instance.getActiveAccount()) {
          instance.setActiveAccount(accounts[0])
        }
      } finally {
        if (!cancelled) {
          setInitialized(true)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [instance, accounts])

  return initialized
}
