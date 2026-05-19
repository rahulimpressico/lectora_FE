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

      const { rawDocuments } = useCourseStore.getState()
      const primary = rawDocuments.find((f) => f.status === 'success')
      if (!primary?.blobPath) throw new Error('No uploaded document found.')
      return courseApi.generateTO(primary.blobPath, controller.signal)
    },
    onSuccess: ({ to, rules, toBlobPath }) => {
      setTOData(to, to)
      setRulesData(rules, rules)
      setGeneratedToBlobPath(toBlobPath ?? null)
      setPhase('three-panel')
    },
  })
}
