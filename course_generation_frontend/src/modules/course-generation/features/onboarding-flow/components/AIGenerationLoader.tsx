import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useCourseStore } from '../store'
import { formatElapsed } from '../utils/formatElapsed'
import type { AIGenerationLoaderProps } from '../types/aiGenerationLoader'

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '0 0' }} />
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
      {children}
    </p>
  )
}

function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4L3 5.5L6.5 2" stroke="#16a34a" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontSize: 13, color: '#475569', fontWeight: 450 }}>{label}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIGenerationLoader({ onCancel, statusMessage }: AIGenerationLoaderProps) {
  // Real elapsed time — initialized once on mount, never reset
  const startRef = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)

  const rawDocuments = useCourseStore((s) => s.rawDocuments)
  const wizardData   = useCourseStore((s) => s.wizardData)

  const fileCount      = rawDocuments.filter((f) => f.status === 'success').length
  const objectiveCount = wizardData.objectives.length

  // Poll at 500 ms so the counter feels live without the 1s latency perception
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const displayStatus = statusMessage ?? 'Waiting for response…'
  const hasContext    = fileCount > 0 || objectiveCount > 0

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="ai-gen-loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'rgba(241,245,249,0.72)',
        }}
        aria-modal="true"
        aria-label="Generating Course Structure"
        aria-busy="true"
      >
        {/* ── Glass card ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
          style={{
            maxWidth: 400,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(255,255,255,0.7)',
            boxShadow: [
              '0 20px 60px rgba(0,0,0,0.08)',
              '0 4px 16px rgba(0,0,0,0.05)',
              '0 1px 0 rgba(255,255,255,1) inset',
            ].join(', '),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            overflow: 'hidden',
          }}
        >
          {/* ── Header row ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              {/* Spinner — the only decorative animation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: '2px solid rgba(99,102,241,0.15)',
                  borderTopColor: '#6366f1',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.01em' }}>
                Generating Course Outline
              </span>
            </div>

            {onCancel && (
              <motion.button
                type="button"
                onClick={onCancel}
                whileTap={{ scale: 0.88 }}
                className="text-slate-400 hover:text-slate-600 transition-colors flex items-center"
                style={{ padding: 4, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          <Divider />

          {/* ── Elapsed time — the honest centerpiece ───────────────────── */}
          <div className="flex flex-col items-center px-6 py-7">
            <motion.div
              key={elapsed}
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12 }}
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: '#4f46e5',
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
              }}
            >
              {formatElapsed(elapsed)}
            </motion.div>
            <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 9 }}>
              Time elapsed
            </p>
          </div>

          <Divider />

          {/* ── Live status — real backend message ──────────────────────── */}
          <div className="px-6 py-5">
            <SectionLabel>Status</SectionLabel>
            <div className="flex items-start gap-2.5">
              {/* Pulsing live dot */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}
                style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  marginTop: 5,
                  background: '#6366f1',
                  boxShadow: '0 0 5px rgba(99,102,241,0.45)',
                }}
              />
              <AnimatePresence mode="wait">
                <motion.p
                  key={displayStatus}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ fontSize: 14, color: '#334155', fontWeight: 500, lineHeight: 1.45 }}
                >
                  {displayStatus}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Context — real data from the store ──────────────────────── */}
          {hasContext && (
            <>
              <Divider />
              <div className="px-6 py-5">
                <SectionLabel>Context</SectionLabel>
                <div className="flex flex-col gap-2.5">
                  {fileCount > 0 && (
                    <CheckRow label={`${fileCount} source ${fileCount === 1 ? 'file' : 'files'} loaded`} />
                  )}
                  {objectiveCount > 0 && (
                    <CheckRow label={`${objectiveCount} learning ${objectiveCount === 1 ? 'objective' : 'objectives'} received`} />
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Cancel footer ───────────────────────────────────────────── */}
          {onCancel && (
            <>
              <Divider />
              <div className="px-6 py-3">
                <motion.button
                  type="button"
                  onClick={onCancel}
                  whileTap={{ scale: 0.97 }}
                  className="w-full text-slate-400 hover:text-slate-600 transition-colors"
                  style={{
                    padding: '7px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                >
                  Cancel generation
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
