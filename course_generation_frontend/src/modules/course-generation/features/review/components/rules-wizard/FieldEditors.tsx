import { formatKeyLabel } from '../../../../utils/deepUpdate'
import {
  BooleanEditor,
  NumberEditor,
  NumberPairEditor,
  StringArrayEditor,
  StringEditor,
  isNumberPair,
  isStringArray,
} from '@/shared/form/PrimitiveFieldEditors'
import type { JsonObject, JsonValue } from '../../../../types'

export { isNumberPair, isStringArray }

// ── Composite field editor (picks the right editor by type) ───────────────────

export interface FieldEditorProps {
  value: JsonValue
  path: string[]
  onChange: (path: string[], value: JsonValue) => void
}

export function FieldEditor({ value, path, onChange }: FieldEditorProps) {
  if (typeof value === 'boolean')  return <BooleanEditor    value={value} path={path} onChange={onChange} />
  if (isNumberPair(value))         return <NumberPairEditor  value={value} path={path} onChange={onChange} />
  if (isStringArray(value))        return <StringArrayEditor value={value} path={path} onChange={onChange} />
  if (typeof value === 'number')   return <NumberEditor      value={value} path={path} onChange={onChange} />
  if (typeof value === 'string')   return <StringEditor      value={value} path={path} onChange={onChange} />
  return <p className="text-xs text-slate-400 italic">Complex value — not editable here.</p>
}

// ── Field row (label + editor, handles nested objects recursively) ─────────────

interface FieldRowProps {
  fieldKey: string
  value: JsonValue
  path: string[]
  onChange: (path: string[], value: JsonValue) => void
}

export function FieldRow({ fieldKey, value, path, onChange }: FieldRowProps) {
  const label = formatKeyLabel(fieldKey)

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value as JsonObject)
    return (
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{label}</p>
        </div>
        <div className="p-3.5 space-y-3">
          {entries.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Empty.</p>
          ) : (
            entries.map(([subKey, subVal]) => (
              <FieldRow
                key={subKey}
                fieldKey={subKey}
                value={subVal}
                path={[...path, subKey]}
                onChange={onChange}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <label className="block text-[12px] font-bold text-slate-700 mb-2">{label}</label>
      <FieldEditor value={value} path={path} onChange={onChange} />
    </div>
  )
}
