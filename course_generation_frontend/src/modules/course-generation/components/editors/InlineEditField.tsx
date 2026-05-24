import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react'
import { Check, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'
import { parseInput } from '../../utils/parseInput'
import type { JsonPrimitive } from '../../types'

interface InlineEditFieldProps {
  value: JsonPrimitive
  originalValue: JsonPrimitive
  onSave: (value: JsonPrimitive) => void
  onCancel: () => void
  isDirty?: boolean
  keyLabel: string
}

function formatDisplayValue(v: JsonPrimitive): string {
  if (v === null) return ''
  return String(v)
}

function ValueChip({ value }: { value: JsonPrimitive }) {
  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
          value
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
        )}
      >
        {value ? 'Yes' : 'No'}
      </span>
    )
  }
  if (typeof value === 'number') {
    return (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 tabular-nums">
        {value}
      </span>
    )
  }
  if (value === null) {
    return <span className="text-xs italic text-slate-400">Not set</span>
  }
  const str = String(value)
  if (str.length > 100) {
    return <span className="text-sm text-slate-700 leading-relaxed line-clamp-2">{str}</span>
  }
  return <span className="text-sm text-slate-700">{str}</span>
}

export function InlineEditField({
  value,
  originalValue,
  onSave,
  onCancel,
  isDirty = false,
  keyLabel,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(formatDisplayValue(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && typeof originalValue !== 'boolean') {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing, originalValue])

  const startEdit = () => {
    setInputValue(formatDisplayValue(value))
    setIsEditing(true)
  }

  const commitSave = () => {
    const parsed = parseInput(inputValue, typeof originalValue)
    onSave(parsed)
    setIsEditing(false)
  }

  const commitCancel = () => {
    setIsEditing(false)
    setInputValue(formatDisplayValue(value))
    onCancel()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  commitSave()
    if (e.key === 'Escape') commitCancel()
  }

  const isBool = typeof originalValue === 'boolean'

  return (
    <div
      className={cn(
        'group relative grid grid-cols-[42%_1fr] items-start gap-3 px-4 py-2.5 transition-all duration-150',
        isDirty && !isEditing ? 'bg-amber-50/50' : '',
        isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60',
      )}
    >
      {/* Dirty left border */}
      {isDirty && (
        <div className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-amber-400" />
      )}

      {/* Label column */}
      <div className="flex items-center min-h-[28px] pt-0.5">
        <span
          className={cn(
            'text-[13px] font-medium leading-snug',
            isDirty ? 'text-amber-700' : 'text-slate-500',
          )}
        >
          {keyLabel}
        </span>
      </div>

      {/* Value column */}
      <div className="min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            {isBool ? (
              /* Boolean — show Yes/No toggle instead of text input */
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { onSave(true); setIsEditing(false) }}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                    value === true
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => { onSave(false); setIsEditing(false) }}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                    value === false
                      ? 'bg-slate-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={commitCancel}
                  className="ml-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* Text / number input */
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type={typeof value === 'number' ? 'number' : 'text'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-sm text-slate-800 shadow-sm outline-none ring-2 ring-indigo-100 focus:ring-indigo-300 transition-shadow"
                />
                <button
                  type="button"
                  onClick={commitSave}
                  title="Save (Enter)"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-colors"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={commitCancel}
                  title="Cancel (Escape)"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Original value hint */}
            {isDirty && (
              <p className="text-[11px] text-slate-400">
                Original:{' '}
                <span className="font-medium text-slate-500">
                  {formatDisplayValue(originalValue)}
                </span>
              </p>
            )}
          </div>
        ) : (
          /* View mode */
          <button
            type="button"
            onClick={startEdit}
            title="Click to edit"
            className="flex w-full items-center gap-2 text-left min-h-[28px]"
          >
            <div className="flex-1 min-w-0">
              <ValueChip value={value} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              {isDirty ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  edited
                </span>
              ) : (
                <Pencil
                  size={11}
                  className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
