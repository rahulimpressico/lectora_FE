import { FileText, X, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatBytes } from '../utils/inferRulePackMeta'
import type { UploadedFile } from '../types'

interface FileCardProps {
  file: UploadedFile
  onRemove: (id: string) => void
  onPreview: (file: UploadedFile) => void
}

const statusConfig = {
  idle:      { label: 'Queued',     color: 'text-slate-500',  bg: 'bg-slate-100'    },
  parsing:   { label: 'Parsing…',   color: 'text-amber-600',  bg: 'bg-amber-50'     },
  uploading: { label: 'Uploading…', color: 'text-blue-600',   bg: 'bg-blue-50'      },
  success:   { label: 'Ready',      color: 'text-emerald-600',bg: 'bg-emerald-50'   },
  error:     { label: 'Failed',     color: 'text-red-600',    bg: 'bg-red-50'       },
}

export function FileCard({ file, onRemove, onPreview }: FileCardProps) {
  const cfg = statusConfig[file.status]
  const isProcessing = file.status === 'parsing' || file.status === 'uploading'

  return (
    <div
      className={cn(
        'group flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-all duration-200',
        file.status === 'success'
          ? 'border-emerald-200/80 bg-emerald-50/30 hover:shadow-[0_2px_12px_0_rgb(16,185,129,0.1)]'
          : file.status === 'error'
            ? 'border-red-200/80 bg-red-50/40'
            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-[0_2px_10px_0_rgb(0,0,0,0.06)]',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          cfg.bg,
        )}
      >
        <FileText size={15} className={cfg.color} />
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">{formatBytes(file.sizeBytes)}</span>
          <span className="text-slate-200">·</span>
          <div className="flex items-center gap-1">
            {isProcessing ? (
              <Loader2 size={10} className={cn('animate-spin', cfg.color)} />
            ) : file.status === 'success' ? (
              <CheckCircle2 size={10} className="text-emerald-500" />
            ) : file.status === 'error' ? (
              <AlertCircle size={10} className="text-red-500" />
            ) : null}
            <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
          </div>
          {file.errorMessage && (
            <span className="text-xs text-red-500 truncate">{file.errorMessage}</span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {file.previewHtml && (
          <button
            type="button"
            onClick={() => onPreview(file)}
            title="Preview document"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
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
  )
}
