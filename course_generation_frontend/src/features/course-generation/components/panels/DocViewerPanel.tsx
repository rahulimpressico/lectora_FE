import { FileText, Files, Eye, CheckCircle2, AlertCircle, Loader2, FileX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCourseStore } from '../../store/courseStore'
import { formatBytes } from '../../utils/inferRulePackMeta'
import type { UploadedFile } from '../../types'

// ── Per-file card ─────────────────────────────────────────────────────────────

interface DocFileCardProps {
  file: UploadedFile
  onView: () => void
}

function DocFileCard({ file, onView }: DocFileCardProps) {
  const isReady      = file.status === 'success'
  const isProcessing = file.status === 'parsing' || file.status === 'uploading'
  const isError      = file.status === 'error'

  return (
    <div
      className={cn(
        'group rounded-xl border bg-white p-4 transition-all duration-200',
        isReady
          ? 'border-slate-200/80 shadow-[0_1px_4px_0_rgb(0,0,0,0.05)] hover:shadow-[0_4px_16px_0_rgb(0,0,0,0.08)] hover:-translate-y-px'
          : isError
            ? 'border-red-200/70 bg-red-50/30'
            : 'border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]',
      )}
    >
      {/* Top row: icon + meta */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            isReady
              ? 'bg-gradient-to-br from-indigo-50 to-violet-50'
              : isError
                ? 'bg-red-50'
                : 'bg-slate-100',
          )}
        >
          {isError
            ? <FileX size={17} className="text-red-500" />
            : <FileText size={17} className={isReady ? 'text-indigo-600' : 'text-slate-400'} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.sizeBytes)}</p>

          {/* Status chip */}
          <div className="mt-2">
            {isReady && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 size={10} />
                Ready
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-200">
                <Loader2 size={10} className="animate-spin" />
                Processing
              </span>
            )}
            {file.status === 'idle' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                Queued
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
                <AlertCircle size={10} />
                Failed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* View button — only when preview HTML is available */}
      {file.previewHtml && (
        <button
          type="button"
          onClick={onView}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <Eye size={13} />
          View Document
        </button>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function DocViewerPanel() {
  const { rawDocuments, openPreview } = useCourseStore()

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f4f6f9]">

      {/* Panel header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-5 py-3.5 shrink-0 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Files size={13} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Source Documents</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {rawDocuments.length === 0
                ? 'No files uploaded'
                : `${rawDocuments.length} file${rawDocuments.length !== 1 ? 's' : ''} · click to preview`}
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {rawDocuments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Files size={20} className="text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-500">No documents</p>
            <p className="text-[11px] text-slate-400 max-w-[140px] leading-relaxed">
              Uploaded files will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rawDocuments.map((file) => (
              <DocFileCard
                key={file.id}
                file={file}
                onView={() => openPreview(file)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
