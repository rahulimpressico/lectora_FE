import { AlertTriangle, XCircle, Info, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { StageBlocker } from '../../types/pipeline'

interface BlockerAlertProps {
  blocker: StageBlocker
}

const SEVERITY_CONFIG = {
  blocker: {
    Icon: XCircle,
    container: 'bg-red-50 border-red-200',
    iconColor: 'text-red-500',
    textColor: 'text-red-700',
    subText: 'text-red-400',
    badge: 'bg-red-100 text-red-700',
    label: 'Blocker',
  },
  critical: {
    Icon: AlertTriangle,
    container: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-500',
    textColor: 'text-orange-700',
    subText: 'text-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    label: 'Critical',
  },
  warning: {
    Icon: Info,
    container: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-600',
    subText: 'text-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Warning',
  },
} as const

export function BlockerAlert({ blocker }: BlockerAlertProps) {
  const cfg = SEVERITY_CONFIG[blocker.severity]
  const { Icon } = cfg

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 text-xs fade-in',
        cfg.container,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon size={13} className={cn('mt-0.5 shrink-0', cfg.iconColor)} />

        <div className="flex-1 min-w-0">
          {/* Badge + code */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                cfg.badge,
              )}
            >
              {cfg.label}
            </span>
            <code className="text-[10px] text-slate-400 font-mono">{blocker.code}</code>
          </div>

          {/* Message */}
          <p className={cn('leading-relaxed', cfg.textColor)}>{blocker.message}</p>

          {/* Retry hint */}
          {blocker.retryable && (
            <p className={cn('mt-1 flex items-center gap-1', cfg.subText)}>
              <RotateCcw size={10} />
              Retrying automatically…
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
