/**
 * useJobPipeline — drives the pipeline view lifecycle for a given jobId.
 *
 * Connects to GET /api/jobs/{jobId}/events via SSE and streams real-time
 * stage updates and log entries from the orchestrator.
 *
 * On page refresh mid-pipeline: the persisted jobId is re-verified against
 * the backend before reconnecting SSE.  A 404 (stale session / server restart)
 * silently resets the workflow back to the upload phase — no error card shown.
 * Any other error (network down, 5xx) shows a recoverable error in the log panel.
 */
import { useEffect } from 'react'
import { usePipelineStore } from '../../store/pipelineStore'
import { useCourseStore } from '../../store/courseStore'
import { PipelineSSEClient } from '@/api/pipeline/sse'
import { getJobDetail } from '@/api/jobs/api'
import { isExpiredJobError } from '@/api/errors'

export function useJobPipeline(jobId: string | null) {
  const {
    initPipeline,
    hydrateFromSnapshot,
    syncFromSSEEvent,
    appendLog,
    setFatalError,
    clearPipeline,
    lastSeenLogId,
  } = usePipelineStore()
  const { setPhase, reset } = useCourseStore()

  // Initialise pipeline state once per jobId.
  // initPipeline is idempotent: if the store is already tracking this jobId
  // (user navigated away and came back), the call is a no-op and accumulated
  // stage state + logs are preserved.
  useEffect(() => {
    if (!jobId) return
    initPipeline(jobId)
  }, [jobId, initPipeline])

  // Verify job exists, hydrate stage state from REST snapshot, then open SSE.
  useEffect(() => {
    if (!jobId) return

    let cancelled = false
    let client: PipelineSSEClient | null = null

    async function start() {
      let detail
      try {
        detail = await getJobDetail(jobId!)
      } catch (err) {
        if (cancelled) return

        if (isExpiredJobError(err)) {
          // Job no longer exists (server restart, TTL expiry, or stale browser session).
          clearPipeline()
          reset()
          return
        }

        const detail =
          err instanceof Error ? err.message : 'Unknown error'
        setFatalError(
          `Could not reach the backend (${detail}). Make sure dev_app is running on port 8000 and try again.`,
        )
        return
      }

      if (cancelled) return

      // Immediately apply the REST snapshot so the UI reflects current stage
      // statuses before the first SSE event arrives.  This eliminates the
      // "blank/pending" flash that occurred when returning from navigation.
      hydrateFromSnapshot(detail)

      // If the job already finished before we reconnected, drive the phase
      // transition now rather than waiting for an SSE done event.
      const finalStatus = detail.status.toUpperCase()
      if (finalStatus === 'COMPLETED') {
        setPhase('course-editor')
        return
      }
      if (finalStatus === 'FAILED') {
        // Store is already hydrated — nothing more to do, SSE not needed.
        return
      }

      // Open SSE.  Pass lastSeenLogId so the backend sends only NEW log entries
      // (delta sync) rather than replaying the entire history from the start.
      // This is critical when the user navigates away and back: a new EventSource
      // is created each time, so the browser cannot auto-send Last-Event-ID.
      client = new PipelineSSEClient(jobId!, lastSeenLogId)

      client.connect({
        onEvent: (event) => {
          syncFromSSEEvent(event)

          const jobStatus = event.status.toUpperCase()

          if (jobStatus === 'COMPLETED') {
            appendLog({
              level: 'success',
              message: '✓ Course generation complete — opening editor…',
            })
            const timer = setTimeout(() => setPhase('course-editor'), 1_500)
            return () => clearTimeout(timer)
          }

          if (jobStatus === 'FAILED') {
            appendLog({
              level: 'error',
              message: `✕ Generation failed: ${event.error?.message ?? 'Unknown error'}`,
            })
          }
        },
        onDone: () => {
          // Terminal SSE event — onEvent already handled the state transition
        },
        onError: (reason) => {
          appendLog({
            level: 'warn',
            message: `⚠ Live connection interrupted — ${reason}`,
          })
        },
      })
    }

    void start()

    return () => {
      cancelled = true
      client?.disconnect()
    }
  // lastSeenLogId is intentionally excluded from deps: we only want the value
  // that was current when this effect fires (on mount / jobId change), not to
  // re-run the effect every time a new SSE log arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, hydrateFromSnapshot, syncFromSSEEvent, appendLog, setPhase, setFatalError, clearPipeline, reset])
}
