import { cn } from '@/lib/cn'
import type { PipelineStageId } from '../../types/pipeline'

interface BookLoaderProps {
  activeStageId: PipelineStageId | null
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed'
  size?: 'normal' | 'large'
}

const STAGE_COLORS: Record<string, { glow: string; line: string; label: string }> = {
  A1: { glow: '#6366F1', line: '#3730A3', label: 'Interpreting' },
  S1: { glow: '#8B5CF6', line: '#5B21B6', label: 'Validating' },
  A2: { glow: '#0EA5E9', line: '#0369A1', label: 'Writing' },
  S2: { glow: '#10B981', line: '#047857', label: 'Reviewing' },
  FINALIZATION: { glow: '#F59E0B', line: '#B45309', label: 'Finalizing' },
  EXPORT: { glow: '#EC4899', line: '#BE185D', label: 'Exporting' },
}

const DEFAULT_COLOR = { glow: '#6366F1', line: '#3730A3', label: 'Preparing' }

const PARTICLES = ['📖', '✏️', '🎓', '📝', '💡', '🔬']

export function BookLoader({
  activeStageId,
  overallStatus,
  size = 'normal',
}: BookLoaderProps) {
  const colors =
    (activeStageId && STAGE_COLORS[activeStageId]) ?? DEFAULT_COLOR

  const isCompleted = overallStatus === 'completed'
  const isFailed = overallStatus === 'failed'
  const isLarge = size === 'large'

  return (
    <div className="mx-auto flex w-full max-w-full flex-col items-center px-1 lg:px-0">
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center',
          isLarge
            ? [
                'max-w-full',
                'max-lg:h-[clamp(200px,32vh,280px)] max-lg:w-[clamp(220px,88vw,340px)]',
                'max-lg:sm:h-[clamp(220px,34vh,300px)] max-lg:sm:w-[clamp(240px,72vw,360px)]',
                'lg:h-[min(400px,38vh)] lg:w-[min(400px,36vw)]',
              ]
            : 'h-[min(360px,80vw)] w-[min(360px,92vw)] max-w-full',
        )}
      >
        <div
          className="book-glow pointer-events-none absolute left-1/2 top-1/2 z-0 h-[58%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background: isFailed
              ? 'radial-gradient(ellipse, rgba(239,68,68,0.25) 0%, transparent 70%)'
              : isCompleted
                ? 'radial-gradient(ellipse, rgba(16,185,129,0.3) 0%, transparent 70%)'
                : `radial-gradient(ellipse, ${colors.glow}66 0%, transparent 70%)`,
          }}
        />

        {!isCompleted && !isFailed && (
          <div className="pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden sm:block">
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

        <div
          className={cn(
            'relative z-10 origin-center',
            isLarge
              ? 'scale-[1.15] sm:scale-[1.35] md:scale-[1.55] lg:scale-[1.85]'
              : 'scale-[1.1] sm:scale-[1.25]',
          )}
        >
          {isCompleted ? (
            <CompletedBook />
          ) : isFailed ? (
            <FailedBook />
          ) : (
            <AnimatedBook lineColor={colors.line} glowColor={colors.glow} />
          )}
        </div>
      </div>

      {!isCompleted && !isFailed && activeStageId && (
        <div
          className="-mt-2 max-w-[92vw] truncate rounded-full border bg-white/75 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-[0_4px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl max-lg:mt-2.5 max-lg:sm:mt-3 sm:text-[11px]"
          style={{
            color: colors.line,
            borderColor: `${colors.glow}45`,
          }}
        >
          {colors.label}
        </div>
      )}
    </div>
  )
}

function AnimatedBook({
  lineColor,
  glowColor,
}: {
  lineColor: string
  glowColor: string
}) {
  return (
    <div className="relative book-float" style={{ width: 200, height: 150 }}>
      <div
        className="absolute -bottom-3 left-1/2 h-5 w-40 -translate-x-1/2 rounded-full blur-xl opacity-40"
        style={{ background: glowColor }}
      />

      <div
        className="relative overflow-hidden rounded-sm"
        style={{
          width: 200,
          height: 150,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 32px ${glowColor}55`,
        }}
      >
        <div
          className="absolute bottom-2 left-2 top-2"
          style={{
            width: 88,
            background: 'linear-gradient(135deg, #fdf6e3 0%, #f5e8c8 100%)',
            borderRadius: '2px 0 0 2px',
            boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.15)',
          }}
        >
          <div className="space-y-1.5 p-3 pt-4">
            {[100, 85, 90, 65, 80, 70, 88, 55].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  height: 3,
                  width: `${w}%`,
                  background:
                    i === 0 ? 'rgba(79,70,229,0.7)' : 'rgba(100,88,66,0.25)',
                }}
              />
            ))}
          </div>
          <div
            className="absolute bottom-1.5 left-0 right-0 text-center"
            style={{ fontSize: 7, color: 'rgba(100,88,66,0.4)', fontFamily: 'serif' }}
          >
            ← 12
          </div>
        </div>

        <div
          className="absolute bottom-0 top-0"
          style={{
            left: 96,
            width: 8,
            background:
              'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            boxShadow:
              'inset -1px 0 2px rgba(255,255,255,0.1), inset 1px 0 2px rgba(0,0,0,0.3)',
          }}
        />

        <div
          className="absolute bottom-2 right-2 top-2"
          style={{
            left: 106,
            background: 'linear-gradient(135deg, #fefcf3 0%, #fdf6e3 100%)',
            borderRadius: '0 2px 2px 0',
            boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1)',
          }}
        >
          <div
            className="scan-beam pointer-events-none absolute bottom-0 top-0"
            style={{
              width: 3,
              background: `linear-gradient(180deg, transparent 0%, ${glowColor}55 20%, ${glowColor} 50%, ${glowColor}55 80%, transparent 100%)`,
              boxShadow: `0 0 10px ${glowColor}88`,
            }}
          />
          <div className="space-y-1.5 overflow-hidden p-3 pt-4">
            {[75, 55, 88, 42, 70, 60].map((maxW, i) => (
              <div key={i} style={{ height: 3, position: 'relative' }}>
                <div
                  className="write-line absolute left-0 top-0 rounded-full"
                  style={{
                    height: 3,
                    maxWidth: `${maxW}%`,
                    background:
                      i === 0
                        ? `linear-gradient(90deg, ${glowColor}, ${lineColor})`
                        : `${lineColor}cc`,
                  }}
                />
              </div>
            ))}
            <div
              className="ink-cursor rounded-full"
              style={{ height: 3, width: 6, background: lineColor }}
            />
          </div>
          <div
            className="absolute bottom-1.5 left-0 right-0 text-center"
            style={{ fontSize: 7, color: 'rgba(100,88,66,0.4)', fontFamily: 'serif' }}
          >
            13 →
          </div>
        </div>

        <div
          className="page-flip absolute bottom-2 top-2 rounded-sm"
          style={{
            left: 106,
            width: 86,
            background: 'linear-gradient(135deg, #fef9ec 0%, #f5e8c8 100%)',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            boxShadow: '4px 0 12px rgba(0,0,0,0.2)',
          }}
        >
          <div className="absolute inset-0 space-y-1.5 p-3 pt-4">
            {[60, 80, 45, 70, 88, 50].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{ height: 3, width: `${w}%`, background: 'rgba(100,88,66,0.2)' }}
              />
            ))}
          </div>
          <div
            className="absolute inset-0 space-y-1.5 p-3 pt-4"
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

      <div
        className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full"
        style={{ background: `${glowColor}88`, boxShadow: `0 0 4px ${glowColor}` }}
      />
      <div
        className="absolute bottom-4 left-2 h-1 w-1 rounded-full"
        style={{ background: `${glowColor}66` }}
      />
    </div>
  )
}

function CompletedBook() {
  return (
    <div className="completed-pop relative" style={{ width: 200, height: 150 }}>
      <div
        className="absolute -inset-4 rounded-full opacity-40 blur-2xl"
        style={{
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.6) 0%, transparent 70%)',
        }}
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
        {[{ left: 2 }, { right: 2, left: 106 }].map((pos, pi) => (
          <div
            key={pi}
            className="absolute bottom-2 top-2"
            style={{
              ...pos,
              width: 86,
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: pi === 0 ? '2px 0 0 2px' : '0 2px 2px 0',
            }}
          >
            <div className="space-y-1.5 p-3 pt-4">
              {[85, 70, 90, 60, 80, 55, 75, 45].map((w, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    height: 3,
                    width: `${w}%`,
                    background:
                      i < 2 ? 'rgba(16,185,129,0.7)' : 'rgba(16,185,129,0.25)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div
          className="absolute bottom-0 top-0"
          style={{
            left: 96,
            width: 8,
            background: 'linear-gradient(180deg, #064e3b, #065f46 50%, #064e3b)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background: 'rgba(16,185,129,0.9)',
              boxShadow: '0 0 20px rgba(16,185,129,0.6)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

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
        <div className="absolute inset-4 space-y-2">
          {[80, 60, 70].map((w, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{ height: 3, width: `${w}%`, background: 'rgba(239,68,68,0.3)' }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background: 'rgba(239,68,68,0.85)',
              boxShadow: '0 0 16px rgba(239,68,68,0.5)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
