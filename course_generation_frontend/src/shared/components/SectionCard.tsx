import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionCardProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  optional?: boolean
  accent?: boolean
}

export function SectionCard({
  title,
  description,
  badge,
  actions,
  children,
  className,
  optional = false,
  accent = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05),0_4px_12px_0_rgb(0,0,0,0.03)] overflow-hidden',
        accent && 'card-accent',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 bg-slate-50/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
              {optional && (
                <span className="text-xs text-slate-400 font-normal">(optional)</span>
              )}
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}
