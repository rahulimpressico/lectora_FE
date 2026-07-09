import { useMutation } from '@tanstack/react-query'
import { useCourseStore } from '../../store'
import { selectEffectiveTO } from '../../store/selectors'
import { resolveTrainingOutlineBlobPath } from '../../../../utils/resolveTrainingOutlineBlobPath'

/**
 * "Enter Workspace" persistence step: commits whatever the user is currently
 * looking at (their edit draft, if any, else the original generation) as the
 * new original TO before moving into the three-panel view.
 */
export function usePersistTrainingOutline() {
  const setGeneratedToBlobPath = useCourseStore((s) => s.setGeneratedToBlobPath)
  const setTOData = useCourseStore((s) => s.setTOData)

  return useMutation({
    mutationFn: async () => {
      const {
        toData,
        updatedToData,
        generatedToBlobPath,
        uploadFolder,
        rawDocuments,
      } = useCourseStore.getState()

      const effectiveTO = selectEffectiveTO({ toData, updatedToData })
      if (!effectiveTO) {
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
      setTOData(effectiveTO)

      return { blobPath }
    },
  })
}
