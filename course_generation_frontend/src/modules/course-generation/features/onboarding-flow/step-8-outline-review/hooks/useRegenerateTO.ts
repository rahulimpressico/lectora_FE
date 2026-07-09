import { useMutation, type MutateOptions } from '@tanstack/react-query'
import { useCourseStore } from '../../store'
import { selectEffectiveTO } from '../../store/selectors'
import { normalizeTrainingOutlineForPanel } from '../../../review/utils/trainingOutlinePanel'
import { regenerateTimedOutline } from '../../step-7-outline-preference/api'
import type { RegenerateTimedOutlineResponse } from '../../step-7-outline-preference/types'

/**
 * Drives Training Outline regeneration against `POST /documents/regenerate-timed-outline`.
 * Unlike `useGenerateTO`, this sends the current effective TO (the user's edit
 * draft if any, else the original) as a starting point, plus a free-form
 * `regenerationPrompt` describing what to change. The result becomes the new
 * original — `setTOData` clears any prior edit draft.
 */
export function useRegenerateTO() {
  const { toData, updatedToData, courseTypeHint, courseCode, setTOData, wizardData } = useCourseStore()
  const effectiveTO = selectEffectiveTO({ toData, updatedToData })

  const mutation = useMutation({
    retry: false,
    mutationFn: async (regenerationPrompt: string) => {
      if (!effectiveTO) {
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
        currentTo: effectiveTO,
        regenerationPrompt: regenerationPrompt.trim(),
        preferredChapters: validPreferredChapters,
        lessonStyle: wizardData.lessonStyle,
      })
    },
    onSuccess: (result) => {
      const normalizedTo = normalizeTrainingOutlineForPanel(result.to, courseTypeHint, courseCode)
      setTOData(normalizedTo)
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
