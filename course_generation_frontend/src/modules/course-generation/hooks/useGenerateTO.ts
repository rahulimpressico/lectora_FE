import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { generateTO } from '@/api/course-generation/api'
import { useCourseStore } from '../store/courseStore'

/**
 * Builds the supplemental course metadata context sent to the backend
 * as part of the user message — NOT as a system prompt override.
 *
 * The backend’s build_dynamic_to_prompt() is the authoritative system prompt
 * and already handles difficulty, duration, audience, and topic-selection guidance.
 * This function only adds course-specific metadata (id, title) that the backend
 * cannot infer on its own.
 */
function buildCourseMetadataContext({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}): string | null {
  const lines: string[] = []

  if (courseTitle.trim()) {
    lines.push(`Preferred course title: ${courseTitle.trim()}`)
  }
  if (courseId.trim()) {
    lines.push(`Course ID: ${courseId.trim()}`)
  }

  return lines.length > 0 ? lines.join("\n") : null
}

export function useGenerateTO() {
  const { setTOData, setRulesData, setPhase, setGeneratedToBlobPath, setCourseTitle, setDetectedRuleFamily } = useCourseStore()
  const abortRef = useRef<AbortController | null>(null)

  return useMutation({
    retry: false,
    mutationFn: async () => {
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
        courseId,
        courseTitle,
      } = useCourseStore.getState()
      // Collect all successfully uploaded file blob paths (preserving order).
      const blobPaths = rawDocuments
        .filter((f) => f.status === 'success' && f.blobPath)
        .map((f) => f.blobPath as string)

      if (blobPaths.length === 0) throw new Error('No uploaded documents found.')

      if (!audience.trim()) {
        throw new Error('Please provide the target audience before generating the Training Outline.')
      }

      // Validate that the user has selected both duration and difficulty
      // (required for the new dynamic TO generation flow).
      if (!toDocument && (!durationHours || !difficultyLevel)) {
        throw new Error('Please select both a course duration and difficulty level before generating the Training Outline.')
      }

      const toDocBlobPath =
        toDocument?.status === 'success' && toDocument.blobPath
          ? toDocument.blobPath
          : undefined

      const effectiveDurationHours = durationHours ?? 3
      const difficulty = (difficultyLevel ?? 'intermediate').toLowerCase()

      // Course metadata context (title, id) sent as supplemental custom instructions.
      // Duration, difficulty, and audience are passed as dedicated API parameters and
      // handled by the backend's build_dynamic_to_prompt() — do NOT override that prompt.
      const metadataContext = buildCourseMetadataContext({ courseId, courseTitle })
      const effectiveCustomPrompt = [
        metadataContext,
        customToPrompt.trim() || null,
      ]
        .filter(Boolean)
        .join('\n\n') || undefined

      return generateTO(
        blobPaths,
        controller.signal,
        difficulty,
        effectiveCustomPrompt,
        courseTypeHint.trim() || undefined,
        toDocBlobPath,
        effectiveDurationHours,
        difficulty,
        calculatedWordCount,
        audience.trim() || undefined,
      )
    },
    onSuccess: ({ to, rules, toBlobPath }) => {
      setTOData(to, to)
      setRulesData(rules, rules)
      setGeneratedToBlobPath(toBlobPath ?? null)
      if (to.course_name && typeof to.course_name === 'string') {
        setCourseTitle(to.course_name)
      }
      if (to.rule_family && typeof to.rule_family === 'string') {
        setDetectedRuleFamily(to.rule_family)
      }
      setPhase('three-panel')
    },
  })
}
