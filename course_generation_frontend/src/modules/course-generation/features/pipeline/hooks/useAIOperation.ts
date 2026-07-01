import { useMutation } from '@tanstack/react-query'
import { useEditorStore } from '../../../store/editorStore'
import { performAIOperation, saveSectionContent } from '@/api/editor/api'
import type { AIOperationType } from '../../../types/editor'

/**
 * Drives an AI operation on a single section.
 * Manages the loading + result-apply lifecycle via the editor store.
 */
export function useAIOperation(jobId: string) {
  const { setAIProcessing, applyAIResult, clearAIOperation } = useEditorStore()

  const mutation = useMutation({
    mutationFn: async ({
      sectionId,
      operation,
      content,
      userPrompt,
    }: {
      sectionId: string
      operation: AIOperationType
      content: string
      userPrompt?: string
    }) => {
      setAIProcessing(sectionId, operation)
      // Sync the current section content before the AI operation so the
      // backend works from the latest edited state (critical for regenerate).
      try {
        await saveSectionContent(jobId, sectionId, content)
      } catch {
        // Non-fatal — proceed with the AI call using the inline content param
      }
      return performAIOperation({ jobId, sectionId, operation, content, userPrompt })
    },

    onSuccess: (result) => {
      applyAIResult(result.sectionId, result.content)
    },

    onError: (_err, variables) => {
      clearAIOperation(variables.sectionId)
    },
  })

  return {
    triggerOperation: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
