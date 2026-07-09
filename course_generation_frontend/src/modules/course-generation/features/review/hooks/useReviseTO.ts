import { useMutation } from '@tanstack/react-query'
import { reviseTO } from '@/api/course-generation/api'
import { useCourseStore } from '../../onboarding-flow/store'
import { selectEffectiveTO } from '../../onboarding-flow/store/selectors'
import type { JsonObject } from '../../../types'

/**
 * Mutates the current effective Training Outline (the user's edit draft if
 * any, else the original) by sending it to the LLM together with a
 * user-supplied revision prompt. On success, the revised TO becomes the new
 * original — `setTOData` clears the prior edit draft and dirty-tracking
 * paths so the revision is treated as the new baseline.
 */
export function useReviseTO() {
  const { toData, updatedToData, setTOData } = useCourseStore()
  const effectiveTO = selectEffectiveTO({ toData, updatedToData })

  const mutation = useMutation({
    retry: false,
    mutationFn: async (revisionPrompt: string) => {
      if (!effectiveTO) throw new Error('No Training Outline loaded.')
      return reviseTO(effectiveTO as Record<string, unknown>, revisionPrompt)
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
