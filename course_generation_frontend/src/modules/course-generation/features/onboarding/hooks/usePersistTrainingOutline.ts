import { useMutation } from '@tanstack/react-query'
import { saveTrainingOutline } from '@/api/course-generation/api'
import { useCourseStore } from '../../../store/courseStore'
import { resolveTrainingOutlineBlobPath } from '../../../utils/resolveTrainingOutlineBlobPath'
import type { JsonObject } from '../../../types'

export function usePersistTrainingOutline() {
  const setGeneratedToBlobPath = useCourseStore((s) => s.setGeneratedToBlobPath)
  const setTOData = useCourseStore((s) => s.setTOData)

  return useMutation({
    mutationFn: async () => {
      const {
        toData,
        rulesData,
        generatedToBlobPath,
        uploadFolder,
        rawDocuments,
      } = useCourseStore.getState()

      if (!toData) {
        throw new Error('No Training Outline is available to save.')
      }

      const blobPath = resolveTrainingOutlineBlobPath({
        generatedToBlobPath,
        uploadFolder,
        rawDocuments,
      })

      if (!blobPath) {
        throw new Error(
          'Could not determine where to save the Training Outline. Upload source materials first.',
        )
      }

      const saved = await saveTrainingOutline(
        blobPath,
        toData as Record<string, unknown>,
        (rulesData as JsonObject | null) ?? null,
      )

      setGeneratedToBlobPath(saved.blobPath)
      setTOData(toData, toData)

      return saved
    },
  })
}
