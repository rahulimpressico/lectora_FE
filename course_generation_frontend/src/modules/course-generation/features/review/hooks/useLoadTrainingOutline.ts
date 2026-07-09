import { useEffect } from 'react'
import { useCourseStore } from '../../onboarding-flow/store'

/**
 * Waits for store rehydration, then seeds preset TO/rules into the persisted
 * store only when nothing was restored from localStorage.
 */
export function useLoadTrainingOutline() {
  const hasHydrated = useCourseStore((s) => s.hasHydrated)
  const toData = useCourseStore((s) => s.toData)
  const hydratePresetTrainingOutline = useCourseStore((s) => s.hydratePresetTrainingOutline)

  useEffect(() => {
    if (!hasHydrated || toData) return
    hydratePresetTrainingOutline()
  }, [hasHydrated, toData, hydratePresetTrainingOutline])

  return {
    loading: !hasHydrated,
    error: null,
  }
}
