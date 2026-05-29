import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { PipelineStageId } from '../../types/pipeline'

// ── Props ──────────────────────────────────────────────────────────────────────

interface RobotLoaderProps {
  activeStageId: PipelineStageId | null
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed'
  size?: 'normal' | 'large'
}

// ── Stage color palette ────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, { visor: string; ink: string; label: string }> = {
  A1: { visor: '#7C3AED', ink: '#4F46E5', label: 'Interpreting' },
  S1: { visor: '#9333EA', ink: '#6D28D9', label: 'Validating' },
  A2: { visor: '#0EA5E9', ink: '#0369A1', label: 'Writing' },
  S2: { visor: '#10B981', ink: '#047857', label: 'Reviewing' },
  FINALIZATION: { visor: '#F59E0B', ink: '#B45309', label: 'Finalizing' },
  EXPORT: { visor: '#EC4899', ink: '#BE185D', label: 'Exporting' },
}
const DEFAULT_COLOR = { visor: '#8B5CF6', ink: '#4F46E5', label: 'Preparing' }

// ── Keyframes (rl- prefix prevents global collisions) ─────────────────────────

const ROBOT_ANIMATIONS = `
  /* ── Cinematic float — slight XY drift + micro-rotate for organic feel ── */
  @keyframes rl-float {
    0%         { transform: translateY(0px)   translateX(0px) rotate(0deg); }
    22%        { transform: translateY(-5px)  translateX(1px) rotate(0.3deg); }
    50%        { transform: translateY(-12px) translateX(2px) rotate(0.5deg); }
    78%        { transform: translateY(-5px)  translateX(1px) rotate(0.2deg); }
    100%       { transform: translateY(0px)   translateX(0px) rotate(0deg); }
  }

  /* ── Pencil: slide along paper + micro-rotation for tactile realism ── */
  @keyframes rl-pencil-write {
    0%         { transform: translateX(0px) rotate(0deg); }
    30%, 70%   { transform: translateX(11px) rotate(0.8deg); }
    100%       { transform: translateX(0px) rotate(0deg); }
  }

  /* ── Visor horizontal scan beam ── */
  @keyframes rl-visor-scan {
    0%   { transform: translateX(-100%); opacity: 0; }
    8%   { opacity: 0.9; }
    92%  { opacity: 0.9; }
    100% { transform: translateX(680%); opacity: 0; }
  }

  /* ── Eye glow pulse — staggered between L+R ── */
  @keyframes rl-eye-pulse {
    0%, 100% { opacity: 0.70; transform: scale(0.92); }
    50%      { opacity: 1;    transform: scale(1.0); }
  }

  /* ── Ear accent breathe ── */
  @keyframes rl-accent-breathe {
    0%, 100% { opacity: 0.45; transform: scale(0.88); }
    50%      { opacity: 0.85; transform: scale(1.08); }
  }

  /* ── Writing lines grow then fade ── */
  @keyframes rl-write-line {
    0%, 2%     { width: 0%;    opacity: 0; }
    12%        { opacity: 1; }
    42%, 66%   { width: 100%;  opacity: 1; }
    82%, 100%  { width: 100%;  opacity: 0; }
  }

  /* ── Ink spark at pencil tip ── */
  @keyframes rl-spark {
    0%         { opacity: 0;   transform: scale(0.2) rotate(0deg); }
    35%, 65%   { opacity: 0.9; transform: scale(1.2) rotate(12deg); }
    100%       { opacity: 0;   transform: scale(0.2) rotate(0deg); }
  }

  /* ── Paper border glow pulse ── */
  @keyframes rl-paper-glow {
    0%, 100% { box-shadow: 0 4px 18px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06); }
    50%      { box-shadow: 0 6px 28px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.08); }
  }

  /* ── Shadow pulse synced with float ── */
  @keyframes rl-shadow {
    0%, 100% { transform: translateX(-50%) scaleX(1);    opacity: 0.22; }
    50%      { transform: translateX(-50%) scaleX(0.78); opacity: 0.09; }
  }

  /* ── Floating micro-particles ── */
  @keyframes rl-mote-a {
    0%   { transform: translate(0px, 0px)   scale(0.4); opacity: 0; }
    18%  { opacity: 0.75; }
    100% { transform: translate(5px, -34px)  scale(0.1); opacity: 0; }
  }
  @keyframes rl-mote-b {
    0%   { transform: translate(0px, 0px)   scale(0.4); opacity: 0; }
    22%  { opacity: 0.65; }
    100% { transform: translate(-7px, -30px) scale(0.15); opacity: 0; }
  }
  @keyframes rl-mote-c {
    0%   { transform: translate(0px, 0px)   scale(0.5); opacity: 0; }
    15%  { opacity: 0.8; }
    100% { transform: translate(3px, -40px)  scale(0.1); opacity: 0; }
  }

  /* ── Head specular drift — light appears to "move" across the surface ── */
  @keyframes rl-specular-drift {
    0%, 100% { left: 16px; top: 10px; opacity: 0.30; }
    40%      { left: 22px; top: 14px; opacity: 0.22; }
    70%      { left: 18px; top: 11px; opacity: 0.28; }
  }

  /* ── Completed state: happy squint ── */
  @keyframes rl-happy-eye {
    0%, 80%, 100% { transform: scaleY(1); }
    88%, 95%      { transform: scaleY(0.3); }
  }
  @keyframes rl-check-draw {
    from { stroke-dashoffset: 26; }
    to   { stroke-dashoffset: 0; }
  }

  /* ── Failed state: idle eyes flicker ── */
  @keyframes rl-worried-flicker {
    0%, 90%, 100% { opacity: 1; }
    93%, 97%      { opacity: 0.3; }
  }

  /* ── Orbiting accent ring ── */
  @keyframes rl-ring-orbit {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`

// ── Particle spec ─────────────────────────────────────────────────────────────

interface MoteSpec {
  left: number
  top: number
  size: number
  delay: string
  duration: string
  anim: 'rl-mote-a' | 'rl-mote-b' | 'rl-mote-c'
}

function getMotes(_visorColor: string): MoteSpec[] {
  return [
    { left: 12,  top: 28,  size: 4, delay: '0.0s', duration: '3.6s', anim: 'rl-mote-a' },
    { left: 88,  top: 6,   size: 3, delay: '0.9s', duration: '4.0s', anim: 'rl-mote-c' },
    { left: 158, top: 18,  size: 5, delay: '1.8s', duration: '3.4s', anim: 'rl-mote-b' },
    { left: 172, top: 82,  size: 3, delay: '0.5s', duration: '4.4s', anim: 'rl-mote-a' },
    { left: 130, top: 130, size: 3, delay: '2.3s', duration: '3.8s', anim: 'rl-mote-b' },
    { left: 22,  top: 112, size: 4, delay: '1.3s', duration: '3.2s', anim: 'rl-mote-c' },
  ]
}

// ── Root export ────────────────────────────────────────────────────────────────

export function RobotLoader({
  activeStageId,
  overallStatus,
  size = 'normal',
}: RobotLoaderProps) {
  const colors = (activeStageId && STAGE_COLORS[activeStageId]) ?? DEFAULT_COLOR
  const isCompleted = overallStatus === 'completed'
  const isFailed    = overallStatus === 'failed'
  const isLarge     = size === 'large'

  return (
    <div className="mx-auto flex w-full max-w-full flex-col items-center">
      <style dangerouslySetInnerHTML={{ __html: ROBOT_ANIMATIONS }} />

      {/* ── Responsive wrapper ── */}
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-visible',
          isLarge
            ? [
                'max-w-full',
                'h-[clamp(180px,30vh,260px)] w-[clamp(200px,86vw,320px)]',
                'sm:h-[clamp(210px,33vh,290px)] sm:w-[clamp(220px,66vw,350px)]',
                'lg:h-[min(380px,38vh)] lg:w-[min(380px,34vw)]',
              ]
            : 'h-[min(320px,78vw)] w-[min(320px,90vw)] max-w-full',
        )}
      >
        {/* Stage-color ambient bloom */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-80"
          style={{
            background: isCompleted
              ? 'radial-gradient(ellipse at 50% 60%, rgba(16,185,129,0.18) 0%, transparent 65%)'
              : isFailed
                ? 'radial-gradient(ellipse at 50% 60%, rgba(239,68,68,0.16) 0%, transparent 65%)'
                : `radial-gradient(ellipse at 50% 58%, ${colors.visor}30 0%, transparent 62%)`,
          }}
        />

        {/* ── Scale mount ── */}
        <div
          className={cn(
            'relative z-10 origin-center will-change-transform',
            isLarge
              ? 'scale-[0.88] sm:scale-[1.05] md:scale-[1.28] lg:scale-[1.68]'
              : 'scale-[0.82] sm:scale-[1.0]',
          )}
        >
          {isCompleted ? (
            <RobotCompleted />
          ) : isFailed ? (
            <RobotFailed />
          ) : (
            <RobotWriting colors={colors} />
          )}
        </div>
      </div>

      {/* Stage label pill */}
      {!isCompleted && !isFailed && activeStageId && (
        <div
          className="mt-2 max-w-[90vw] truncate rounded-full border bg-white/78 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] shadow-[0_4px_20px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:text-[11px]"
          style={{ color: colors.ink, borderColor: `${colors.visor}40` }}
        >
          {colors.label}
        </div>
      )}
    </div>
  )
}

// ── Writing (processing) state ─────────────────────────────────────────────────

function RobotWriting({ colors }: { colors: { visor: string; ink: string } }) {
  const v   = colors.visor
  const ink = colors.ink
  const motes = getMotes(v)

  // Writing line config: maxWidth + delay
  const lines = [
    { maxWidth: '82%', delay: '0s' },
    { maxWidth: '64%', delay: '1.1s' },
    { maxWidth: '75%', delay: '2.2s' },
    { maxWidth: '53%', delay: '3.2s' },
  ] as const

  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>

      {/* Entire scene floats together */}
      <div style={{ animation: 'rl-float 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite', position: 'absolute', inset: 0 }}>

        {/* Ground shadow */}
        <div style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          width: 106,
          height: 13,
          borderRadius: '50%',
          background: 'rgba(15,23,42,0.26)',
          filter: 'blur(8px)',
          animation: 'rl-shadow 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
        }} />

        {/* ── Paper / document (z:1) ──────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          zIndex: 1,
          left: 32, top: 136,
          width: 136, height: 58,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `1px solid rgba(220,228,240,0.9)`,
          animation: 'rl-paper-glow 3.8s ease-in-out infinite',
          overflow: 'hidden',
        }}>
          {/* Color accent stripe */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${v}88 0%, ${ink}44 60%, transparent 100%)`,
            borderRadius: '10px 10px 0 0',
          }} />
          {/* Stage-color left ear mark */}
          <div style={{
            position: 'absolute',
            left: 0, top: 3, bottom: 0,
            width: 3,
            background: `linear-gradient(180deg, ${v}66, ${ink}22)`,
          }} />

          {/* Writing lines */}
          <div style={{ paddingTop: 12, paddingLeft: 14, paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ height: 3, background: 'rgba(215,225,240,0.55)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  left: 0, top: 0,
                  height: '100%',
                  width: '100%',
                  maxWidth: line.maxWidth,
                  borderRadius: 2,
                  background: i === 0
                    ? `linear-gradient(90deg, ${v} 0%, ${ink} 100%)`
                    : `${ink}a8`,
                  animation: `rl-write-line 5.8s ${line.delay} cubic-bezier(0.4,0,0.2,1) infinite`,
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Pencil arm (z:3) ────────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          zIndex: 3,
          left: 12,
          top: 114,
          animation: 'rl-pencil-write 2.2s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
        }}>
          {/* Rotate the pencil at 30° — right-end is the writing tip */}
          <div style={{ width: 82, height: 14, transform: 'rotate(30deg)', transformOrigin: 'center center', position: 'relative' }}>

            {/* Eraser */}
            <div style={{
              position: 'absolute', left: 0, top: 0, width: 10, height: 14,
              borderRadius: '3px 0 0 3px',
              background: 'linear-gradient(180deg, #FFCECE 0%, #F08888 100%)',
            }} />
            {/* Ferrule (metallic band) */}
            <div style={{
              position: 'absolute', left: 10, top: 0, width: 6, height: 14,
              background: 'linear-gradient(180deg, #D0D8E0 0%, #A8B4BC 100%)',
            }} />
            {/* Body (yellow) */}
            <div style={{
              position: 'absolute', left: 16, top: 0, right: 8, height: 14,
              background: 'linear-gradient(180deg, #FAD94E 0%, #F4C430 55%, #E2A818 100%)',
            }}>
              <div style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 1, background: 'rgba(160,100,0,0.13)' }} />
              <div style={{ position: 'absolute', top: 9, left: 0, right: 0, height: 1, background: 'rgba(160,100,0,0.10)' }} />
            </div>
            {/* Exposed wood near tip */}
            <div style={{
              position: 'absolute', right: 4, top: 0, width: 4, height: 14,
              background: 'linear-gradient(180deg, #EDD8B0 0%, #CEB080 100%)',
            }} />
            {/* Tip */}
            <div style={{
              position: 'absolute', right: 0, top: 3.5,
              width: 0, height: 0,
              borderTop: '3.5px solid transparent',
              borderBottom: '3.5px solid transparent',
              borderLeft: '4px solid #170800',
            }} />

            {/* Ink spark at tip */}
            <div style={{
              position: 'absolute',
              right: -5, top: '50%',
              marginTop: -4.5,
              width: 9, height: 9,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${v}ff 0%, ${v}aa 60%, transparent 100%)`,
              boxShadow: `0 0 8px 4px ${v}66`,
              animation: `rl-spark 2.2s cubic-bezier(0.45,0.05,0.55,0.95) infinite`,
            }} />
          </div>
        </div>

        {/* ── Floating micro-particles (z:4) ─────────────────────────── */}
        {motes.map((m, i) => (
          <div key={i} style={{
            position: 'absolute',
            zIndex: 4,
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            borderRadius: '50%',
            background: v,
            boxShadow: `0 0 ${m.size * 2}px ${m.size}px ${v}66`,
            animation: `${m.anim} ${m.duration} ${m.delay} cubic-bezier(0.22,1,0.36,1) infinite`,
          }} />
        ))}

        {/* ── Robot head group (z:5) ──────────────────────────────────── */}
        <div style={{ position: 'absolute', zIndex: 5 }}>

          {/* Left ear */}
          <Ear left={18} top={45} accentColor={v} animDelay="0s" />

          {/* Right ear */}
          <Ear left={154} top={45} accentColor={v} animDelay="1.4s" />

          {/* Head — tilts very slightly during float */}
          <div style={{
            position: 'absolute',
            left: 40, top: 2,
            width: 120, height: 120,
          }}>
            {/* Orbiting thin accent ring */}
            <div style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: `1px solid ${v}20`,
              animation: 'rl-ring-orbit 12s linear infinite',
              // small dot on the ring to make rotation visible
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: '50%',
                marginLeft: -2, marginTop: -2,
                width: 4, height: 4,
                borderRadius: '50%',
                background: v,
                boxShadow: `0 0 6px 3px ${v}88`,
              }} />
            </div>

            {/* Head sphere */}
            <div style={{
              width: 120, height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 32% 24%, #D8E9F5 0%, #AAC2D3 38%, #7B9DB4 65%, #5B7D90 100%)',
              boxShadow: `
                inset -7px -9px 22px rgba(0,0,0,0.22),
                inset 5px 6px 16px rgba(255,255,255,0.52),
                0 8px 32px rgba(15,23,42,0.22),
                0 2px 6px rgba(15,23,42,0.12),
                0 0 0 1px rgba(255,255,255,0.12)
              `,
              position: 'relative',
              overflow: 'hidden',
            }}>

              {/* Primary specular highlight — drifts slowly */}
              <div style={{
                position: 'absolute',
                borderRadius: '50%',
                width: 46, height: 24,
                background: 'rgba(255,255,255,0.30)',
                transform: 'rotate(-22deg)',
                filter: 'blur(4px)',
                pointerEvents: 'none',
                animation: 'rl-specular-drift 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
              }} />

              {/* Secondary soft sheen */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 28% 20%, rgba(255,255,255,0.13) 0%, transparent 52%)',
                pointerEvents: 'none',
              }} />

              {/* Visor housing */}
              <div style={{
                position: 'absolute',
                left: 14, bottom: 24,
                width: 92, height: 30,
                borderRadius: 15,
                background: 'linear-gradient(180deg, #0A0A1C 0%, #060610 100%)',
                boxShadow: `
                  inset 0 0 28px ${v}3a,
                  inset 0 2px 6px rgba(0,0,0,0.75),
                  0 1px 0 rgba(255,255,255,0.06)
                `,
                overflow: 'hidden',
              }}>
                {/* Inner ambient glow */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(ellipse at 50% 70%, ${v}2a 0%, transparent 65%)`,
                }} />

                {/* Horizontal scan beam */}
                <div style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  width: 12,
                  background: `linear-gradient(90deg, transparent 0%, ${v}60 40%, ${v}88 50%, ${v}60 60%, transparent 100%)`,
                  animation: 'rl-visor-scan 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
                }} />

                {/* Visor top gloss */}
                <div style={{
                  position: 'absolute',
                  top: 2, left: 8, right: 8, height: 5,
                  borderRadius: 5,
                  background: 'rgba(255,255,255,0.06)',
                }} />

                {/* Left eye */}
                <div style={{
                  position: 'absolute',
                  left: 14, top: 8,
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 36% 30%, ${v}ff 0%, ${v}cc 100%)`,
                  boxShadow: `0 0 10px 5px ${v}88, 0 0 24px 8px ${v}44`,
                  animation: 'rl-eye-pulse 2.6s ease-in-out infinite',
                }} />

                {/* Right eye */}
                <div style={{
                  position: 'absolute',
                  right: 14, top: 8,
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 36% 30%, ${v}ff 0%, ${v}cc 100%)`,
                  boxShadow: `0 0 10px 5px ${v}88, 0 0 24px 8px ${v}44`,
                  animation: 'rl-eye-pulse 2.6s 0.32s ease-in-out infinite',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Ear sub-component ──────────────────────────────────────────────────────────

function Ear({ left, top, accentColor, animDelay }: { left: number; top: number; accentColor: string; animDelay: string }) {
  return (
    <div style={{
      position: 'absolute',
      left, top,
      width: 28, height: 28,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 34% 28%, #CDDAE6 0%, #8EA6B8 55%, #688898 100%)',
      boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.24), inset 2px 2px 4px rgba(255,255,255,0.44)',
    }}>
      {/* Accent LED inside ear */}
      <div style={{
        position: 'absolute',
        left: 7, top: 7,
        width: 10, height: 10,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}ff 0%, ${accentColor}88 100%)`,
        boxShadow: `0 0 6px 3px ${accentColor}55`,
        animation: `rl-accent-breathe 2.8s ${animDelay} ease-in-out infinite`,
      }} />
    </div>
  )
}

// ── Shared head shell ──────────────────────────────────────────────────────────

function RobotHeadShell({ visorColor, children }: { visorColor: string; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', zIndex: 5 }}>
      {/* Left ear */}
      <div style={{
        position: 'absolute', left: 18, top: 45, width: 28, height: 28,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 34% 28%, #CDDAE6 0%, #8EA6B8 55%, #688898 100%)',
        boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.24)',
      }} />
      {/* Right ear */}
      <div style={{
        position: 'absolute', left: 154, top: 45, width: 28, height: 28,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 34% 28%, #CDDAE6 0%, #8EA6B8 55%, #688898 100%)',
        boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.24)',
      }} />
      {/* Head */}
      <div style={{ position: 'absolute', left: 40, top: 2, width: 120, height: 120 }}>
        <div style={{
          width: 120, height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 32% 24%, #D8E9F5 0%, #AAC2D3 38%, #7B9DB4 65%, #5B7D90 100%)',
          boxShadow: 'inset -7px -9px 22px rgba(0,0,0,0.22), inset 5px 6px 16px rgba(255,255,255,0.52), 0 8px 32px rgba(15,23,42,0.18)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: 18, top: 12, width: 44, height: 22,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.28)',
            transform: 'rotate(-22deg)',
            filter: 'blur(3px)',
          }} />
          {/* Visor */}
          <div style={{
            position: 'absolute',
            left: 14, bottom: 24,
            width: 92, height: 30,
            borderRadius: 15,
            background: '#060610',
            boxShadow: `inset 0 0 24px ${visorColor}3a, inset 0 2px 5px rgba(0,0,0,0.7)`,
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 50% 70%, ${visorColor}22 0%, transparent 65%)`,
            }} />
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Completed state ────────────────────────────────────────────────────────────

function RobotCompleted() {
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <div style={{ animation: 'rl-float 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite', position: 'absolute', inset: 0 }}>

        {/* Shadow */}
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', width: 106, height: 13,
          borderRadius: '50%', background: 'rgba(16,185,129,0.24)', filter: 'blur(8px)',
          animation: 'rl-shadow 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
        }} />

        {/* Completed paper */}
        <div style={{
          position: 'absolute', zIndex: 1, left: 32, top: 136, width: 136, height: 58,
          borderRadius: 10,
          background: 'linear-gradient(145deg, #F0FDF6 0%, #DCFCE7 100%)',
          boxShadow: '0 4px 20px rgba(16,185,129,0.16), 0 1px 4px rgba(15,23,42,0.07)',
          border: '1px solid rgba(110,231,183,0.50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            <circle cx="21" cy="21" r="19" fill="rgba(16,185,129,0.13)" />
            <circle cx="21" cy="21" r="14" fill="rgba(16,185,129,0.10)" />
            <path
              d="M11 21.5l7 7 14-15"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="26"
              style={{ animation: 'rl-check-draw 0.6s 0.15s ease-out forwards', strokeDashoffset: 26 }}
            />
          </svg>
        </div>

        <RobotHeadShell visorColor="#10B981">
          {/* Happy eyes — squint blink */}
          <div style={{
            position: 'absolute', left: 14, top: 8, width: 14, height: 14,
            borderRadius: '50%', background: '#10B981',
            boxShadow: '0 0 10px 5px rgba(16,185,129,0.85)',
            animation: 'rl-happy-eye 3.2s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', right: 14, top: 8, width: 14, height: 14,
            borderRadius: '50%', background: '#10B981',
            boxShadow: '0 0 10px 5px rgba(16,185,129,0.85)',
            animation: 'rl-happy-eye 3.2s 0.15s ease-in-out infinite',
          }} />
        </RobotHeadShell>
      </div>
    </div>
  )
}

// ── Failed state ───────────────────────────────────────────────────────────────

function RobotFailed() {
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <div style={{ position: 'absolute', inset: 0 }}>

        {/* Shadow */}
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', width: 106, height: 13,
          borderRadius: '50%', background: 'rgba(239,68,68,0.18)', filter: 'blur(8px)',
          transform: 'translateX(-50%)',
        }} />

        {/* Failed paper */}
        <div style={{
          position: 'absolute', zIndex: 1, left: 32, top: 136, width: 136, height: 58,
          borderRadius: 10,
          background: 'linear-gradient(145deg, #FFF6F6 0%, #FEE5E5 100%)',
          boxShadow: '0 4px 18px rgba(239,68,68,0.10), 0 1px 4px rgba(15,23,42,0.07)',
          border: '1px solid rgba(252,165,165,0.50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            <circle cx="21" cy="21" r="19" fill="rgba(239,68,68,0.10)" />
            <path d="M14 14l14 14M28 14L14 28" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        <RobotHeadShell visorColor="#EF4444">
          {/* Worried flickering eyes */}
          <div style={{
            position: 'absolute', left: 18, top: 9, width: 10, height: 10,
            borderRadius: '50%', background: '#EF4444',
            boxShadow: '0 0 8px 4px rgba(239,68,68,0.75)',
            animation: 'rl-worried-flicker 4.0s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', right: 18, top: 9, width: 10, height: 10,
            borderRadius: '50%', background: '#EF4444',
            boxShadow: '0 0 8px 4px rgba(239,68,68,0.75)',
            animation: 'rl-worried-flicker 4.0s 0.5s ease-in-out infinite',
          }} />
        </RobotHeadShell>
      </div>
    </div>
  )
}
