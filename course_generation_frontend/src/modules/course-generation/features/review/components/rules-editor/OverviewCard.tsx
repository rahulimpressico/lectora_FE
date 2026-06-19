import { useState } from 'react'
import { ChevronDown, ChevronRight, LayoutDashboard } from 'lucide-react'
import { FieldRow } from './FieldRow'
import type { JsonValue } from '../../../../types'

type JsonObject = Record<string, JsonValue>

interface OverviewCardProps {
  primitiveFields: [string, JsonValue][]
  modifiedPaths: Set<string>
  onUpdate: (path: string[], value: JsonValue) => void
  onReset: (path: string[]) => void
}

export const OverviewCard = ({ primitiveFields, modifiedPaths, onUpdate, onReset }: OverviewCardProps) => {
  const [open, setOpen] = useState(true)

  if (primitiveFields.length === 0) return null

  const editedCount = primitiveFields.filter(([k]) => modifiedPaths.has(k)).length

  return (
    <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-50 to-slate-50 border-b border-violet-100 transition-colors hover:brightness-[0.98]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-violet-500">
          <LayoutDashboard size={16} />
        </span>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">Overview</span>
            {editedCount > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700">
                {editedCount} edited
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Top-level course settings and configuration values.
          </p>
        </div>
        <span className="text-slate-400 shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {open && (
        <div className="p-4 bg-slate-50/50 space-y-2.5">
          {primitiveFields.map(([key, value]) => (
            <FieldRow
              key={key}
              fieldKey={key}
              value={value}
              path={[key]}
              modified={modifiedPaths.has(key)}
              onUpdate={onUpdate}
              onReset={onReset}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export type { JsonObject }
