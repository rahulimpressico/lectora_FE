/**
 * api/pipeline/sse.ts
 *
 * PipelineSSEClient — SSE client for real-time pipeline stage tracking.
 *
 * Connects to GET /api/jobs/{jobId}/events and streams stage_update events.
 * Features:
 *   - Exponential-backoff auto-reconnect (up to MAX_RETRIES)
 *   - Last-Event-ID cursor sent automatically by the browser's EventSource
 *     on reconnect so the server resumes from the correct log position
 *   - Graceful disconnect with timer cleanup
 *   - Per-event handler for stage updates, plus done/error callbacks
 */
import { API_BASE_URL } from '@/config/api'
import type { SSEPipelineEvent } from '@/modules/course-generation/types'

export type { SSEPipelineEvent }
export type SSEEventHandler = (event: SSEPipelineEvent) => void
export type SSEDoneHandler = () => void
export type SSEErrorHandler = (reason: string) => void

const SSE_BASE = `${API_BASE_URL}/jobs`
const MAX_RETRIES = 8
const BASE_RETRY_MS = 1_500
const MAX_RETRY_MS = 30_000

export class PipelineSSEClient {
  private _source: EventSource | null = null
  private _retryTimer: ReturnType<typeof setTimeout> | null = null
  private _retryCount = 0
  private _closed = false

  private _onEvent: SSEEventHandler | null = null
  private _onDone: SSEDoneHandler | null = null
  private _onError: SSEErrorHandler | null = null

  private readonly _jobId: string
  /**
   * The last backend log ID the client has already seen.
   * Sent as `?lastEventId=N` on the initial connection so the server delivers
   * only new log entries (delta sync) rather than replaying the full history.
   *
   * After the first successful message the browser's native EventSource
   * mechanism takes over: the server sets `id:` on each SSE frame and the
   * browser automatically sends `Last-Event-ID` on its own reconnects.
   */
  private readonly _initialLastEventId: number

  constructor(jobId: string, lastSeenLogId = 0) {
    this._jobId = jobId
    this._initialLastEventId = lastSeenLogId
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  connect(handlers: {
    onEvent: SSEEventHandler
    onDone: SSEDoneHandler
    onError: SSEErrorHandler
  }): void {
    this._onEvent = handlers.onEvent
    this._onDone = handlers.onDone
    this._onError = handlers.onError
    this._closed = false
    this._openSource()
  }

  disconnect(): void {
    this._closed = true
    this._clearRetryTimer()
    this._source?.close()
    this._source = null
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private _openSource(): void {
    if (this._closed) return

    // On the very first connection, pass the last-seen log ID as a query param
    // so the server sends only new entries.  Subsequent reconnects by the same
    // EventSource instance use the browser's automatic Last-Event-ID header.
    const cursor =
      this._retryCount === 0 && this._initialLastEventId > 0
        ? `?lastEventId=${this._initialLastEventId}`
        : ''
    const url = `${SSE_BASE}/${this._jobId}/events${cursor}`
    const source = new EventSource(url)
    this._source = source

    source.addEventListener('message', (e: MessageEvent) => {
      this._retryCount = 0
      try {
        const payload = JSON.parse(e.data as string) as SSEPipelineEvent
        this._onEvent?.(payload)
      } catch {
        // Ignore unparseable frames (e.g. heartbeat comments filtered by browser)
      }
    })

    source.addEventListener('done', () => {
      this.disconnect()
      this._onDone?.()
    })

    source.addEventListener('timeout', () => {
      this.disconnect()
      this._onError?.('Stream timed out after 30 minutes')
    })

    source.addEventListener('error', () => {
      source.close()
      this._source = null
      if (this._closed) return

      if (this._retryCount >= MAX_RETRIES) {
        this._onError?.(
          `SSE connection lost after ${MAX_RETRIES} reconnect attempts`,
        )
        return
      }

      const delay = Math.min(
        BASE_RETRY_MS * Math.pow(2, this._retryCount),
        MAX_RETRY_MS,
      )
      this._retryCount++
      this._retryTimer = setTimeout(() => this._openSource(), delay)
    })
  }

  private _clearRetryTimer(): void {
    if (this._retryTimer !== null) {
      clearTimeout(this._retryTimer)
      this._retryTimer = null
    }
  }
}
