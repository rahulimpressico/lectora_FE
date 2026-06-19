import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  ListTodo,
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { cancelGenerateTO, type TOTaskSummary } from '@/api/course-generation/api'
import { useToTasks, TO_TASKS_QUERY_KEY } from '@/modules/course-generation/features/upload/hooks/useToTasks'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(unixTs: number): string {
  const diffSec = Math.round((Date.now() - unixTs * 1000) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.round(diffMin / 60)}h ago`
}

function formatDuration(createdAt: number, finishedAt: number | null): string {
  const ms = (finishedAt ? finishedAt * 1000 : Date.now()) - createdAt * 1000
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Status badge ──────────────────────────────────────────────────────────────

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
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: TO_TASKS_QUERY_KEY }),
  })

  const sourceName = task.blobPaths[0]
    ? (task.blobPaths[0].split('/').pop() ?? task.blobPaths[0])
    : task.jobId.slice(0, 8)

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded
            ? <ChevronDown size={13} />
            : <ChevronRight size={13} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate" title={sourceName}>
            {sourceName}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{task.message}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} />
          <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 tabular-nums">
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

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-3.5 py-2.5 space-y-1.5 bg-slate-50/60">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Job ID</span>
            <span className="font-mono text-slate-600">{task.jobId.slice(0, 14)}…</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Started</span>
            <span className="text-slate-600">{formatRelativeTime(task.createdAt)}</span>
          </div>
          {task.blobPaths.length > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Source files</span>
              <span className="text-slate-600">{task.blobPaths.length}</span>
            </div>
          )}
          {task.error && (
            <p className="text-[10px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 leading-relaxed">
              {task.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface TasksPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function TasksPanel({ isOpen, onClose }: TasksPanelProps) {
  const { tasks, runningCount, isFetching, refetch } = useToTasks()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Slide-over */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[360px] max-w-[92vw] flex-col bg-white shadow-[-20px_0_60px_-4px_rgba(0,0,0,0.12)] border-l border-slate-200">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 shrink-0">
            <ListTodo size={14} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 leading-none">Tasks</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              TO generation jobs
              {runningCount > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                  <Loader2 size={8} className="animate-spin" />
                  {runningCount} running
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            title="Refresh"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {isFetching && tasks.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <ListTodo size={20} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">No tasks yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  TO generation jobs will appear here.
                </p>
              </div>
            </div>
          ) : (
            tasks.map(task => <TaskRow key={task.jobId} task={task} />)
          )}
        </div>

        {/* Footer summary */}
        {tasks.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''} total</span>
              <span className="flex items-center gap-2">
                <span className="text-emerald-600 font-medium">
                  {tasks.filter(t => t.status === 'completed').length} completed
                </span>
                {tasks.filter(t => t.status === 'failed').length > 0 && (
                  <span className="text-red-500 font-medium">
                    {tasks.filter(t => t.status === 'failed').length} failed
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
