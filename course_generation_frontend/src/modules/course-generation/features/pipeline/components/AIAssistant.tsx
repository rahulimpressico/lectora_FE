import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Sparkles, Loader2, Send, RefreshCw } from 'lucide-react'
import { useAliaSession } from '../hooks/useAliaSession'
import { useAliaStore } from '../../../store/aliaStore'
import type { DispatchSession } from '../../../utils/dispatchAliaAction'
import type { AliaVoiceState } from '../../../types/alia'

const GREETING_SHORT = 'Tell me how I can help you edit your course.'
const WAVE_HEIGHTS = [8, 14, 10, 16, 9, 12, 7]

// ── Image mapping ─────────────────────────────────────────────────────────────
// hey_bot      — waving   → greeting / initial idle
// neutral_bot  — calm     → resting idle / processing
// section_bot  — pointing → listening / speaking (explaining)
// task_done_bot — thumbs up → just completed an action

function getBotImage(voiceState: AliaVoiceState, justDone: boolean): string {
  if (justDone)                                  return '/images/task_done_bot.png'
  if (voiceState === 'listening')                return '/images/section_bot.png'
  if (voiceState === 'speaking')                 return '/images/section_bot.png'
  if (voiceState === 'processing')               return '/images/neutral_bot.png'
  if (voiceState === 'acting')                   return '/images/neutral_bot.png'
  if (voiceState === 'error')                    return '/images/neutral_bot.png'
  return '/images/hey_bot.png'
}

function playChime(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx() as AudioContext
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.13)
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.26)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.04)
    gain.gain.setValueAtTime(0.18, ctx.currentTime + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.65)
  } catch {
    // AudioContext unavailable — skip silently
  }
}

// ── Bubble content helpers ─────────────────────────────────────────────────────

function getHeadline(
  voiceState: string,
  lastResponse: string,
  errorMessage: string | null,
  pendingAction: unknown,
): { headline: string; sub: string } {
  if (errorMessage) return { headline: 'Oops!', sub: errorMessage }
  if (pendingAction)
    return { headline: 'Are you sure?', sub: 'Say "confirm" to proceed or "cancel" to abort.' }
  if (voiceState === 'listening')  return { headline: 'Listening…', sub: 'Speak your command.' }
  if (voiceState === 'processing') return { headline: 'Thinking…', sub: 'Parsing your request…' }
  if (voiceState === 'acting')     return { headline: 'Working on it…', sub: 'Running AI operation, please wait.' }
  if (lastResponse)                return { headline: 'Alia', sub: lastResponse }
  return { headline: "Hi, I'm Alia 👋", sub: GREETING_SHORT }
}

// ── Floating avatar overlay ────────────────────────────────────────────────────

interface AIAssistantOverlayProps {
  onClose: () => void
  jobId: string
  session: DispatchSession
}

export function AIAssistantOverlay({ onClose, jobId, session }: AIAssistantOverlayProps) {
  const aliaStore = useAliaStore()
  const {
    voiceState, errorMessage, pendingAction, lastResponse, continuousMode,
    startListening, stopListening, confirmPending, cancelPending, processCommand,
  } = useAliaSession({ jobId, session })

  const lastTranscript = useAliaStore((s) => s.lastTranscript)

  // Brief "thumbs-up" moment after an action completes
  const [justDone, setJustDone] = useState(false)
  const prevVoiceStateRef = useRef(voiceState)
  useEffect(() => {
    if (prevVoiceStateRef.current === 'acting' && voiceState === 'idle') {
      setJustDone(true)
      const t = setTimeout(() => setJustDone(false), 2200)
      return () => clearTimeout(t)
    }
    prevVoiceStateRef.current = voiceState
  }, [voiceState])

  // Text input state
  const [textInput, setTextInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isListening  = voiceState === 'listening'
  const isSpeaking   = voiceState === 'speaking'
  const isProcessing = voiceState === 'processing' || voiceState === 'acting'
  const isActive     = isListening || isSpeaking || isProcessing
  const isBusy       = isProcessing || isSpeaking
  const hasPending   = !!pendingAction

  const botImage = getBotImage(voiceState, justDone)

  // Greet on mount
  useEffect(() => {
    let cancelled = false
    playChime()
    const timer = setTimeout(() => {
      if (cancelled || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(
        'Hello! My name is Alia. Tell me how I can help you edit your course today.',
      )
      utterance.rate  = 0.92
      utterance.pitch = 1.08
      utterance.volume = 1
      window.speechSynthesis.speak(utterance)
    }, 520)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      aliaStore.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { headline, sub } = getHeadline(voiceState, lastResponse, errorMessage, pendingAction)

  const handleMicClick = () => {
    if (isListening) stopListening()
    else if (!isBusy) startListening()
  }

  const handleTextSubmit = () => {
    const text = textInput.trim()
    if (!text || isBusy) return
    setTextInput('')
    void processCommand(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -40, scale: 0.82 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="pointer-events-none absolute left-4 lg:left-60 xl:left-64 top-1/2 z-50 flex -translate-y-1/2 flex-col items-start gap-2 pl-3"
    >
      {/* ── Speech bubble ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.82, x: -16 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.28, duration: 0.26, ease: 'easeOut' }}
        className={[
          'pointer-events-auto relative w-[230px] rounded-2xl rounded-bl-none bg-white px-4 py-3 shadow-xl',
          isListening
            ? 'ring-2 ring-emerald-400 shadow-emerald-100'
            : 'ring-1 ring-slate-100',
        ].join(' ')}
      >
        {/* Listening status strip */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-2 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-emerald-700">
                  LISTENING
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last user transcript — conversational continuity */}
        <AnimatePresence>
          {lastTranscript && !isListening && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-1.5 overflow-hidden text-[11px] italic text-slate-400 leading-snug"
            >
              You: {lastTranscript}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="text-sm font-semibold text-slate-800">{headline}</p>
        {sub && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{sub}</p>
        )}

        {/* Confirm / cancel buttons for destructive actions */}
        <AnimatePresence>
          {hasPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 flex gap-2 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => void confirmPending()}
                className="flex-1 rounded-lg bg-red-500 py-1 text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={cancelPending}
                className="flex-1 rounded-lg bg-slate-100 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sound-wave while speaking or listening */}
        <AnimatePresence>
          {(isSpeaking || isListening) && !hasPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 flex items-center gap-[3px] overflow-hidden"
              aria-label={isSpeaking ? 'Alia is speaking' : 'Listening'}
            >
              {WAVE_HEIGHTS.map((h, i) => (
                <motion.div
                  key={i}
                  className={`w-[3px] rounded-full ${isListening ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                  style={{ height: h }}
                  animate={{ scaleY: [1, 2.2, 1] }}
                  transition={{
                    duration: 0.62,
                    repeat: Infinity,
                    delay: i * 0.09,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spinner while processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-center gap-1.5"
            >
              <Loader2 size={12} className="animate-spin text-indigo-400" />
              <span className="text-[11px] text-slate-400">Working…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Text input ── */}
        <AnimatePresence>
          {!isListening && !isSpeaking && !hasPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className={[
                'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors',
                isProcessing
                  ? 'border-slate-100 bg-slate-50'
                  : 'border-slate-200 bg-white focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-200',
              ].join(' ')}>
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isBusy}
                  placeholder={isProcessing ? 'Working…' : 'Type a command…'}
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-300 outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={isBusy || !textInput.trim()}
                  className="flex-shrink-0 rounded-lg bg-indigo-500 p-1 text-white transition-colors hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  <Send size={10} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continuous mode toggle */}
        <div className="mt-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => aliaStore.toggleContinuousMode()}
            className={[
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
              continuousMode
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-slate-100 text-slate-400 hover:text-slate-600',
            ].join(' ')}
            title="Auto-listen after each response"
          >
            <RefreshCw size={8} className={continuousMode ? 'animate-spin' : ''} />
            {continuousMode ? 'Auto-listen on' : 'Auto-listen'}
          </button>
        </div>

        {/* Bubble tail */}
        <div
          aria-hidden
          className="absolute -bottom-[9px] left-4 h-4 w-4 rotate-45 bg-white shadow-[2px_2px_0px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-100"
        />
      </motion.div>

      {/* ── Avatar ── */}
      <div className="pointer-events-auto relative">
        {/* Dismiss */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss Alia"
          className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition-colors hover:text-slate-700"
        >
          <X size={10} />
        </button>

        {/* Mic toggle badge */}
        <motion.button
          type="button"
          onClick={handleMicClick}
          disabled={isBusy}
          aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
          className={[
            'absolute -right-2 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md ring-2 ring-white transition-colors',
            isListening
              ? 'bg-emerald-500 hover:bg-emerald-600'
              : isBusy
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-indigo-500 hover:bg-indigo-600',
          ].join(' ')}
          animate={isListening ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isListening
            ? <MicOff size={13} className="text-white" />
            : <Mic size={13} className="text-white" />
          }
        </motion.button>

        {/* Active glow ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={[
                'pointer-events-none absolute inset-0 rounded-full ring-4',
                isListening ? 'ring-emerald-400/60' : 'ring-indigo-400/50',
              ].join(' ')}
            />
          )}
        </AnimatePresence>

        {/* Listening ripple rings */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/25"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.85, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/15"
              />
            </>
          )}
        </AnimatePresence>

        {/* Avatar PNG — gentle float + image swap on state change */}
        <AnimatePresence mode="wait">
          <motion.img
            key={botImage}
            src={botImage}
            alt="Alia – AI Assistant"
            draggable={false}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{
              opacity: { duration: 0.2 },
              scale:   { duration: 0.2 },
              y: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="h-36 w-36 object-contain drop-shadow-2xl sm:h-44 sm:w-44"
          />
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Pulsing label button ───────────────────────────────────────────────────────

interface AIAssistantLabelProps {
  onClick: () => void
}

export function AIAssistantLabel({ onClick }: AIAssistantLabelProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open AI Assistant"
      className="relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all duration-150 hover:scale-105 hover:shadow-lg active:scale-100"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-0.5 animate-ping rounded-full bg-indigo-400/40"
      />
      <Sparkles size={11} className="relative shrink-0" />
      <span className="relative hidden sm:inline">AI Assistant</span>
      <span className="relative sm:hidden">AI</span>
    </button>
  )
}
