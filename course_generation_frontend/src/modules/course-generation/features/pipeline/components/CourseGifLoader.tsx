import { cn } from '@/lib/cn'
import type { PipelineStageId } from '../../../types/pipeline'

const COURSE_GIF_SRC = '/loader-gif/course_gif.gif'

interface CourseGifLoaderProps {
  activeStageId: PipelineStageId | null
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed'
  size?: 'normal' | 'large'
}

export function CourseGifLoader({
  overallStatus,
  size = 'normal',
}: CourseGifLoaderProps) {
  const isCompleted = overallStatus === 'completed'
  const isFailed    = overallStatus === 'failed'

  return (
    <div className="mx-auto flex w-full max-w-full flex-col items-center justify-center">
      {isCompleted ? (
        <CompletedState size={size} />
      ) : isFailed ? (
        <FailedState size={size} />
      ) : (
        <ProcessingState size={size} />
      )}
    </div>
  )
}

function ProcessingState({ size }: { size: 'normal' | 'large' }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        size === 'large'
          ? 'h-[clamp(180px,32vh,320px)] w-[clamp(180px,32vh,320px)]'
          : 'h-[min(280px,70vw)] w-[min(280px,70vw)]',
      )}
    >
      <img
        src={COURSE_GIF_SRC}
        alt="Course generation in progress"
        draggable={false}
        className="h-full w-full object-contain select-none"
      />
    </div>
  )
}

function CompletedState({ size }: { size: 'normal' | 'large' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        size === 'large'
          ? 'h-[clamp(180px,32vh,320px)]'
          : 'h-[min(280px,70vw)]',
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100 shadow-[0_4px_24px_rgba(16,185,129,0.2)]">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 13l4 4L19 7"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-emerald-700">Course generated</p>
    </div>
  )
}

function FailedState({ size }: { size: 'normal' | 'large' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        size === 'large'
          ? 'h-[clamp(180px,32vh,320px)]'
          : 'h-[min(280px,70vw)]',
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 ring-4 ring-red-100 shadow-[0_4px_24px_rgba(239,68,68,0.15)]">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-red-600">Generation failed</p>
    </div>
  )
}
