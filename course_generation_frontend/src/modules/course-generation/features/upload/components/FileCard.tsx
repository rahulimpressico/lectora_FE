import { FileText, FileType2, X, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/utils/formatBytes'
import type { ImportanceLevel, SourceRole, UploadedFile } from '../../../types'

interface FileCardProps {
  file: UploadedFile
  onRemove: (id: string) => void
  onPreview: (file: UploadedFile) => void
  onUpdate?: (id: string, patch: Partial<UploadedFile>) => void
}

const SOURCE_ROLE_OPTIONS: { value: SourceRole; label: string }[] = [
  { value: 'primary_source',    label: 'Primary source' },
  { value: 'supporting_source', label: 'Supporting source' },
  { value: 'reference_only',    label: 'Reference only' },
]

const IMPORTANCE_OPTIONS: { value: ImportanceLevel; label: string }[] = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

const stripeColor: Record<UploadedFile['status'], string> = {
  idle:      'bg-slate-200',
  parsing:   'bg-indigo-400',
  uploading: 'bg-indigo-400',
  success:   'bg-emerald-400',
  error:     'bg-red-400',
}

export function FileCard({ file, onRemove, onPreview, onUpdate }: FileCardProps) {
  const isProcessing = file.status === 'parsing' || file.status === 'uploading'
  // After conversion a PDF becomes a DOCX — use the current fileType for the icon
  const isPdf = file.fileType === 'pdf'
  const FileIcon = isPdf ? FileType2 : FileText

  const showMetadata = file.status === 'success' && onUpdate

  return (
    <div
      className={cn(
        'group rounded-xl border bg-white overflow-hidden transition-all duration-150',
        'hover:shadow-[0_2px_8px_-2px_rgb(0,0,0,0.1),0_4px_12px_-4px_rgb(0,0,0,0.07)]',
        file.status === 'error'
          ? 'border-red-200/80 bg-red-50/20'
          : file.status === 'success'
            ? 'border-slate-200/70 hover:border-emerald-200/60'
            : 'border-slate-200/70',
      )}
    >
      {/* ── Main row ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0">
        {/* Left status stripe */}
        <div className={cn('w-1 self-stretch shrink-0 transition-colors', stripeColor[file.status])} />

        {/* Icon */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mx-3',
            isPdf ? 'bg-rose-50' : 'bg-indigo-50',
          )}
        >
          <FileIcon
            size={14}
            className={cn(
              isPdf
                ? file.status === 'error' ? 'text-red-400' : 'text-rose-500'
                : file.status === 'error' ? 'text-red-400' : 'text-indigo-500',
            )}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 py-2.5">
          <p className="truncate text-[13px] font-medium text-slate-700 leading-none">
            {file.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-slate-400">{formatBytes(file.sizeBytes)}</span>
            {file.source === 'azure' && (
              <>
                <span className="text-slate-200">·</span>
                <span className="text-[10px] font-medium text-sky-600">Azure</span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="shrink-0 px-3">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-1">
              <Loader2 size={11} className="text-indigo-500 animate-spin" />
              <span className="text-[10px] font-semibold text-indigo-600">
                {file.status === 'parsing' ? 'Parsing' : 'Uploading'}
              </span>
            </div>
          ) : file.status === 'success' ? (
            <div className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-700">Ready</span>
            </div>
          ) : file.status === 'error' ? (
            <div className="flex items-center gap-1 rounded-md bg-red-50 border border-red-100 px-2 py-1">
              <AlertCircle size={11} className="text-red-500" />
              <span className="text-[10px] font-semibold text-red-600">Failed</span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Queued
            </span>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 pr-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {file.previewHtml && (
            <button
              type="button"
              onClick={() => onPreview(file)}
              title="Preview document"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              <Eye size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            title="Remove file"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Source metadata row (shown after successful upload) ─────────────── */}
      {showMetadata && (
        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 bg-slate-50/60">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <label className="shrink-0 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              What to extract
            </label>
            <select
              value={file.sourceRole ?? 'primary_source'}
              onChange={(e) => onUpdate!(file.id, { sourceRole: e.target.value as SourceRole })}
              className="flex-1 min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            >
              {SOURCE_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Importance
            </label>
            <select
              value={file.importance ?? 'high'}
              onChange={(e) => onUpdate!(file.id, { importance: e.target.value as ImportanceLevel })}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            >
              {IMPORTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
