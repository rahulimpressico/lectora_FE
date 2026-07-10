import { useMutation } from '@tanstack/react-query'
import { regenerateTimedOutline } from '../../onboarding-flow/step-7-outline-preference/api'
import { useCourseStore } from '../../onboarding-flow/store'
import { selectEffectiveTO } from '../../onboarding-flow/store/selectors'
import type { JsonObject } from '../../../types'

/**
 * Mutates the current effective Training Outline (the user's edit draft if
 * any, else the original) via the same `POST /regenerate-timed-outline`
 * endpoint used by the wizard's "Regenerate" step, together with an
 * optional user-supplied revision prompt. On success, the revised TO
 * becomes the new original — `setTOData` clears the prior edit draft and
 * dirty-tracking paths so the revision is treated as the new baseline.
 */
export function useReviseTO() {
  const { toData, updatedToData, setTOData } = useCourseStore()
  const effectiveTO = selectEffectiveTO({ toData, updatedToData })

  const mutation = useMutation({
    retry: false,
    mutationFn: async (revisionPrompt: string) => {
      if (!effectiveTO) throw new Error('No Training Outline loaded.')
      const trimmed = revisionPrompt.trim()
      return regenerateTimedOutline({
        currentTo: effectiveTO as JsonObject,
        regenerationPrompt: trimmed ? trimmed : undefined,
      })
    },
    onSuccess: ({ to }) => {
      setTOData(to as JsonObject)
    },
  })

  return {
    revise: (prompt: string) => mutation.mutate(prompt),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error instanceof Error ? mutation.error : null,
    reset: mutation.reset,
  }
}
