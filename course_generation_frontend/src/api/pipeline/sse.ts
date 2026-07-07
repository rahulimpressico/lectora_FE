/**
 * api/pipeline/sse.ts
 *
 * PipelineSSEClient — authenticated SSE client for real-time pipeline tracking.
 *
 * Connects to GET /api/jobs/{jobId}/events via fetch + ReadableStream (not native
 * EventSource) so `Authorization: Bearer <access_token>` can be sent.
 *
 * Features:
 *   - MSAL access token via getAccessToken() before each connect/reconnect
 *   - Exponential-backoff auto-reconnect (up to MAX_RETRIES)
 *   - Last-Event-ID / lastEventId cursor for delta sync on reconnect
 *   - Graceful disconnect via AbortController
 *   - Named events: message (default), done, timeout
 */
import { API_BASE_URL } from '@/config/api'
import { getAccessToken, isAccessTokenError } from '@/auth/getAccessToken'
import type { SSEPipelineEvent } from '@/modules/course-generation/types'

export type { SSEPipelineEvent }
export type SSEEventHandler = (event: SSEPipelineEvent) => void
export type SSEDoneHandler = () => void
export type SSEErrorHandler = (reason: string) => void

const SSE_BASE = `${API_BASE_URL}/jobs`
const MAX_RETRIES = 8
const BASE_RETRY_MS = 1_500
const MAX_RETRY_MS = 30_000

interface ParsedSSEFrame {
  event: string
  data: string
  id?: string
}

/** Parse one SSE event block (lines separated by blank line). */
function parseSSEBlock(block: string): ParsedSSEFrame | null {
  const lines = block.replace(/\r\n/g, '\n').split('\n')
  let event = 'message'
  let id: string | undefined
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('id:')) {
      id = line.slice(3).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^\s/, ''))
    }
  }

  if (dataLines.length === 0) {
    // Terminal events may have no data line (native EventSource still fires them).
    if (event === 'done' || event === 'timeout') {
      return { event, data: '', id }
    }
    return null
  }
  return { event, data: dataLines.join('\n'), id }
}

export class PipelineSSEClient {
  private _abortController: AbortController | null = null
  private _retryTimer: ReturnType<typeof setTimeout> | null = null
  private _retryCount = 0
  private _closed = false
  private _lastEventId: number

  private _onEvent: SSEEventHandler | null = null
  private _onDone: SSEDoneHandler | null = null
  private _onError: SSEErrorHandler | null = null

  private readonly _jobId: string
  /**
   * The last backend log ID the client has already seen.
   * Sent as `?lastEventId=N` on the initial connection so the server delivers
   * only new log entries (delta sync) rather than replaying the full history.
   *
   * On reconnect, `Last-Event-ID` is sent as a request header using the latest
   * `id:` value received from the stream.
   */
  private readonly _initialLastEventId: number

  constructor(jobId: string, lastSeenLogId = 0) {
    this._jobId = jobId
    this._initialLastEventId = lastSeenLogId
    this._lastEventId = lastSeenLogId
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
    void this._openSource()
  }

  disconnect(): void {
    this._closed = true
    this._clearRetryTimer()
    this._abortController?.abort()
    this._abortController = null
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private async _openSource(): Promise<void> {
    if (this._closed) return

    let token: string
    try {
      token = await getAccessToken()
    } catch (error) {
      const message = isAccessTokenError(error)
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to acquire access token for SSE.'
      console.error('[auth] SSE token acquisition failed:', error)
      this._onError?.(message)
      return
    }

    const cursor =
      this._retryCount === 0 && this._initialLastEventId > 0
        ? `?lastEventId=${this._initialLastEventId}`
        : ''
    const url = `${SSE_BASE}/${this._jobId}/events${cursor}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    }
    if (this._retryCount > 0 && this._lastEventId > 0) {
      headers['Last-Event-ID'] = String(this._lastEventId)
    }

    const abortController = new AbortController()
    this._abortController = abortController

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error(
            '[auth] SSE authentication failed:',
            response.status,
            response.statusText,
          )
          this._onError?.(
            `SSE authentication failed (${response.status}). A valid API access token is required.`,
          )
          return
        }

        const body = await response.text().catch(() => '')
        throw new Error(
          `SSE request failed (${response.status}): ${body || response.statusText}`,
        )
      }

      if (!response.body) {
        throw new Error('SSE response has no body.')
      }

      this._retryCount = 0
      await this._readStream(response.body, abortController.signal)
    } catch (error) {
      if (this._closed || abortController.signal.aborted) return

      const message =
        error instanceof Error ? error.message : 'SSE connection failed.'
      console.error('[auth] SSE stream error:', error)
      this._scheduleReconnect(message)
    } finally {
      if (this._abortController === abortController) {
        this._abortController = null
      }
    }
  }

  private async _readStream(
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (!signal.aborted && !this._closed) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        buffer = buffer.replace(/\r\n/g, '\n')

        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const block = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          this._dispatchFrame(block)
          boundary = buffer.indexOf('\n\n')
        }
      }

      // Process any trailing frame without a final blank line.
      if (buffer.trim() && !signal.aborted && !this._closed) {
        this._dispatchFrame(buffer)
      }
    } finally {
      reader.releaseLock()
    }

    if (this._closed || signal.aborted) return

    // Stream ended without a terminal done/timeout event — treat as disconnect.
    this._scheduleReconnect('SSE stream closed unexpectedly.')
  }

  private _dispatchFrame(block: string): void {
    const frame = parseSSEBlock(block)
    if (!frame) return

    if (frame.id) {
      const parsed = Number(frame.id)
      if (Number.isFinite(parsed)) {
        this._lastEventId = parsed
      }
    }

    switch (frame.event) {
      case 'done':
        this.disconnect()
        this._onDone?.()
        return
      case 'timeout':
        this.disconnect()
        this._onError?.('Stream timed out after 30 minutes')
        return
      case 'message':
      default:
        try {
          const payload = JSON.parse(frame.data) as SSEPipelineEvent
          this._onEvent?.(payload)
        } catch {
          // Ignore unparseable frames (e.g. heartbeats).
        }
    }
  }

  private _scheduleReconnect(reason: string): void {
    if (this._closed) return

    if (this._retryCount >= MAX_RETRIES) {
      this._onError?.(
        `SSE connection lost after ${MAX_RETRIES} reconnect attempts (${reason})`,
      )
      return
    }

    const delay = Math.min(
      BASE_RETRY_MS * Math.pow(2, this._retryCount),
      MAX_RETRY_MS,
    )
    this._retryCount++
    this._clearRetryTimer()
    this._retryTimer = setTimeout(() => void this._openSource(), delay)
  }

  private _clearRetryTimer(): void {
    if (this._retryTimer !== null) {
      clearTimeout(this._retryTimer)
      this._retryTimer = null
    }
  }
}
