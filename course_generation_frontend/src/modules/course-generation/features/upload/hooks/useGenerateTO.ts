import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useCourseStore } from '../../onboarding-flow/store'
import type { WorkflowPhase } from '../../../types'

/**
 * Per-call overrides for useGenerateTO.mutate().
 *
 * Case 2 (DOCX/PDF outline upload): pass { outlineBlobPaths, useStaticPrompt: true }
 * Case 1 (generate from source): call mutate() with no args.
 */
export type GenerateTOOverrides = {
  outlineBlobPaths?: string[]
  useStaticPrompt?: boolean
}

const PRESET_GENERATION_DELAY_MS = 1_200

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/**
 * Applies preset TO + rules into the persisted Zustand store, then advances phase.
 * No TO GET API — data lives in localStorage via the store persist middleware.
 */
export function useGenerateTO(successPhase: WorkflowPhase = 'three-panel') {
  const { setPhase, setIsGeneratingTO, hydratePresetTrainingOutline } = useCourseStore()

  const successPhaseRef = useRef(successPhase)
  successPhaseRef.current = successPhase
  const abortRef = useRef<AbortController | null>(null)

  const startMutation = useMutation({
    retry: false,
    mutationFn: async (overrides: GenerateTOOverrides = {}) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsGeneratingTO(true)

      const {
        rawDocuments,
        toDocument,
        durationHours,
        audience,
      } = useCourseStore.getState()

      const successDocs = rawDocuments.filter(
        (f) => f.status === 'success' && f.blobPath && f.uploadRole !== 'outline',
      )
      const effectiveBlobPaths =
        overrides.outlineBlobPaths ??
        successDocs.map((f) => f.blobPath as string)

      if (effectiveBlobPaths.length === 0) {
        throw new Error('No uploaded documents found.')
      }

      if (!overrides.useStaticPrompt) {
        if (!audience.trim()) {
          throw new Error('Please provide the target audience before generating the Training Outline.')
        }
        if (!toDocument && (!durationHours || !useCourseStore.getState().difficultyLevel)) {
          throw new Error(
            'Please select both a course duration and difficulty level before generating the Training Outline.',
          )
        }
        useCourseStore.getState().setCustomToPrompt('')
      }

      await sleep(PRESET_GENERATION_DELAY_MS, controller.signal)
    },
    onSuccess: () => {
      hydratePresetTrainingOutline()
      useCourseStore.getState().setActiveJobId(null)
      setPhase(successPhaseRef.current)
    },
    onSettled: () => {
      setIsGeneratingTO(false)
      abortRef.current = null
    },
  })

  function cancel() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsGeneratingTO(false)
    startMutation.reset()
  }

  return {
    isPending: startMutation.isPending,
    isError: startMutation.isError,
    error: startMutation.error instanceof Error ? startMutation.error : null,
    mutate: (overrides?: GenerateTOOverrides) => startMutation.mutate(overrides ?? {}),
    cancel,
    reset: cancel,
    statusMessage: startMutation.isPending ? 'Preparing your Training Outline…' : null,
    stageLogs: [],
  }
}
