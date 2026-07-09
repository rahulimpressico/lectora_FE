import { useEffect } from 'react'
import { useCourseStore } from '../../onboarding-flow/store'
import { readPersistedTOAndRules } from '../../onboarding-flow/store/utils'

/**
 * Reads TO / Rule Pack straight out of localStorage instead of waiting on
 * zustand persist's own rehydration flag — that flag can be left stuck
 * `false` by an unrelated zustand/devtools interaction even though the data
 * itself already landed in the store, which left this view stuck behind a
 * permanent loading spinner. Whatever is still missing after checking both
 * the live store and localStorage gets backfilled with the client preset.
 */
export function useLoadTrainingOutline() {
  const toData = useCourseStore((s) => s.toData)
  const rulesData = useCourseStore((s) => s.rulesData)
  const hydrateFromLocalStorageSnapshot = useCourseStore((s) => s.hydrateFromLocalStorageSnapshot)
  const hydratePresetTrainingOutline = useCourseStore((s) => s.hydratePresetTrainingOutline)

  useEffect(() => {
    if (toData && rulesData) return

    const persisted = readPersistedTOAndRules()

    if (persisted) {
      hydrateFromLocalStorageSnapshot({
        ...(!toData ? { toData: persisted.toData, updatedToData: persisted.updatedToData } : {}),
        ...(!rulesData ? { rulesData: persisted.rulesData, updatedRulesData: persisted.updatedRulesData } : {}),
      })
    }

    const stillNeedsTO = !toData && !persisted?.toData
    const stillNeedsRules = !rulesData && !persisted?.rulesData
    if (stillNeedsTO || stillNeedsRules) {
      hydratePresetTrainingOutline()
    }
  }, [toData, rulesData, hydrateFromLocalStorageSnapshot, hydratePresetTrainingOutline])

  return {
    loading: false,
    error: null,
  }
}
