import { motion } from 'framer-motion'
import { FileText, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import type { DocumentCost } from '../types'

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
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.005 }}
      onClick={() => onClick(doc.documentId)}
      className="group relative w-full rounded-2xl border border-slate-200/70 bg-white p-5 text-left shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_0_rgba(99,102,241,0.10)] hover:border-indigo-200/60 transition-all duration-200 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/50">
            <FileText size={15} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate leading-none">
              {doc.documentName}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{doc.documentType}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* Cost highlight */}
      <div className="mb-4 rounded-xl bg-gradient-to-br from-indigo-50/60 to-violet-50/40 border border-indigo-100/40 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
          Total Cost
        </p>
        <p className="text-xl font-bold text-indigo-700 tabular-nums">
          ${doc.totalCost.toFixed(4)}
        </p>
      </div>

      {/* Token stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-slate-50/80 px-3 py-2">
          <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Input Tokens</p>
          <p className="text-sm font-bold text-slate-700 tabular-nums">{fmtTokens(doc.inputTokens)}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 px-3 py-2">
          <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Output Tokens</p>
          <p className="text-sm font-bold text-slate-700 tabular-nums">{fmtTokens(doc.outputTokens)}</p>
        </div>
      </div>

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
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-400 font-medium">
          Updated {fmtDate(doc.lastUpdated)}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          View details
          <ArrowRight size={11} />
        </span>
      </div>
    </motion.button>
  )
}
