import { useEffect, useState } from 'react'
import { loadTrainingOutlineFromPath } from '@/api/course-generation/api'
import { loadJobTrainingOutline } from '@/api/jobs/api'
import { useCourseStore } from '../../../store/courseStore'
import type { JsonObject } from '../../../types'

/**
 * Hydrate the TO / Rules panels when in-memory Zustand state was lost
 * (page refresh, back-navigation from pipeline) but a blob path or job id exists.
 */
export function useLoadTrainingOutline() {
  const {
    toData,
    generatedToBlobPath,
    activeJobId,
    setTOData,
    setRulesData,
    setCourseTitle,
    setDetectedRuleFamily,
  } = useCourseStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (toData) return

    let cancelled = false

    async function hydrate() {
      setLoading(true)
      setError(null)
      try {
        if (generatedToBlobPath) {
          const { to, rules } = await loadTrainingOutlineFromPath(generatedToBlobPath, 'uploads')
          if (cancelled) return
          setTOData(to as JsonObject, to as JsonObject)
          setRulesData(rules as JsonObject, rules as JsonObject)
          if (typeof to.course_name === 'string') setCourseTitle(to.course_name)
          if (typeof to.rule_family === 'string') setDetectedRuleFamily(to.rule_family)
          return
        }

        if (activeJobId) {
          const { to, rules } = await loadJobTrainingOutline(activeJobId)
          if (cancelled) return
          setTOData(to as JsonObject, to as JsonObject)
          setRulesData(rules as JsonObject, rules as JsonObject)
          if (typeof to.course_name === 'string') setCourseTitle(to.course_name as string)
          if (typeof to.rule_family === 'string') setDetectedRuleFamily(to.rule_family as string)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Training Outline')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (generatedToBlobPath || activeJobId) {
      void hydrate()
    }

    return () => {
      cancelled = true
    }
  }, [
    toData,
    generatedToBlobPath,
    activeJobId,
    setTOData,
    setRulesData,
    setCourseTitle,
    setDetectedRuleFamily,
  ])

  return { loading: loading && !toData, error: toData ? null : error }
}
