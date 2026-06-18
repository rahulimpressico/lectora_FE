import { RotateCcw } from 'lucide-react'
import { formatKeyLabel } from '../../../utils/deepUpdate'
import { getTooltip, isStringArray, isNumberPair } from './helpers'
import { StringEditor } from './editors/StringEditor'
import { NumberEditor } from './editors/NumberEditor'
import { BooleanEditor } from './editors/BooleanEditor'
import { StringArrayEditor } from './editors/StringArrayEditor'
import { NumberPairEditor } from './editors/NumberPairEditor'
import { JsonFallbackEditor } from './editors/JsonFallbackEditor'
import type { JsonValue } from '../../../../../types'

interface FieldRowProps {
  fieldKey: string
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
  modified: boolean
  onReset: (path: string[]) => void
}

const resolveEditor = (value: JsonValue, path: string[], onUpdate: (p: string[], v: JsonValue) => void) => {
  if (value === null || value === undefined) return <StringEditor value="" path={path} onUpdate={onUpdate} />
  if (typeof value === 'string')  return <StringEditor  value={value} path={path} onUpdate={onUpdate} />
  if (typeof value === 'number')  return <NumberEditor  value={value} path={path} onUpdate={onUpdate} />
  if (typeof value === 'boolean') return <BooleanEditor value={value} path={path} onUpdate={onUpdate} />
  if (isNumberPair(value))   return <NumberPairEditor   value={value} path={path} onUpdate={onUpdate} />
  if (isStringArray(value))  return <StringArrayEditor  value={value} path={path} onUpdate={onUpdate} />
  return <JsonFallbackEditor value={value} path={path} onUpdate={onUpdate} />
}

export const FieldRow = ({ fieldKey, value, path, onUpdate, modified, onReset }: FieldRowProps) => {
  const label   = formatKeyLabel(fieldKey)
  const tooltip = getTooltip(fieldKey)

  return (
    <div
      className={[
        'rounded-xl p-3.5 transition-colors',
        modified
          ? 'bg-amber-50/50 ring-1 ring-amber-100'
          : 'bg-white border border-slate-100',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {modified && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
            <span className="text-[12px] font-bold text-slate-700 leading-snug">{label}</span>
          </div>
          {tooltip && (
            <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">{tooltip}</p>
          )}
        </div>
        {modified && (
          <button
            type="button"
            onClick={() => onReset(path)}
            title="Reset to original"
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 hover:bg-amber-100 transition-colors"
          >
            <RotateCcw size={9} />
            Reset
          </button>
        )}
      </div>
      {resolveEditor(value, path, onUpdate)}
    </div>
  )
}
