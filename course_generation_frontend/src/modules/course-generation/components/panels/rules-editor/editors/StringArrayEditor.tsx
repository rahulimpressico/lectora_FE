import { useState, useCallback } from 'react'
import { Plus, X as XIcon } from 'lucide-react'
import { isStringArray } from '../helpers'
import type { JsonValue } from '../../../../../../types'

interface Props {
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
}

export const StringArrayEditor = ({ value, path, onUpdate }: Props) => {
  const arr = isStringArray(value) ? value : []
  const [draft, setDraft] = useState('')

  const add = useCallback(() => {
    const t = draft.trim()
    if (!t) return
    onUpdate(path, [...arr, t])
    setDraft('')
  }, [draft, arr, path, onUpdate])

  const remove = useCallback(
    (idx: number) => onUpdate(path, arr.filter((_, i) => i !== idx)),
    [arr, path, onUpdate],
  )

  const edit = useCallback(
    (idx: number, v: string) => {
      const next = [...arr]
      next[idx] = v
      onUpdate(path, next)
    },
    [arr, path, onUpdate],
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
                style={{ width: `${Math.max(36, item.length * 7 + 8)}px` }}
                className="min-w-0 max-w-[180px] bg-transparent text-xs text-slate-700 outline-none focus:text-slate-900"
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
          className="flex-1 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-50 transition-all"
        />
        <button
          type="button"
          onClick={add}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500 hover:bg-violet-100 transition-colors shrink-0"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}
