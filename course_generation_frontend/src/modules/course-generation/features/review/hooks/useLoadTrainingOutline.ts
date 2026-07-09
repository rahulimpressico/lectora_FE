import { useEffect } from 'react'
import { useCourseStore } from '../../onboarding-flow/store'

/**
 * Waits for store rehydration (localStorage restore), then backfills whichever
 * of TO / Rule Pack is still missing — e.g. `toData` came back from the real
 * generate-to API (no `rules` in that response) but `rulesData` never got
 * seeded. Whatever is already present (original generation or a user's
 * persisted edits) is left untouched.
 */
export function useLoadTrainingOutline() {
  const hasHydrated = useCourseStore((s) => s.hasHydrated)
  const toData = useCourseStore((s) => s.toData)
  const rulesData = useCourseStore((s) => s.rulesData)
  const hydratePresetTrainingOutline = useCourseStore((s) => s.hydratePresetTrainingOutline)

  useEffect(() => {
    if (!hasHydrated || (toData && rulesData)) return
    hydratePresetTrainingOutline()
  }, [hasHydrated, toData, rulesData, hydratePresetTrainingOutline])

  return {
    loading: !hasHydrated,
    error: null,
  }
}
