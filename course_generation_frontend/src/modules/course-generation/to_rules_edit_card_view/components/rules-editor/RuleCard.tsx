import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CardBody } from './CardBody'
import type { CardDef, AccentKey } from './constants'
import type { JsonValue } from '../../../../../types'

type JsonObject = Record<string, JsonValue>

interface RuleCardProps {
  def: CardDef
  sectionKey: string
  sectionData: JsonObject
  modifiedPaths: Set<string>
  onUpdate: (path: string[], value: JsonValue) => void
  onReset: (path: string[]) => void
}

const ACCENT_STYLES: Record<AccentKey, { header: string; badge: string; icon: string }> = {
  violet:  { header: 'from-violet-50 to-slate-50  border-violet-100',  badge: 'bg-violet-100 text-violet-700',   icon: 'text-violet-500'  },
  indigo:  { header: 'from-indigo-50 to-slate-50  border-indigo-100',  badge: 'bg-indigo-100 text-indigo-700',   icon: 'text-indigo-500'  },
  sky:     { header: 'from-sky-50    to-slate-50  border-sky-100',     badge: 'bg-sky-100    text-sky-700',      icon: 'text-sky-500'     },
  emerald: { header: 'from-emerald-50 to-slate-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' },
  amber:   { header: 'from-amber-50  to-slate-50  border-amber-100',   badge: 'bg-amber-100  text-amber-700',    icon: 'text-amber-500'   },
  rose:    { header: 'from-rose-50   to-slate-50  border-rose-100',    badge: 'bg-rose-100   text-rose-700',     icon: 'text-rose-500'    },
  orange:  { header: 'from-orange-50 to-slate-50  border-orange-100',  badge: 'bg-orange-100 text-orange-700',   icon: 'text-orange-500'  },
  slate:   { header: 'from-slate-100 to-slate-50  border-slate-100',   badge: 'bg-slate-100  text-slate-700',    icon: 'text-slate-500'   },
}

export const RuleCard = ({ def, sectionKey, sectionData, modifiedPaths, onUpdate, onReset }: RuleCardProps) => {
  const [open, setOpen] = useState(true)
  const styles = ACCENT_STYLES[def.accent]

  const editedCount = Object.keys(sectionData).filter(k =>
    modifiedPaths.has([sectionKey, k].join('.'))
  ).length

  const Icon = def.Icon

  return (
    <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${styles.header} border-b transition-colors hover:brightness-[0.98]`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 ${styles.icon}`}>
          <Icon size={16} />
        </span>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{def.label}</span>
            {editedCount > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}>
                {editedCount} edited
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{def.description}</p>
        </div>
        <span className="text-slate-400 shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {open && (
        <div className="p-4 bg-slate-50/50">
          {Object.keys(sectionData).length > 0 ? (
            <CardBody
              data={sectionData}
              basePath={[sectionKey]}
              modifiedPaths={modifiedPaths}
              onUpdate={onUpdate}
              onReset={onReset}
            />
          ) : (
            <p className="text-[12px] text-slate-400 italic text-center py-4">No fields available.</p>
          )}
        </div>
      )}
    </div>
  )
}
