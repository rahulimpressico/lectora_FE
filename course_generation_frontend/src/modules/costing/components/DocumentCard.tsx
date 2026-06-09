import { motion } from 'framer-motion'
import { FileText, CheckCircle, Clock, AlertCircle, ArrowRight, Cpu, Layers, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { DocumentCost } from '../types'
import {
  formatStageShare,
  getDocumentTypeBadgeClass,
  getStageColor,
  getTopStages,
} from '../utils/documentCosting'

interface Props {
  doc: DocumentCost
  onClick: (id: string) => void
  delay?: number
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: DocumentCost['status'] }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle size={9} />
        Completed
      </span>
    )
  }
  if (status === 'in-progress') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Clock size={9} />
        In Progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <AlertCircle size={9} />
      Failed
    </span>
  )
}

export function DocumentCard({ doc, onClick, delay = 0 }: Props) {
  const totalTokens = doc.inputTokens + doc.outputTokens
  const topStages = getTopStages(doc, 2)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.005 }}
      onClick={() => onClick(doc.documentId)}
      className="group relative w-full overflow-hidden rounded-[22px] border border-slate-200/70 bg-white p-5 text-left shadow-[0_10px_35px_-24px_rgba(15,23,42,0.25)] transition-all duration-200 hover:border-indigo-200/60 hover:shadow-[0_18px_50px_-28px_rgba(99,102,241,0.22)] cursor-pointer"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_42%),linear-gradient(180deg,_rgba(248,250,255,0.9)_0%,_rgba(255,255,255,0)_100%)] opacity-80" />

      {/* Header */}
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-[0_6px_18px_-14px_rgba(99,102,241,0.45)]">
            <FileText size={15} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Document
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 truncate leading-none">
              {doc.documentName}
            </p>
            <span
              className={cn(
                'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                getDocumentTypeBadgeClass(doc.documentType),
              )}
            >
              {doc.documentType}
            </span>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {doc.runSummary && (
        <p className="relative mb-4 line-clamp-2 text-[11px] leading-5 text-slate-500">
          {doc.runSummary}
        </p>
      )}

      {/* Cost highlight */}
      <div className="mb-4 rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/70 to-violet-50/50 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-400">
              Total Cost
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-indigo-700">
              ${doc.totalCost.toFixed(4)}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            <ReceiptText size={15} className="text-indigo-600" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-400">Requests</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-700">{doc.totalRequests}</p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-400">Total Tokens</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-700">{fmtTokens(totalTokens)}</p>
          </div>
        </div>
      </div>

      {/* Token stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Cpu size={11} className="text-cyan-500" />
            <p className="text-[10px] font-semibold text-slate-400">Input Tokens</p>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700 tabular-nums">{fmtTokens(doc.inputTokens)}</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Layers size={11} className="text-violet-500" />
            <p className="text-[10px] font-semibold text-slate-400">Output Tokens</p>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700 tabular-nums">{fmtTokens(doc.outputTokens)}</p>
        </div>
      </div>

      {topStages.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Top spend by stage
          </p>
          {topStages.map((stage) => (
            <div key={stage.stageKey} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getStageColor(stage.stageKey) }}
                />
                <span className="truncate text-[11px] font-medium text-slate-600">
                  {stage.stageName}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-700">
                ${stage.cost.toFixed(4)}
                <span className="ml-1 font-medium text-slate-400">
                  ({formatStageShare(stage, doc.totalCost)})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Models used */}
      <div className="flex flex-wrap gap-1 mb-4">
        {doc.modelsUsed.map((m) => (
          <span
            key={m}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-[10px] text-slate-400 font-medium">
          Updated {fmtDate(doc.lastUpdated)}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 opacity-70 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100">
          View details
          <ArrowRight size={11} />
        </span>
      </div>
    </motion.button>
  )
}
