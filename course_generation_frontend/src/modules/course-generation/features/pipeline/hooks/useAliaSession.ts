import { useCallback, useRef } from 'react'
import { useAliaStore } from '../../../store/aliaStore'
import { useEditorStore } from '../../../store/editorStore'
import { useCourseStore } from '../../../store/courseStore'
import { buildAliaContext } from '../../../utils/buildAliaContext'
import { dispatchAliaAction, isDestructiveAction } from '../../../utils/dispatchAliaAction'
import { callAlia } from '@/api/editor/api'
import type { DispatchSession } from '../../../utils/dispatchAliaAction'

// Web Speech API type stubs (not in all TS libs)
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

export interface UseAliaSessionProps {
  jobId: string
  session: DispatchSession
}

/** Speaks text aloud using the Web Speech API. */
function speakText(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.92
  utterance.pitch = 1.08
  utterance.volume = 1
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utterance)
}

/**
 * Manages the full voice/text → backend → action → TTS cycle.
 * Uses refs for all mutable values so closures never go stale.
 */
export function useAliaSession({ jobId, session }: UseAliaSessionProps) {
  // ── Stable store selectors ─────────────────────────────────────────────────
  const setVoiceState     = useAliaStore((s) => s.setVoiceState)
  const setError          = useAliaStore((s) => s.setError)
  const setTranscript     = useAliaStore((s) => s.setTranscript)
  const addToHistory      = useAliaStore((s) => s.addToHistory)
  const setPendingAction  = useAliaStore((s) => s.setPendingAction)
  const confirmPendingFn  = useAliaStore((s) => s.confirmPending)
  const cancelPendingFn   = useAliaStore((s) => s.cancelPending)
  const setResponse       = useAliaStore((s) => s.setResponse)
  const setFocusedSection = useAliaStore((s) => s.setFocusedSection)

  // Read-only reactive selectors
  const voiceState     = useAliaStore((s) => s.voiceState)
  const lastResponse   = useAliaStore((s) => s.lastResponse)
  const pendingAction  = useAliaStore((s) => s.pendingAction)
  const errorMessage   = useAliaStore((s) => s.errorMessage)
  const continuousMode = useAliaStore((s) => s.continuousMode)

  const editorStore = useEditorStore()
  const courseStore = useCourseStore()

  // ── Refs so callbacks never have stale values ─────────────────────────────
  const jobIdRef    = useRef(jobId)
  const sessionRef  = useRef(session)
  const audienceRef          = useRef(courseStore.audience)
  const ruleFamilyRef        = useRef(courseStore.detectedRuleFamily)
  const getCourseSnapshotRef = useRef(editorStore.getCourseSnapshot)

  jobIdRef.current             = jobId
  sessionRef.current           = session
  audienceRef.current          = courseStore.audience
  ruleFamilyRef.current        = courseStore.detectedRuleFamily
  getCourseSnapshotRef.current = editorStore.getCourseSnapshot

  // Ref to access latest aliaStore state from inside recognition callbacks
  const historyRef          = useRef(useAliaStore.getState().history)
  const pendingActionRef    = useRef(useAliaStore.getState().pendingAction)
  const continuousModeRef   = useRef(useAliaStore.getState().continuousMode)
  useAliaStore.subscribe((s) => {
    historyRef.current        = s.history
    pendingActionRef.current  = s.pendingAction
    continuousModeRef.current = s.continuousMode
  })

  // Refs for editor state needed in callbacks
  const activeSectionIdRef    = useRef(editorStore.activeSectionId)
  const sectionEditStatesRef  = useRef(editorStore.sectionEditStates)
  useEditorStore.subscribe((s) => {
    activeSectionIdRef.current   = s.activeSectionId
    sectionEditStatesRef.current = s.sectionEditStates
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  /** Starts auto-listen cycle if continuous mode is active. */
  const maybeAutoListen = useCallback(() => {
    if (!continuousModeRef.current) return
    setTimeout(() => {
      if (useAliaStore.getState().voiceState === 'idle') {
        startListeningInternal()
      }
    }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Internal listen starter — defined before startListening to allow mutual ref. */
  function startListeningInternal() {
    const Recognizer = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognizer) {
      setError('Voice recognition is not supported in your browser.')
      return
    }
    if (recognitionRef.current) recognitionRef.current.abort()

    const recognition = new Recognizer()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    setVoiceState('listening')
    setError(null)

    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim() ?? ''
      if (!transcript) return
      if (pendingActionRef.current) {
        if (/^confirm/i.test(transcript)) { void confirmPending(); return }
        if (/^cancel/i.test(transcript))  { cancelPending();       return }
      }
      void processCommand(transcript)
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        setVoiceState('idle')
      } else {
        setError('Mic error: ' + e.error)
      }
    }

    recognition.onend = () => {
      if (useAliaStore.getState().voiceState === 'listening') {
        setVoiceState('idle')
      }
    }

    recognition.start()
  }

  /** Process a user command — works for both voice transcripts and typed text. */
  const processCommand = useCallback(async (transcript: string) => {
    const currentJobId = jobIdRef.current
    if (!currentJobId) {
      setError('No active job found.')
      speakText('No active course found.', () => setVoiceState('idle'))
      return
    }

    setTranscript(transcript)
    addToHistory('user', transcript)
    setVoiceState('processing')

    const snapshot = getCourseSnapshotRef.current()
    if (!snapshot) {
      setError('Course not loaded yet.')
      speakText('Course not loaded yet.', () => setVoiceState('idle'))
      return
    }

    const context = buildAliaContext(
      snapshot,
      { audience: audienceRef.current, detectedRuleFamily: ruleFamilyRef.current },
      {
        activeSectionId: activeSectionIdRef.current,
        focusedSectionId: useAliaStore.getState().focusedSectionId,
        sectionEditStates: sectionEditStatesRef.current,
      },
    )

    let aliaResp
    try {
      aliaResp = await callAlia(currentJobId, {
        message: transcript,
        context,
        history: historyRef.current,
      })
    } catch {
      const errMsg = "Sorry, I couldn't reach the server. Please try again."
      setError(errMsg)
      speakText(errMsg, () => setVoiceState('idle'))
      return
    }

    setResponse(aliaResp.message, aliaResp.action ?? null)
    addToHistory('alia', aliaResp.message)

    // Destructive actions need confirmation
    if (aliaResp.action && isDestructiveAction(aliaResp.action) && aliaResp.needs_confirm) {
      setPendingAction(aliaResp.action)
      setVoiceState('speaking')
      speakText(aliaResp.message + ' Say confirm to proceed, or cancel to abort.', () => {
        setVoiceState('idle')
      })
      return
    }

    // For AI operations that need a user prompt (rewrite / improve_tone), fall back
    // to the raw transcript if the Alia backend didn't extract one.
    const actionToDispatch = (() => {
      const a = aliaResp.action
      if (
        a &&
        (a.type === 'AI_OP' || a.type === 'BATCH_AI_OP') &&
        (a.operation === 'rewrite' || a.operation === 'improve_tone') &&
        !a.userPrompt
      ) {
        return { ...a, userPrompt: transcript }
      }
      return a
    })()

    // Speak then dispatch
    setVoiceState('speaking')
    speakText(aliaResp.message, async () => {
      if (!actionToDispatch) {
        setVoiceState('idle')
        maybeAutoListen()
        return
      }
      setVoiceState('acting')
      try {
        const result = await dispatchAliaAction(
          actionToDispatch,
          editorStore,
          sessionRef.current,
          jobIdRef.current,
        )
        // Update conversational focus to the section Alia just acted on
        if (result.affectedSectionId) {
          setFocusedSection(result.affectedSectionId)
        }
        // Also update via backend-provided affected IDs if present
        if (aliaResp.affected_section_ids?.[0] && !result.affectedSectionId) {
          setFocusedSection(aliaResp.affected_section_ids[0])
        }
      } catch {
        // dispatchAliaAction handles errors internally
      }
      setVoiceState('idle')
      maybeAutoListen()
    })
  }, [
    setVoiceState, setError, setTranscript, addToHistory,
    setPendingAction, setResponse, setFocusedSection, editorStore, maybeAutoListen,
  ])

  /** Confirm a pending destructive action. */
  const confirmPending = useCallback(async () => {
    const action = confirmPendingFn()
    if (!action) return
    setVoiceState('acting')
    speakText('Done.', () => {
      setVoiceState('idle')
      maybeAutoListen()
    })
    try {
      const result = await dispatchAliaAction(action, editorStore, sessionRef.current, jobIdRef.current)
      if (result.affectedSectionId) setFocusedSection(result.affectedSectionId)
    } catch {
      speakText('Something went wrong.')
      setVoiceState('idle')
    }
  }, [confirmPendingFn, setVoiceState, editorStore, setFocusedSection, maybeAutoListen])

  /** Cancel a pending destructive action. */
  const cancelPending = useCallback(() => {
    cancelPendingFn()
    speakText('Cancelled.')
  }, [cancelPendingFn])

  /** Start listening for a voice command. */
  const startListening = useCallback(() => {
    startListeningInternal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setVoiceState, setError, processCommand, confirmPending, cancelPending])

  /** Stop an active listening session. */
  const stopListening = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setVoiceState('idle')
  }, [setVoiceState])

  return {
    voiceState,
    lastResponse,
    pendingAction,
    errorMessage,
    continuousMode,
    startListening,
    stopListening,
    confirmPending,
    cancelPending,
    processCommand,
  }
}
