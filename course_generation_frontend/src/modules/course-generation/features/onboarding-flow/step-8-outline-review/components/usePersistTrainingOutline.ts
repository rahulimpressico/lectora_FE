import { useMutation } from '@tanstack/react-query'
import { useCourseStore } from '../../store'
import { resolveTrainingOutlineBlobPath } from '../../../../utils/resolveTrainingOutlineBlobPath'

export function usePersistTrainingOutline() {
  const setGeneratedToBlobPath = useCourseStore((s) => s.setGeneratedToBlobPath)
  const setTOData = useCourseStore((s) => s.setTOData)

  return useMutation({
    mutationFn: async () => {
      const {
        toData,
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

      setGeneratedToBlobPath(blobPath)
      setTOData(toData, toData)

      return { blobPath }
    },
  })
}
