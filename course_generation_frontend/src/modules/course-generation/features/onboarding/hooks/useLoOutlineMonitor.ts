import { useCallback, useEffect, useRef, useState } from 'react'
import { useCourseStore } from '../../../store/courseStore'
import {
  runLoOutlineSync,
  type LoSyncResult,
} from '../utils/loOutlineSync'

/**
 * Watches learning-objective changes, validates them, maps to the current
 * outline, and invalidates stale outlines when LO text changes.
 */
export function useLoOutlineMonitor() {
  const toData = useCourseStore((s) => s.toData)
  const objectives = useCourseStore((s) => s.wizardData.objectives)
  const markOutlineStaleFromObjectivesChange = useCourseStore((s) => s.markOutlineStaleFromObjectivesChange)
  const syncOutlineObjectives = useCourseStore((s) => s.syncOutlineObjectives)

  const previousObjectivesRef = useRef<string[]>(objectives)
  const [syncStatus, setSyncStatus] = useState<LoSyncResult | null>(null)

  const runSync = useCallback(
    (nextObjectives: string[], options?: { invalidateOutline?: boolean }) => {
      const previous = previousObjectivesRef.current
      const changed =
        nextObjectives.length !== previous.length ||
        nextObjectives.some((item, index) => item.trim() !== (previous[index] ?? '').trim())

      let outlineInvalidated = false
      if (changed && options?.invalidateOutline !== false) {
        outlineInvalidated = markOutlineStaleFromObjectivesChange(nextObjectives)
      }

      if (!outlineInvalidated && toData && nextObjectives.length > 0) {
        syncOutlineObjectives(nextObjectives)
      }

      const result = runLoOutlineSync({
        objectives: nextObjectives,
        previousObjectives: previous,
        toData: outlineInvalidated ? null : useCourseStore.getState().toData,
        outlineInvalidated,
      })

      previousObjectivesRef.current = nextObjectives
      setSyncStatus(result)
      return result
    },
    [markOutlineStaleFromObjectivesChange, syncOutlineObjectives, toData],
  )

  useEffect(() => {
    runSync(objectives)
    // Re-run when outline or objectives change from outside this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectives, toData])

  return { syncStatus, runSync }
}
