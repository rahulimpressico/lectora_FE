import type { PipelineStageId } from '../../types/pipeline'

interface BookLoaderProps {
  activeStageId: PipelineStageId | null
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed'
  size?: 'normal' | 'large'
}

// Per-stage accent colours (used for page tint + glow)
const STAGE_COLORS: Record<string, { glow: string; line: string; label: string }> = {
  A1: { glow: '#6366f1', line: '#a5b4fc', label: 'Interpreting' },
  S1: { glow: '#8b5cf6', line: '#c4b5fd', label: 'Validating' },
  A2: { glow: '#06b6d4', line: '#67e8f9', label: 'Writing' },
  S2: { glow: '#10b981', line: '#6ee7b7', label: 'Reviewing' },
  FINALIZATION: { glow: '#f59e0b', line: '#fcd34d', label: 'Finalizing' },
  EXPORT: { glow: '#ec4899', line: '#f9a8d4', label: 'Exporting' },
}

const DEFAULT_COLOR = { glow: '#6366f1', line: '#a5b4fc', label: 'Preparing' }

// Floating particles — educational symbols
const PARTICLES = ['📖', '✏️', '🎓', '📝', '💡', '🔬']

export function BookLoader({ activeStageId, overallStatus, size = 'normal' }: BookLoaderProps) {
  const colors =
    (activeStageId && STAGE_COLORS[activeStageId]) ?? DEFAULT_COLOR

  const isCompleted = overallStatus === 'completed'
  const isFailed = overallStatus === 'failed'
  const scale = size === 'large' ? 1.45 : 1

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 280 * scale, height: 280 * scale }}
    >

      {/* ── Ambient glow behind book ──────────────────────────────────── */}
      <div
        className="book-glow absolute rounded-full blur-3xl pointer-events-none"
        style={{
          width: 220 * scale,
          height: 180 * scale,
          background: isFailed
            ? 'radial-gradient(ellipse, rgba(239,68,68,0.25) 0%, transparent 70%)'
            : isCompleted
              ? 'radial-gradient(ellipse, rgba(16,185,129,0.3) 0%, transparent 70%)'
              : `radial-gradient(ellipse, ${colors.glow}44 0%, transparent 70%)`,
        }}
      />

      {/* ── Floating particles ──────────────────────────────────────────── */}
      {!isCompleted && !isFailed && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map((emoji, i) => (
            <span
              key={i}
              className="particle absolute text-lg"
              style={{
                left: `${12 + i * 14}%`,
                bottom: '10%',
                fontSize: i % 2 === 0 ? '1.1rem' : '0.85rem',
                filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.5))',
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* ── The Book ───────────────────────────────────────────────────── */}
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {isCompleted ? (
          <CompletedBook />
        ) : isFailed ? (
          <FailedBook />
        ) : (
          <AnimatedBook lineColor={colors.line} glowColor={colors.glow} />
        )}
      </div>

      {/* ── Stage label badge ──────────────────────────────────────────── */}
      {!isCompleted && !isFailed && activeStageId && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{
            background: `${colors.glow}22`,
            border: `1px solid ${colors.glow}55`,
            color: colors.line,
          }}
        >
          {colors.label}
        </div>
      )}
    </div>
  )
}

// ─── Main animated open book ──────────────────────────────────────────────────
function AnimatedBook({
  lineColor,
  glowColor,
}: {
  lineColor: string
  glowColor: string
}) {
  return (
    <div className="relative bounce-gentle" style={{ width: 200, height: 150 }}>
      {/* Book shadow */}
      <div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 blur-xl opacity-40 rounded-full"
        style={{ width: 160, height: 20, background: glowColor }}
      />

      {/* Book body */}
      <div
        className="relative rounded-sm overflow-hidden"
        style={{
          width: 200,
          height: 150,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 24px ${glowColor}33`,
        }}
      >
        {/* Left page */}
        <div
          className="absolute top-2 bottom-2 left-2"
          style={{
            width: 88,
            background: 'linear-gradient(135deg, #fdf6e3 0%, #f5e8c8 100%)',
            borderRadius: '2px 0 0 2px',
            boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.15)',
          }}
        >
          {/* Page lines — left */}
          <div className="p-3 pt-4 space-y-1.5">
            {[100, 85, 90, 65, 80, 70, 88, 55].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  height: 3,
                  width: `${w}%`,
                  background: i === 0
                    ? 'rgba(79,70,229,0.7)'
                    : 'rgba(100,88,66,0.25)',
                  marginTop: i === 0 ? 0 : undefined,
                }}
              />
            ))}
          </div>
          {/* Page number */}
          <div className="absolute bottom-1.5 left-0 right-0 text-center"
            style={{ fontSize: 7, color: 'rgba(100,88,66,0.4)', fontFamily: 'serif' }}>
            ← 12
          </div>
        </div>

        {/* Spine */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: 96,
            width: 8,
            background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            boxShadow: 'inset -1px 0 2px rgba(255,255,255,0.1), inset 1px 0 2px rgba(0,0,0,0.3)',
          }}
        />

        {/* Right page — content being written */}
        <div
          className="absolute top-2 bottom-2 right-2"
          style={{
            left: 106,
            background: 'linear-gradient(135deg, #fefcf3 0%, #fdf6e3 100%)',
            borderRadius: '0 2px 2px 0',
            boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1)',
          }}
        >
          <div className="p-3 pt-4 space-y-1.5 overflow-hidden">
            {/* Animated writing lines */}
            {[75, 55, 88, 42, 70, 60].map((maxW, i) => (
              <div key={i} style={{ height: 3, background: 'transparent', position: 'relative' }}>
                <div
                  className="write-line absolute left-0 top-0 rounded-full"
                  style={{
                    height: 3,
                    maxWidth: `${maxW}%`,
                    background: i === 0
                      ? `linear-gradient(90deg, ${glowColor}, ${lineColor})`
                      : `${lineColor}88`,
                  }}
                />
              </div>
            ))}
            {/* Blinking cursor */}
            <div
              className="ink-cursor rounded-full"
              style={{ height: 3, width: 6, background: lineColor }}
            />
          </div>
          {/* Page number */}
          <div className="absolute bottom-1.5 left-0 right-0 text-center"
            style={{ fontSize: 7, color: 'rgba(100,88,66,0.4)', fontFamily: 'serif' }}>
            13 →
          </div>
        </div>

        {/* Flipping page overlay */}
        <div
          className="page-flip absolute top-2 bottom-2 rounded-sm"
          style={{
            left: 106,
            width: 86,
            background: 'linear-gradient(135deg, #fef9ec 0%, #f5e8c8 100%)',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            boxShadow: '4px 0 12px rgba(0,0,0,0.2)',
          }}
        >
          {/* Front face of flipping page */}
          <div className="absolute inset-0 p-3 pt-4 space-y-1.5">
            {[60, 80, 45, 70, 88, 50].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  height: 3,
                  width: `${w}%`,
                  background: 'rgba(100,88,66,0.2)',
                }}
              />
            ))}
          </div>
          {/* Back face */}
          <div
            className="absolute inset-0 p-3 pt-4 space-y-1.5"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            {[45, 72, 58, 83, 40, 65].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{ height: 3, width: `${w}%`, background: `${lineColor}55` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Decorative rings on book cover corners */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full"
        style={{ background: `${glowColor}88`, boxShadow: `0 0 4px ${glowColor}` }} />
      <div className="absolute bottom-4 left-2 w-1 h-1 rounded-full"
        style={{ background: `${glowColor}66` }} />
    </div>
  )
}

// ─── Completed book (open, glowing green) ─────────────────────────────────────
function CompletedBook() {
  return (
    <div className="completed-pop relative" style={{ width: 200, height: 150 }}>
      {/* Green glow */}
      <div
        className="absolute -inset-4 rounded-full blur-2xl opacity-40"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.6) 0%, transparent 70%)' }}
      />
      <div
        className="relative rounded-sm"
        style={{
          width: 200,
          height: 150,
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(16,185,129,0.4)',
        }}
      >
        {/* Both pages filled */}
        {[{ left: 2 }, { right: 2, left: 106 }].map((pos, pi) => (
          <div
            key={pi}
            className="absolute top-2 bottom-2"
            style={{
              ...pos,
              width: 86,
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: pi === 0 ? '2px 0 0 2px' : '0 2px 2px 0',
            }}
          >
            <div className="p-3 pt-4 space-y-1.5">
              {[85, 70, 90, 60, 80, 55, 75, 45].map((w, i) => (
                <div key={i} className="rounded-full"
                  style={{ height: 3, width: `${w}%`, background: i < 2 ? 'rgba(16,185,129,0.7)' : 'rgba(16,185,129,0.25)' }} />
              ))}
            </div>
          </div>
        ))}
        {/* Spine */}
        <div className="absolute top-0 bottom-0" style={{ left: 96, width: 8, background: 'linear-gradient(180deg, #064e3b, #065f46 50%, #064e3b)' }} />
        {/* Checkmark overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'rgba(16,185,129,0.9)', boxShadow: '0 0 20px rgba(16,185,129,0.6)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Failed book (closed, cracked) ───────────────────────────────────────────
function FailedBook() {
  return (
    <div className="relative" style={{ width: 140, height: 160 }}>
      <div
        className="relative rounded-sm"
        style={{
          width: 140,
          height: 160,
          background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.3)',
        }}
      >
        {/* Cover lines */}
        <div className="absolute inset-4 space-y-2">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="rounded-full"
              style={{ height: 3, width: `${w}%`, background: 'rgba(239,68,68,0.3)' }} />
          ))}
        </div>
        {/* X mark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'rgba(239,68,68,0.85)', boxShadow: '0 0 16px rgba(239,68,68,0.5)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
