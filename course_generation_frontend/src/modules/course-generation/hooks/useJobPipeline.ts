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
import { usePipelineStore } from '../store/pipelineStore'
import { useCourseStore } from '../store/courseStore'
import { PipelineSSEClient } from '@/api/pipeline/sse'
import { getJobDetail } from '@/api/jobs/api'
import type { AxiosError } from 'axios'

export function useJobPipeline(jobId: string | null) {
  const { initPipeline, syncFromSSEEvent, appendLog, setFatalError, clearPipeline } = usePipelineStore()
  const { setPhase, reset } = useCourseStore()

  // Initialise pipeline state exactly once per jobId
  useEffect(() => {
    if (!jobId) return
    initPipeline(jobId)
  }, [jobId, initPipeline])

  // Verify job exists, then open SSE connection
  useEffect(() => {
    if (!jobId) return

    let cancelled = false
    let client: PipelineSSEClient | null = null

    async function start() {
      try {
        await getJobDetail(jobId!)
      } catch (err) {
        if (cancelled) return

        const status = (err as AxiosError)?.response?.status

        if (status === 404) {
          // Job no longer exists (server restart cleared in-memory state, or
          // the session genuinely expired).  Reset silently to upload phase.
          clearPipeline()
          reset()
          return
        }

        // Backend reachable but returned an unexpected error, or network is down.
        setFatalError(
          'Could not reach the backend. Make sure main.py is running and try again.',
        )
        return
      }

      if (cancelled) return

      client = new PipelineSSEClient(jobId!)

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
  }, [jobId, syncFromSSEEvent, appendLog, setPhase, setFatalError, clearPipeline, reset])
}
