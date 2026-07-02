import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { LoSyncResult } from '../utils/loOutlineSync'

interface LoSyncStatusPanelProps {
  status: LoSyncResult | null
  className?: string
}

export function LoSyncStatusPanel({ status, className }: LoSyncStatusPanelProps) {
  if (!status) return null

  const hasErrors = status.errors.length > 0
  const hasWarnings = status.warnings.length > 0

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3',
        hasErrors
          ? 'border-red-200 bg-red-50/80'
          : status.outlineInvalidated
            ? 'border-amber-200 bg-amber-50/80'
            : 'border-emerald-200 bg-emerald-50/80',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {hasErrors ? (
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        ) : status.outlineInvalidated ? (
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-semibold',
              hasErrors ? 'text-red-800' : status.outlineInvalidated ? 'text-amber-900' : 'text-emerald-900',
            )}
          >
            {status.success ? 'Objectives synced' : 'Objectives need attention'}
          </p>
          <p
            className={cn(
              'text-xs mt-0.5',
              hasErrors ? 'text-red-700' : status.outlineInvalidated ? 'text-amber-800' : 'text-emerald-800',
            )}
          >
            {status.summary}
          </p>
        </div>
      </div>

      {hasErrors && (
        <ul className="space-y-1 text-xs text-red-700">
          {status.errors.map((error) => (
            <li key={error}>• {error}</li>
          ))}
        </ul>
      )}

      {hasWarnings && (
        <ul className="space-y-1 text-xs text-amber-800">
          {status.warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      )}

      {status.chapters.length > 0 && status.objectivesCount > 0 && (
        <div className="space-y-2 pt-1 border-t border-black/5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            LO → chapter mapping
          </p>
          {status.chapters.map((chapter) => (
            <div key={chapter.chapterNumber} className="text-xs text-slate-700">
              <span className="font-semibold">Chapter {chapter.chapterNumber}:</span>{' '}
              {chapter.title}
              {chapter.mappedObjectives.length > 0 ? (
                <span className="text-slate-500"> — LO {chapter.mappedObjectives.join(', ')}</span>
              ) : (
                <span className="text-amber-700"> — no LOs mapped</span>
              )}
              {chapter.missingFields.length > 0 && (
                <span className="block text-amber-700">
                  Missing: {chapter.missingFields.join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {status.highlightedFields.length > 0 && (
        <p className="text-[11px] text-slate-500">
          {status.highlightedFields.length} field{status.highlightedFields.length !== 1 ? 's' : ''} flagged above.
        </p>
      )}
    </div>
  )
}
