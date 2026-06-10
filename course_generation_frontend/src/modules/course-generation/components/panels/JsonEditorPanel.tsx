import type React from 'react'
import { RotateCcw } from 'lucide-react'
import { Spinner } from '@/shared/components/Spinner'
import { RecursiveJsonEditor } from '../editors/RecursiveJsonEditor'
import type { JsonObject, JsonValue } from '../../types'

interface JsonEditorPanelProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  iconBgClass: string
  data: JsonObject | null
  originalData: JsonObject | null
  modifiedPaths: Set<string>
  onUpdate: (path: string[], value: JsonValue) => void
  onReset: (path: string[]) => void
  onResetAll: () => void
  loading?: boolean
  loadError?: string | null
  emptyMessage?: string
  tooltips?: Record<string, string>
}

export function JsonEditorPanel({
  title,
  subtitle,
  icon,
  iconBgClass,
  data,
  originalData,
  modifiedPaths,
  onUpdate,
  onReset,
  onResetAll,
  loading = false,
  loadError = null,
  emptyMessage = 'No data available yet.',
  tooltips,
}: JsonEditorPanelProps) {
  const dirtyCount = modifiedPaths.size

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f4f6f9]">

      {/* Panel header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-5 py-3.5 shrink-0 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">{title}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          {dirtyCount > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                {dirtyCount} unsaved
              </span>
              <button
                type="button"
                onClick={onResetAll}
                title="Reset all changes"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm"
              >
                <RotateCcw size={11} />
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        ) : !data ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          </div>
        ) : (
          <RecursiveJsonEditor
            data={data}
            originalData={originalData ?? data}
            modifiedPaths={modifiedPaths}
            onUpdate={onUpdate}
            onReset={onReset}
            tooltips={tooltips}
          />
        )}
      </div>
    </div>
  )
}
