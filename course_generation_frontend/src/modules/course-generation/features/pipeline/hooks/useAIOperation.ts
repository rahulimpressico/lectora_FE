import { useMutation } from '@tanstack/react-query'
import { useEditorStore } from '../../../store/editorStore'
import { performAIOperation } from '@/api/editor/api'
import {
  allowsStructuralChange,
  buildAIContentPayload,
  resolveAIOperationResult,
} from '../../../utils/aiContentStructure'
import type { AIOperationType, BodyParagraph } from '../../../types/editor'

export interface AIOperationVariables {
  sectionId: string
  operation: AIOperationType
  content: string
  paragraphs?: BodyParagraph[]
  userPrompt?: string
}

/**
 * Drives an AI operation on a single section.
 * Sends structured `paragraphs` when available and applies the resolved
 * response (content + paragraphs) via `applyAIResult`.
 */
export function useAIOperation() {
  const { setAIProcessing, applyAIResult, clearAIOperation } = useEditorStore()

  const mutation = useMutation({
    mutationFn: async ({
      sectionId,
      operation,
      content,
      paragraphs,
      userPrompt,
    }: AIOperationVariables) => {
      setAIProcessing(sectionId, operation)
      const payload = buildAIContentPayload(sectionId, content, paragraphs)
      const preserveStructure = !allowsStructuralChange(operation, userPrompt)
      const raw = await performAIOperation({
        sectionId,
        operation,
        content: payload.content,
        paragraphs: payload.paragraphs,
        userPrompt,
        preserveStructure,
      })
      const resolved = resolveAIOperationResult(
        payload.paragraphs ?? paragraphs,
        raw,
        {
          sectionId,
          operation,
          userPrompt,
          preserveStructure,
        },
      )
      // Always apply against the request sectionId — never trust a mismatched
      // response sectionId that would miss findInDraft and leave the UI stale.
      return {
        sectionId,
        content: resolved.content,
        paragraphs: resolved.paragraphs,
      }
    },

    onSuccess: (result) => {
      applyAIResult(result.sectionId, result.content, result.paragraphs)
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
