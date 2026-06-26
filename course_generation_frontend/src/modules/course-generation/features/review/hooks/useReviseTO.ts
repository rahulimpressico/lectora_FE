import { useMutation } from '@tanstack/react-query'
import { reviseTO } from '@/api/course-generation/api'
import { useCourseStore } from '../../../store/courseStore'
import type { JsonObject } from '../../../types'

/**
 * Mutates the current Training Outline by sending it to the LLM together with
 * a user-supplied revision prompt.  On success, updates `toData` in the store
 * (preserving the original for reset) and clears all dirty-tracking paths so
 * the revised outline is treated as the new baseline.
 */
export function useReviseTO() {
  const { toData, setTOData } = useCourseStore()

  const mutation = useMutation({
    retry: false,
    mutationFn: async (revisionPrompt: string) => {
      if (!toData) throw new Error('No Training Outline loaded.')
      return reviseTO(toData as Record<string, unknown>, revisionPrompt)
    },
    onSuccess: ({ to }) => {
      setTOData(to as JsonObject, to as JsonObject)
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
