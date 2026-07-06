import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelGenerateTO,
  pollGenerateTOJob,
  startGenerateTO,
} from '@/api/course-generation/api'
import { ApiClientError } from '@/api/errors'
import {
  toUserFacingTOErrorMessage,
  toUserFacingTOStatusMessage,
} from '@/modules/course-generation/utils/userFacingGenerationText'
import { useCourseStore } from '../../../store/courseStore'
import { TO_TASKS_QUERY_KEY } from './useToTasks'
import type { GenerateTOResponse, GenerateTOStageLog, WorkflowPhase } from '../../../types'
import type { JsonObject } from '../../../types'
import { normalizeTrainingOutlineForPanel } from '../../review/utils/trainingOutlinePanel'

/**
 * Per-call overrides for useGenerateTO.mutate().
 *
 * Case 2 (DOCX/PDF outline upload): pass { outlineBlobPaths, useStaticPrompt: true }
 *   so the hook uses only the outline file as source and forces GENERATE_TO_PROMPT.
 * Case 1 (generate from source): call mutate() with no args.
 */
export type GenerateTOOverrides = {
  outlineBlobPaths?: string[]
  useStaticPrompt?: boolean
}

// Maps the display label from CourseBasicsStep chips to the backend rule-family key.
// No API call needed — user selects manually; we just normalise here.
const COURSE_TYPE_LABEL_TO_KEY: Record<string, string> = {
  'Insurance CE': 'insurance_ce',
  'IARCE':        'iarce',
  'Firm Element': 'firm_element',
}

function isCompletedResponse(
  data: GenerateTOResponse | { jobId: string },
): data is GenerateTOResponse {
  return 'to' in data && 'rules' in data
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages the full TO-generation flow:
 *
 *   1. Validate inputs + fire POST /documents/generate-to (with 503 back-off retry)
 *   2. If 200 → process result immediately (sync path).
 *   3. If 202 → store jobId and poll GET /documents/generate-to/jobs/{id} every 1 s
 *      via TanStack Query until completed / failed / cancelled.
 *   4. On completion → apply result to courseStore and advance to three-panel.
 *
 * `isPending` is `true` for both the POST phase and the async polling phase so
 * the `TOGenerationLoader` stays visible for the entire operation.
 *
 * `statusMessage` reflects the backend's latest `message` field and can drive
 * step labels in the loader.
 */
export function useGenerateTO(successPhase: WorkflowPhase = 'three-panel') {
  const qc = useQueryClient()
  const {
    setTOData,
    setRulesData,
    setPhase,
    setGeneratedToBlobPath,
    setCourseTitle,
    setDetectedRuleFamily,
  } = useCourseStore()
  const successPhaseRef = useRef(successPhase)
  successPhaseRef.current = successPhase

  // AbortController for the initial POST only (not used for TanStack Query polling)
  const abortRef = useRef<AbortController | null>(null)

  // Initialise from the persisted store so navigating away and back restores
  // the polling state and keeps the TOGenerationLoader visible.
  const [activeJobId, setActiveJobIdLocal] = useState<string | null>(
    () => useCourseStore.getState().activeTOJobId,
  )

  // Keep the store and local state in sync
  function setActiveJobId(id: string | null) {
    setActiveJobIdLocal(id)
    useCourseStore.getState().setActiveTOJobId(id)
  }

  // Error surfaced from either the POST or the polling phases
  const [jobError, setJobError] = useState<Error | null>(null)

  // Latest status message from the backend (drives loader step text)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // ── Result processor ───────────────────────────────────────────────────────

  const applyResult = useCallback(
    ({ to, rules, toBlobPath }: GenerateTOResponse) => {
      const { courseTypeHint } = useCourseStore.getState()
      const normalizedTo = normalizeTrainingOutlineForPanel(to as JsonObject, courseTypeHint)
      setTOData(normalizedTo, normalizedTo)
      setRulesData(rules as JsonObject, rules as JsonObject)
      setGeneratedToBlobPath(toBlobPath ?? null)
      const existingTitle = useCourseStore.getState().courseTitle
      if (!existingTitle.trim() && typeof to.course_name === 'string' && to.course_name) {
        setCourseTitle(to.course_name as string)
      }
      if (typeof to.rule_family === 'string' && to.rule_family) {
        setDetectedRuleFamily(to.rule_family as string)
      }
      // A new TO has been generated — this marks the start of a fresh workflow.
      // Clear any stale pipeline job ID so the partialize cannot accidentally
      // restore a previous pipeline session when the user navigates away and back.
      useCourseStore.getState().setActiveJobId(null)
      setPhase(successPhaseRef.current)
    },
    [setTOData, setRulesData, setGeneratedToBlobPath, setCourseTitle, setDetectedRuleFamily, setPhase],
  )

  // ── Phase 1: fire POST → get jobId (or sync result) ───────────────────────

  const startMutation = useMutation({
    retry: false,
    mutationFn: async (overrides: GenerateTOOverrides = {}) => {
      setJobError(null)
      setStatusMessage(null)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const {
        rawDocuments,
        customToPrompt,
        courseTypeHint,
        toDocument,
        durationHours,
        difficultyLevel,
        calculatedWordCount,
        audience,
        courseTitle,
        courseTopic,
      } = useCourseStore.getState()

      const successDocs = rawDocuments.filter(
        (f) => f.status === 'success' && f.blobPath && f.uploadRole !== 'outline',
      )
      const allBlobPaths = successDocs.map((f) => f.blobPath as string)

      // Case 2 (outline file upload): use only the supplied outline blob paths.
      // Case 1 (generate from source): use all uploaded source documents.
      const effectiveBlobPaths = overrides.outlineBlobPaths ?? allBlobPaths

      if (effectiveBlobPaths.length === 0) throw new Error('No uploaded documents found.')

      // Audience + duration validation only applies to Case 1 (generate from source).
      if (!overrides.useStaticPrompt) {
        if (!audience.trim()) {
          throw new Error('Please provide the target audience before generating the Training Outline.')
        }
        if (!toDocument && (!durationHours || !difficultyLevel)) {
          throw new Error(
            'Please select both a course duration and difficulty level before generating the Training Outline.',
          )
        }
      }

      const toDocBlobPath =
        toDocument?.status === 'success' && toDocument.blobPath
          ? toDocument.blobPath
          : undefined

      // Use raw store values — no silent defaults that would mask missing data.
      const difficulty = difficultyLevel ? difficultyLevel.toLowerCase() : null
      // Derive the rule-family key from the user's manual chip selection — no AI/API call needed.
      const ruleFamily = courseTypeHint.trim()
        ? (COURSE_TYPE_LABEL_TO_KEY[courseTypeHint.trim()] ?? null)
        : null

      // ── Source analyses computed at LO generation time (stored in courseStore) ─
      const sourceAnalyses = useCourseStore.getState().sourceAnalyses

      // Wizard Case 1 uses structured API fields only — drop stale composite customToPrompt.
      if (!overrides.useStaticPrompt) {
        useCourseStore.getState().setCustomToPrompt('')
      }

      const { wizardData } = useCourseStore.getState()
      const manualCustomHint = customToPrompt.trim()
      const body: Record<string, unknown> = {
        blobPaths: effectiveBlobPaths,
        // Force static GENERATE_TO_PROMPT when extracting from an uploaded outline file.
        ...(overrides.useStaticPrompt && { useStaticPrompt: true }),
        // User-provided title and description — single source of truth.
        // Sent as separate fields so the backend can override LLM output verbatim.
        ...(courseTitle.trim() && { courseTitle: courseTitle.trim() }),
        ...(courseTopic.trim() && { courseTopic: courseTopic.trim() }),
        ...(wizardData.description.trim() && { courseDescription: wizardData.description.trim() }),
        // Only include difficulty fields when values are actually set.
        ...(difficulty && { difficulty, difficultyLevel: difficulty }),
        ...(overrides.useStaticPrompt && manualCustomHint && { customToPrompt: manualCustomHint }),
        ...(courseTypeHint.trim() && { courseTypeHint: courseTypeHint.trim() }),
        ...(ruleFamily && { ruleFamily }),
        ...(toDocBlobPath && { toDocBlobPath }),
        // Duration/word-count only sent for Case 1 (dynamic prompt flow).
        ...(!overrides.useStaticPrompt && durationHours != null && { durationHours }),
        ...(!overrides.useStaticPrompt && calculatedWordCount != null && { calculatedWordCount }),
        ...(audience.trim() && { audience: audience.trim() }),
        // ── Onboarding wizard fields ──────────────────────────────────────────
        // Audience & experience
        ...(wizardData.experienceLevel && { experienceLevel: wizardData.experienceLevel }),
        ...(wizardData.learnerOutcomes.trim() && { learnerOutcomes: wizardData.learnerOutcomes.trim() }),
        ...(wizardData.audienceNotes.trim() && { audienceNotes: wizardData.audienceNotes.trim() }),
        // Learning objectives
        ...(wizardData.objectives.length > 0 && { learningObjectives: wizardData.objectives }),
        // Content direction
        ...(wizardData.tone.trim() && { tone: wizardData.tone.trim() }),
        ...(wizardData.depth && { depth: wizardData.depth }),
        ...(wizardData.emphasis.trim() && { emphasis: wizardData.emphasis.trim() }),
        ...(wizardData.avoid.trim() && { avoid: wizardData.avoid.trim() }),
        // Instructional design flags (always send when wizard has been visited)
        includeCaseStudies: wizardData.includeCaseStudies,
        includeExamples: wizardData.includeExamples,
        includeKnowledgeChecks: wizardData.includeKnowledgeChecks,
        // Outline structure
        ...(wizardData.preferredChapters && { preferredChapters: parseInt(wizardData.preferredChapters, 10) || undefined }),
        ...(wizardData.lessonStyle && { lessonStyle: wizardData.lessonStyle }),
        // Source analysis results — used by A0 to weight TO/LO generation
        ...(sourceAnalyses.length > 0 && { sourceAnalyses }),
        // Required topics — mandatory content areas specified by the user
        ...(wizardData.requiredTopics?.length > 0 && { requiredTopics: wizardData.requiredTopics }),
      }

      return startGenerateTO(body, controller.signal)
    },
    onSuccess: (data) => {
      if (isCompletedResponse(data)) {
        // Synchronous path: backend completed inline (rare in production)
        applyResult(data)
      } else {
        // Async path: job accepted — begin polling
        setActiveJobId(data.jobId)
        void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
      }
    },
    onError: (err) => {
      setJobError(err instanceof Error ? err : new Error(String(err)))
    },
  })

  // ── Phase 2: poll job status (TanStack Query drives the interval) ──────────

  const pollQuery = useQuery({
    queryKey: ['to-job-poll', activeJobId] as const,
    queryFn: () => pollGenerateTOJob(activeJobId!),
    enabled: !!activeJobId,
    // Poll every second while the job is active; TanStack Query stops automatically
    // when `enabled` becomes false (i.e. when activeJobId is cleared).
    refetchInterval: 1_000,
    staleTime: 0,
    // Don't retry on 404 — the server restarted and lost the job store.
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status === 404) return false
      return failureCount < 2
    },
  })

  // Process poll results when data arrives
  useEffect(() => {
    const poll = pollQuery.data
    if (!poll || !activeJobId) return

    if (poll.message) setStatusMessage(toUserFacingTOStatusMessage(poll.message))

    if (poll.status === 'completed') {
      if (poll.to && poll.rules) {
        applyResult({
          to: poll.to as JsonObject,
          rules: poll.rules as JsonObject,
          toBlobPath: poll.toBlobPath,
        })
      } else {
        setJobError(new Error('TO generation completed but the response is missing TO or rules.'))
      }
      setActiveJobId(null)
      void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
    } else if (poll.status === 'failed') {
      setJobError(
        new Error(
          toUserFacingTOErrorMessage(poll.error ?? poll.message ?? 'TO generation failed.'),
        ),
      )
      setActiveJobId(null)
      void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
    } else if (poll.status === 'cancelled') {
      // Cancelled by user via cancel() — don't surface as an error
      setActiveJobId(null)
      void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
    }
  // applyResult is stable (useCallback with stable Zustand setters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollQuery.data])

  // Surface poll network errors
  useEffect(() => {
    if (!pollQuery.error || !activeJobId) return
    const err = pollQuery.error
    const message =
      err instanceof ApiClientError && err.status === 404
        ? 'The server was restarted while generating the Training Outline. Please try again.'
        : err instanceof Error
          ? err.message
          : String(err)
    setJobError(new Error(message))
    setActiveJobId(null)
    void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollQuery.error])

  // ── Cancel ─────────────────────────────────────────────────────────────────

  function cancel() {
    const jobId = activeJobId
    // 1. Stop the TanStack Query polling immediately
    if (jobId) {
      setActiveJobId(null)
      void qc.cancelQueries({ queryKey: ['to-job-poll', jobId] as const })
      // 2. Tell the backend to stop the A0 run (fire-and-forget)
      cancelGenerateTO(jobId).catch(() => { /* server may have already finished */ })
      void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
    }
    // 3. Abort the initial POST (no-op if already resolved)
    abortRef.current?.abort()
    // 4. Clear all local state
    startMutation.reset()
    setJobError(null)
    setStatusMessage(null)
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  // isPending covers both the POST phase and the async polling phase so the
  // TOGenerationLoader remains visible for the entire generation operation.
  const isPending = startMutation.isPending || !!activeJobId
  const isError = startMutation.isError || !!jobError
  const error =
    jobError ??
    (startMutation.error instanceof Error ? startMutation.error : null)
  const stageLogs: GenerateTOStageLog[] = (pollQuery.data?.logs ?? []) as GenerateTOStageLog[]

  return {
    isPending,
    isError,
    error,
    mutate: (overrides?: GenerateTOOverrides) => startMutation.mutate(overrides ?? {}),
    cancel,
    reset: cancel,
    /** Latest backend status message — can be forwarded to TOGenerationLoader */
    statusMessage,
    /** jobId being polled, or null when idle */
    activeJobId,
    /** Raw backend TO-generation logs (includes stage ids like A0/S1/A1). */
    stageLogs,
  }
}
