import { useMutation, type MutateOptions } from '@tanstack/react-query'
import { useCourseStore } from '../../store'
import { normalizeTrainingOutlineForPanel } from '../../../review/utils/trainingOutlinePanel'
import { regenerateTimedOutline } from '../../step-7-outline-preference/api'
import type { RegenerateTimedOutlineResponse } from '../../step-7-outline-preference/types'

/**
 * Drives Training Outline regeneration against `POST /documents/regenerate-timed-outline`.
 * Unlike `useGenerateTO`, this reuses the existing `toData` as a starting point and applies
 * a free-form `regenerationPrompt` describing what to change.
 */
export function useRegenerateTO() {
  const { toData, courseTypeHint, setTOData, wizardData } = useCourseStore()

  const mutation = useMutation({
    retry: false,
    mutationFn: async (regenerationPrompt: string) => {
      if (!toData) {
        throw new Error('No existing outline to regenerate.')
      }
      if (!regenerationPrompt.trim()) {
        throw new Error('Please describe what you want to change before regenerating.')
      }

      const preferredChapters = wizardData.preferredChapters
        ? Number(wizardData.preferredChapters)
        : undefined
      const validPreferredChapters =
        preferredChapters != null && !Number.isNaN(preferredChapters) ? preferredChapters : undefined

      return regenerateTimedOutline({
        currentTo: toData,
        regenerationPrompt: regenerationPrompt.trim(),
        preferredChapters: validPreferredChapters,
        lessonStyle: wizardData.lessonStyle,
      })
    },
    onSuccess: (result) => {
      const normalizedTo = normalizeTrainingOutlineForPanel(result.to, courseTypeHint)
      setTOData(normalizedTo, normalizedTo)
    },
  })

  return {
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error instanceof Error ? mutation.error : null,
    mutate: (
      regenerationPrompt: string,
      options?: MutateOptions<RegenerateTimedOutlineResponse, Error, string>,
    ) => mutation.mutate(regenerationPrompt, options),
    reset: mutation.reset,
  }
}
