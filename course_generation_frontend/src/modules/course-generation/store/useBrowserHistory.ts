import { useEffect, useRef } from 'react'
import { useCourseStore } from '../features/onboarding-flow/store'
import type { WorkflowPhase } from '../types'

/**
 * Syncs the app's phase-based navigation with the browser's History API so
 * that the Back and Forward buttons work across wizard steps, the three-panel
 * editor, the pipeline monitor, and the course editor.
 *
 * Strategy
 * ─────────
 * • On first mount: `replaceState` writes the current phase into the existing
 *   history entry (no new entry is added).
 * • On every subsequent phase change: `pushState` adds a new history entry,
 *   making the previous phase reachable via the Back button.
 * • On `popstate` (browser Back/Forward): the phase stored in `event.state`
 *   is fed back to the store via `setPhase`. A ref suppresses the next
 *   pushState so we don't add a forward entry for a backwards navigation.
 *
 * Because Zustand persist already saves the full workflow state to
 * localStorage on every store write, restoring a phase via popstate
 * automatically gets all the associated data (toData, rawDocuments, etc.)
 * from the hydrated store — no extra fetch is needed.
 */
export function useBrowserHistory() {
  const phase    = useCourseStore((s) => s.phase)
  const setPhase = useCourseStore((s) => s.setPhase)

  /** True while we are restoring from a popstate — suppresses the next push. */
  const isRestoringRef = useRef(false)
  /** Tracks whether the initial replaceState has run. */
  const initializedRef = useRef(false)

  // Sync phase → history
  useEffect(() => {
    if (!initializedRef.current) {
      // First render: stamp the current phase into the existing entry so the
      // very first Back press can return to it.
      window.history.replaceState({ phase }, '')
      initializedRef.current = true
      return
    }

    if (isRestoringRef.current) {
      // This change came from popstate — don't push a forward entry.
      isRestoringRef.current = false
      return
    }

    window.history.pushState({ phase }, '')
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for browser Back / Forward
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const target = (e.state as { phase?: WorkflowPhase } | null)?.phase
      if (!target) return

      // Guard against navigating to a phase that requires a job ID we no longer
      // have — fall back to three-panel which is always safe to show.
      const { activeJobId } = useCourseStore.getState()
      const needsJob = target === 'pipeline' || target === 'course-editor'
      const resolvedPhase: WorkflowPhase =
        needsJob && !activeJobId ? 'three-panel' : target

      isRestoringRef.current = true
      setPhase(resolvedPhase)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [setPhase])
}
