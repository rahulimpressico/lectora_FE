import { useRef, useEffect } from 'react'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { LogEntry } from '../../store/pipelineStore'

interface LiveLogPanelProps {
  logs: LogEntry[]
}

const LEVEL_TEXT: Record<LogEntry['level'], string> = {
  info: 'text-slate-500',
  warn: 'text-amber-600',
  error: 'text-red-600',
  success: 'text-emerald-600',
}

const LEVEL_PREFIX: Record<LogEntry['level'], string> = {
  info: '●',
  warn: '▲',
  error: '✕',
  success: '✓',
}

export function LiveLogPanel({ logs }: LiveLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Only auto-scroll if already near bottom (within 60px)
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs.length])

  if (logs.length === 0) return null

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Terminal size={11} className="text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-500 font-mono tracking-wide">
            pipeline.log
          </span>
        </div>
        <span className="ml-auto text-[10px] text-slate-400 font-mono tabular-nums">
          {logs.length} entries
        </span>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto px-4 py-3 space-y-1 font-mono text-[11.5px] leading-5 bg-white"
      >
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 items-start">
            <span className="text-slate-300 shrink-0 tabular-nums select-none w-16">
              {new Date(log.timestamp).toLocaleTimeString([], {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span className={cn('shrink-0 w-3 text-center', LEVEL_TEXT[log.level])}>
              {LEVEL_PREFIX[log.level]}
            </span>
            <span className={cn(LEVEL_TEXT[log.level], 'break-words min-w-0')}>
              {log.message}
            </span>
          </div>
        ))}
        {/* Blinking cursor */}
        <div className="text-indigo-400 animate-pulse select-none">▊</div>
      </div>
    </div>
  )
}
