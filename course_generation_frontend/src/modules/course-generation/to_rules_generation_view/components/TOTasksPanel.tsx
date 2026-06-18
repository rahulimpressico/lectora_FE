import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ListTodo,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
  Clock,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { cancelGenerateTO, type TOTaskSummary } from '@/api/course-generation/api'
import { useToTasks, TO_TASKS_QUERY_KEY } from '../hooks/useToTasks'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(unixTs: number): string {
  const diffMs = Date.now() - unixTs * 1000
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  return `${diffHr}h ago`
}

function formatDuration(createdAt: number, finishedAt: number | null): string {
  const end = finishedAt ? finishedAt * 1000 : Date.now()
  const ms = end - createdAt * 1000
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function StatusBadge({ status }: { status: TOTaskSummary['status'] }) {
  switch (status) {
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
          <Loader2 size={9} className="animate-spin" />
          Running
        </span>
      )
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <CheckCircle2 size={9} />
          Completed
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
          <XCircle size={9} />
          Failed
        </span>
      )
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          <Ban size={9} />
          Cancelled
        </span>
      )
  }
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: TOTaskSummary }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: () => cancelGenerateTO(task.jobId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY })
    },
  })

  const sourceName = task.blobPaths[0]
    ? task.blobPaths[0].split('/').pop() ?? task.blobPaths[0]
    : task.jobId.slice(0, 8)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown
            size={13}
            className={cn('transition-transform duration-150', !expanded && '-rotate-90')}
          />
        </button>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate" title={sourceName}>
            {sourceName}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{task.message}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} />
          <span className="text-[10px] text-slate-400 tabular-nums flex items-center gap-0.5">
            <Clock size={9} />
            {formatDuration(task.createdAt, task.finishedAt)}
          </span>
          {task.status === 'processing' && (
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              title="Cancel this job"
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-3 py-2 space-y-1 bg-slate-50/60">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Job ID</span>
            <span className="font-mono">{task.jobId.slice(0, 12)}…</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Started</span>
            <span>{formatRelativeTime(task.createdAt)}</span>
          </div>
          {task.blobPaths.length > 0 && (
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Sources</span>
              <span className="text-right max-w-[180px] truncate">{task.blobPaths.length} file{task.blobPaths.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {task.error && (
            <p className="text-[10px] text-red-600 bg-red-50 rounded px-2 py-1 leading-relaxed">
              {task.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface TOTasksPanelProps {
  onClose: () => void
}

export function TOTasksPanel({ onClose }: TOTasksPanelProps) {
  const { tasks, runningCount, isFetching, refetch } = useToTasks()

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-[90]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-4 top-16 z-[91] w-80 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_40px_-8px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/60">
          <ListTodo size={14} className="text-indigo-600 shrink-0" />
          <span className="text-sm font-bold text-slate-800 flex-1">TO Generation Tasks</span>
          {runningCount > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {runningCount} running
            </span>
          )}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            title="Refresh"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-40"
          >
            <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        </div>

        {/* Task list */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-2">
          {isFetching && tasks.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-indigo-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No TO generation tasks yet.
            </div>
          ) : (
            tasks.map(task => <TaskRow key={task.jobId} task={task} />)
          )}
        </div>
      </div>
    </>
  )
}
