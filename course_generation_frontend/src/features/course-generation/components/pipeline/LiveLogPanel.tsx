import { useRef, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { LogEntry } from '../../store/pipelineStore'

interface LiveLogPanelProps {
  logs: LogEntry[]
}

const LEVEL_STYLE = {
  info: {
    icon: Info,
    iconClass: 'text-slate-400',
    textClass: 'text-slate-600',
    rowClass: '',
  },
  warn: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    textClass: 'text-amber-700',
    rowClass: 'bg-amber-50/60',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-500',
    textClass: 'text-red-700',
    rowClass: 'bg-red-50/60',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    textClass: 'text-emerald-700',
    rowClass: '',
  },
} as const

export function LiveLogPanel({ logs }: LiveLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when new entries arrive (only if already near bottom)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs.length])

  if (logs.length === 0) return null

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
        <span className="text-xs font-semibold text-slate-600 tracking-wide">
          Activity Log
        </span>
        <span className="text-[10px] text-slate-400 tabular-nums">
          {logs.length} {logs.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Entries */}
      <div
        ref={scrollRef}
        className="max-h-56 overflow-y-auto divide-y divide-slate-50"
      >
        {logs.map((log) => {
          const style = LEVEL_STYLE[log.level]
          const Icon = style.icon
          return (
            <div
              key={log.id}
              className={cn(
                'flex items-start gap-3 px-4 py-2 text-xs transition-colors',
                style.rowClass,
              )}
            >
              <Icon size={12} className={cn('shrink-0 mt-0.5', style.iconClass)} />
              <span className={cn('flex-1 min-w-0 break-words leading-relaxed', style.textClass)}>
                {log.message}
              </span>
              <span className="shrink-0 text-[10px] text-slate-300 tabular-nums mt-0.5">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          )
        })}

        {/* Breathing indicator while active */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400"
            style={{ animation: 'pulse-ring 1.8s ease-out infinite' }}
          />
          <span className="text-[10px] text-slate-300">live</span>
        </div>
      </div>
    </div>
  )
}
