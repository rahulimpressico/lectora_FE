import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { courseApi } from '../api/courseApi'
import { useCourseStore } from '../store/courseStore'

export function useGenerateTO() {
  const { setTOData, setRulesData, setPhase, setGeneratedToBlobPath } = useCourseStore()
  const abortRef = useRef<AbortController | null>(null)

  return useMutation({
    retry: false,
    mutationFn: async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const { rawDocuments, customToPrompt, courseTypeHint, toDocument } = useCourseStore.getState()
      // Collect all successfully uploaded file blob paths (preserving order).
      const blobPaths = rawDocuments
        .filter((f) => f.status === 'success' && f.blobPath)
        .map((f) => f.blobPath as string)

      if (blobPaths.length === 0) throw new Error('No uploaded documents found.')

      const toDocBlobPath =
        toDocument?.status === 'success' && toDocument.blobPath
          ? toDocument.blobPath
          : undefined

      return courseApi.generateTO(
        blobPaths,
        controller.signal,
        'intermediate',
        customToPrompt.trim() || undefined,
        courseTypeHint.trim() || undefined,
        toDocBlobPath,
      )
    },
    onSuccess: ({ to, rules, toBlobPath }) => {
      setTOData(to, to)
      setRulesData(rules, rules)
      setGeneratedToBlobPath(toBlobPath ?? null)
      setPhase('three-panel')
    },
  })
}
