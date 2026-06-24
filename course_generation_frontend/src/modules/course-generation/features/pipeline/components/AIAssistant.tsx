import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, Sparkles } from 'lucide-react'

const GREETING =
  'Hello! My name is Alia. Tell me how I can help you edit your course today.'

const WAVE_HEIGHTS = [8, 14, 10, 16, 9]

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

// ── Floating avatar overlay ─────────────────────────────────────────────────
// Alia floats between the left nav and main editor — no panel, editor stays usable.

interface AIAssistantOverlayProps {
  onClose: () => void
}

export function AIAssistantOverlay({ onClose }: AIAssistantOverlayProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    let cancelled = false

    playChime()

    const timer = setTimeout(() => {
      if (cancelled || !('speechSynthesis' in window)) return

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(GREETING)
      utterance.rate = 0.92
      utterance.pitch = 1.08
      utterance.volume = 1
      utterance.onstart = () => { if (!cancelled) setIsSpeaking(true) }
      utterance.onend   = () => { if (!cancelled) setIsSpeaking(false) }
      utterance.onerror = () => { if (!cancelled) setIsSpeaking(false) }
      window.speechSynthesis.speak(utterance)
    }, 520)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  return (
    // pointer-events-none keeps the editor clickable; children opt back in.
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
        className="pointer-events-auto relative max-w-[200px] rounded-2xl rounded-bl-none bg-white px-4 py-3 shadow-xl ring-1 ring-slate-100 sm:max-w-[220px]"
      >
        <p className="text-sm font-semibold text-slate-800">Hi, I'm Alia 👋</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
          Tell me how I can help you edit your course.
        </p>

        {/* Bubble tail — points toward the avatar below-left */}
        <div
          aria-hidden
          className="absolute -bottom-[9px] left-4 h-4 w-4 rotate-45 bg-white shadow-[2px_2px_0px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-100"
        />

        {/* Sound-wave while speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 flex items-center gap-[3px] overflow-hidden"
              aria-label="Alia is speaking"
            >
              {WAVE_HEIGHTS.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-indigo-400"
                  style={{ height: h }}
                  animate={{ scaleY: [1, 2.0, 1] }}
                  transition={{
                    duration: 0.68,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Avatar PNG ── */}
      <div className="pointer-events-auto relative">
        {/* Dismiss button — small, tucked at top-right of the avatar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss Alia"
          className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition-colors hover:text-slate-700"
        >
          <X size={10} />
        </button>

        {/* Mic badge — visible only while speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -right-2 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 shadow-md ring-2 ring-white"
            >
              <Mic size={11} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transparent PNG — gentle continuous float */}
        <motion.img
          src="/images/hey_bot.png"
          alt="Alia – AI Assistant"
          draggable={false}
          className="h-36 w-36 object-contain drop-shadow-2xl sm:h-44 sm:w-44"
          animate={{ y: [0, -9, 0] }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  )
}

// ── Pulsing label button ────────────────────────────────────────────────────

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
      {/* Continuous pulse ring */}
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
