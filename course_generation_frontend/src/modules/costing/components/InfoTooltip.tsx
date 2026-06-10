import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  content: string
  children?: React.ReactNode
  className?: string
  /** Show a small help icon next to the label. */
  showIcon?: boolean
  placement?: 'top' | 'bottom'
}

export function InfoTooltip({
  content,
  children,
  className,
  showIcon = true,
  placement = 'top',
}: Props) {
  const positionClass =
    placement === 'top'
      ? 'bottom-full left-0 mb-2'
      : 'top-full left-0 mt-2'

  return (
    <span
      className={cn('group/tip relative inline-flex max-w-full items-center gap-1', className)}
    >
      {children}
      {showIcon && (
        <HelpCircle
          size={11}
          className="shrink-0 text-slate-400 opacity-50 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
          aria-hidden
        />
      )}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-normal leading-5 text-slate-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)]',
          'group-hover/tip:block group-focus-within/tip:block',
          positionClass,
        )}
      >
        {content}
      </span>
    </span>
  )
}
