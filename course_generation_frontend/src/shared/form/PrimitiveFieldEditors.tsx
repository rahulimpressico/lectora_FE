import { useState, useCallback } from 'react'
import { Plus, X as XIcon } from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import type { JsonValue } from '@/modules/course-generation/types'

const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all'

export const isStringArray = (v: JsonValue): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

export const isNumberPair = (v: JsonValue): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number')

export interface PrimitiveEditorProps {
  value: JsonValue
  path: string[]
  onChange: (path: string[], value: JsonValue) => void
}

export function BooleanEditor({ value, path, onChange }: PrimitiveEditorProps) {
  const on = value === true
  return (
    <div className="flex items-center gap-3 py-0.5">
      <Switch.Root
        checked={on}
        onCheckedChange={(checked) => onChange(path, checked)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-slate-200"
      >
        <Switch.Thumb className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
      </Switch.Root>
      <span className={`text-xs font-semibold ${on ? 'text-violet-600' : 'text-slate-400'}`}>
        {on ? 'Yes' : 'No'}
      </span>
    </div>
  )
}

export function StringEditor({ value, path, onChange }: PrimitiveEditorProps) {
  const str = typeof value === 'string' ? value : ''
  const isLong = str.length > 70 || str.includes('\n')
  if (isLong) {
    return (
      <textarea
        rows={3}
        value={str}
        onChange={(e) => onChange(path, e.target.value)}
        className={`${INPUT_CLS} resize-none`}
      />
    )
  }
  return (
    <input
      type="text"
      value={str}
      onChange={(e) => onChange(path, e.target.value)}
      className={INPUT_CLS}
    />
  )
}

export function NumberEditor({ value, path, onChange }: PrimitiveEditorProps) {
  return (
    <input
      type="number"
      value={typeof value === 'number' ? value : 0}
      onChange={(e) => onChange(path, Number(e.target.value))}
      className={INPUT_CLS}
    />
  )
}

export function NumberPairEditor({ value, path, onChange }: PrimitiveEditorProps) {
  const pair = isNumberPair(value) ? value : ([0, 0] as [number, number])
  const pairCls =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Min</p>
        <input
          type="number"
          value={pair[0]}
          onChange={(e) => onChange(path, [Number(e.target.value), pair[1]])}
          className={pairCls}
        />
      </div>
      <span className="text-slate-400 text-sm font-semibold pt-6">–</span>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Max</p>
        <input
          type="number"
          value={pair[1]}
          onChange={(e) => onChange(path, [pair[0], Number(e.target.value)])}
          className={pairCls}
        />
      </div>
    </div>
  )
}

export function StringArrayEditor({ value, path, onChange }: PrimitiveEditorProps) {
  const arr = isStringArray(value) ? value : []
  const [draft, setDraft] = useState('')

  const add = useCallback(() => {
    const t = draft.trim()
    if (!t) return
    onChange(path, [...arr, t])
    setDraft('')
  }, [draft, arr, path, onChange])

  const remove = useCallback(
    (idx: number) => onChange(path, arr.filter((_, i) => i !== idx)),
    [arr, path, onChange],
  )

  const edit = useCallback(
    (idx: number, v: string) => {
      const next = [...arr]
      next[idx] = v
      onChange(path, next)
    },
    [arr, path, onChange],
  )

  return (
    <div className="space-y-2">
      {arr.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {arr.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-1 py-1"
            >
              <input
                type="text"
                value={item}
                onChange={(e) => edit(idx, e.target.value)}
                style={{ width: `${Math.max(40, item.length * 7 + 8)}px` }}
                className="min-w-0 max-w-[200px] bg-transparent text-xs text-slate-700 outline-none focus:text-slate-900"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="flex h-4 w-4 items-center justify-center rounded text-slate-300 hover:text-red-400 transition-colors shrink-0"
              >
                <XIcon size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add item…"
          className="flex-1 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-50 transition-all"
        />
        <button
          type="button"
          onClick={add}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-500 hover:bg-violet-100 transition-colors shrink-0"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}
