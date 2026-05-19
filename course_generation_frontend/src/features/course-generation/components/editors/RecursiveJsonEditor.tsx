import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { ChevronDown, Check, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'
import { InlineEditField } from './InlineEditField'
import {
  isJsonObject,
  isJsonArray,
  isPrimitive,
  formatKeyLabel,
} from '../../utils/deepUpdate'
import type { JsonObject, JsonValue, JsonPrimitive } from '../../types'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function pathKey(path: string[]) {
  return path.join('.')
}

function formatRawValue(v: JsonPrimitive): string {
  if (v === null) return ''
  return String(v)
}

function parseInput(raw: string, originalType: string): JsonPrimitive {
  if (originalType === 'number') {
    const n = Number(raw)
    return isNaN(n) ? raw : n
  }
  if (originalType === 'boolean') {
    if (raw.toLowerCase() === 'true') return true
    if (raw.toLowerCase() === 'false') return false
    return raw
  }
  return raw
}

// ── Prop types ─────────────────────────────────────────────────────────────────

interface NodeProps {
  keyName: string
  value: JsonValue
  originalValue: JsonValue
  path: string[]
  depth: number
  modifiedPaths: Set<string>
  onUpdate: (path: string[], value: JsonValue) => void
  onReset: (path: string[]) => void
}

// ── ArrayItemRow — numbered list row with inline editing ───────────────────────
interface ArrayItemRowProps {
  index: number
  value: JsonPrimitive
  originalValue: JsonPrimitive
  path: string[]
  isDirty: boolean
  onSave: (v: JsonPrimitive) => void
  onCancel: () => void
}

function ArrayItemRow({ index, value, originalValue, isDirty, onSave, onCancel }: ArrayItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(formatRawValue(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const commitSave = () => {
    onSave(parseInput(inputValue, typeof originalValue))
    setIsEditing(false)
  }

  const commitCancel = () => {
    setInputValue(formatRawValue(value))
    setIsEditing(false)
    onCancel()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  commitSave()
    if (e.key === 'Escape') commitCancel()
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4 py-2.5 transition-all duration-150',
        isDirty && !isEditing ? 'bg-amber-50/50' : '',
        isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60',
      )}
    >
      {isDirty && <div className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-amber-400" />}

      {/* Index badge */}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 mt-0.5">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
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
            {isDirty && (
              <p className="text-[11px] text-slate-400">
                Original: <span className="font-medium text-slate-500">{formatRawValue(originalValue)}</span>
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setInputValue(formatRawValue(value)); setIsEditing(true) }}
            className="flex w-full items-center gap-2 text-left"
          >
            <span className="flex-1 min-w-0 text-sm text-slate-700 leading-relaxed">{String(value)}</span>
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              {isDirty ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">edited</span>
              ) : (
                <Pencil size={11} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Object node — enterprise section card ──────────────────────────────────────
function ObjectNode({ keyName, value, originalValue, path, depth, modifiedPaths, onUpdate, onReset }: NodeProps) {
  const [open, setOpen] = useState(depth < 2)
  const obj = value as JsonObject
  const entries = Object.entries(obj)
  const childModified = entries.some(([k]) =>
    [...modifiedPaths].some((p) => p.startsWith(pathKey([...path, k]))),
  )

  const isTopLevel = depth === 0

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-150',
        isTopLevel
          ? 'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05)]'
          : 'rounded-lg border border-slate-200/60 bg-white',
      )}
    >
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex w-full items-center gap-2.5 text-left transition-colors duration-150',
          isTopLevel
            ? 'px-4 py-3 hover:bg-slate-50/70'
            : 'px-3 py-2.5 hover:bg-slate-50',
          open && 'border-b border-slate-100',
        )}
      >
        <ChevronDown
          size={isTopLevel ? 14 : 13}
          className={cn(
            'text-slate-400 transition-transform duration-200 shrink-0',
            !open && '-rotate-90',
          )}
        />
        <span
          className={cn(
            'flex-1 font-semibold truncate',
            isTopLevel ? 'text-sm text-slate-800' : 'text-xs text-slate-700',
          )}
        >
          {formatKeyLabel(keyName)}
        </span>

        {childModified && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200 shrink-0">
            <span className="h-1 w-1 rounded-full bg-amber-400 inline-block" />
            edited
          </span>
        )}

        <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
          {entries.length} {entries.length === 1 ? 'field' : 'fields'}
        </span>
      </button>

      {/* Section body */}
      {open && (
        <div className="divide-y divide-slate-100/80">
          {entries.map(([k, v]) =>
            isJsonObject(v) || isJsonArray(v) ? (
              /* Complex child — wrapped with padding */
              <div key={k} className="p-3 bg-slate-50/40">
                <JsonNode
                  keyName={k}
                  value={v}
                  originalValue={isJsonObject(originalValue) ? ((originalValue as JsonObject)[k] ?? v) : v}
                  path={[...path, k]}
                  depth={depth + 1}
                  modifiedPaths={modifiedPaths}
                  onUpdate={onUpdate}
                  onReset={onReset}
                />
              </div>
            ) : (
              /* Primitive child — horizontal field row */
              <JsonNode
                key={k}
                keyName={k}
                value={v}
                originalValue={isJsonObject(originalValue) ? ((originalValue as JsonObject)[k] ?? v) : v}
                path={[...path, k]}
                depth={depth + 1}
                modifiedPaths={modifiedPaths}
                onUpdate={onUpdate}
                onReset={onReset}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

// ── Array node — clean collapsible list ────────────────────────────────────────
function ArrayNode({ keyName, value, path, depth, modifiedPaths, onUpdate, onReset }: NodeProps) {
  const [open, setOpen] = useState(depth < 1)
  const arr = value as JsonValue[]
  const allPrimitive = arr.every(isPrimitive)
  const isTopLevel = depth === 0

  return (
    <div
      className={cn(
        'overflow-hidden',
        isTopLevel
          ? 'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05)]'
          : 'rounded-lg border border-slate-200/60 bg-white',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex w-full items-center gap-2.5 text-left transition-colors duration-150',
          isTopLevel ? 'px-4 py-3 hover:bg-slate-50/70' : 'px-3 py-2.5 hover:bg-slate-50',
          open && 'border-b border-slate-100',
        )}
      >
        <ChevronDown
          size={isTopLevel ? 14 : 13}
          className={cn(
            'text-slate-400 transition-transform duration-200 shrink-0',
            !open && '-rotate-90',
          )}
        />
        <span
          className={cn(
            'flex-1 font-semibold',
            isTopLevel ? 'text-sm text-slate-800' : 'text-xs text-slate-700',
          )}
        >
          {formatKeyLabel(keyName)}
        </span>
        <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
          {arr.length} {arr.length === 1 ? 'item' : 'items'}
        </span>
      </button>

      {/* Body */}
      {open && (
        allPrimitive ? (
          /* Primitive array — numbered list */
          <div className="divide-y divide-slate-100/80">
            {arr.map((item, idx) => (
              <ArrayItemRow
                key={idx}
                index={idx}
                value={item as JsonPrimitive}
                originalValue={item as JsonPrimitive}
                path={[...path, String(idx)]}
                isDirty={modifiedPaths.has(pathKey([...path, String(idx)]))}
                onSave={(v) => onUpdate([...path, String(idx)], v)}
                onCancel={() => onReset([...path, String(idx)])}
              />
            ))}
          </div>
        ) : (
          /* Object array — spaced sub-cards */
          <div className="p-3 space-y-2 bg-slate-50/30">
            {arr.map((item, idx) => (
              <JsonNode
                key={idx}
                keyName={String(idx)}
                value={item}
                originalValue={item}
                path={[...path, String(idx)]}
                depth={depth + 1}
                modifiedPaths={modifiedPaths}
                onUpdate={onUpdate}
                onReset={onReset}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Primitive node — delegates to InlineEditField ──────────────────────────────
function PrimitiveNode({ keyName, value, originalValue, path, modifiedPaths, onUpdate, onReset }: NodeProps) {
  const pk = pathKey(path)
  const isDirty = modifiedPaths.has(pk)

  return (
    <InlineEditField
      keyLabel={formatKeyLabel(keyName)}
      value={value as JsonPrimitive}
      originalValue={originalValue as JsonPrimitive}
      isDirty={isDirty}
      onSave={(newVal) => onUpdate(path, newVal)}
      onCancel={() => onReset(path)}
    />
  )
}

// ── Dispatcher ─────────────────────────────────────────────────────────────────
function JsonNode(props: NodeProps) {
  const { value } = props
  if (isJsonObject(value)) return <ObjectNode {...props} />
  if (isJsonArray(value))  return <ArrayNode  {...props} />
  if (isPrimitive(value))  return <PrimitiveNode {...props} />
  return null
}

// ── Public component ───────────────────────────────────────────────────────────
interface RecursiveJsonEditorProps {
  data: JsonObject
  originalData: JsonObject
  modifiedPaths: Set<string>
  onUpdate: (path: string[], value: JsonValue) => void
  onReset: (path: string[]) => void
}

export function RecursiveJsonEditor({
  data,
  originalData,
  modifiedPaths,
  onUpdate,
  onReset,
}: RecursiveJsonEditorProps) {
  const entries = Object.entries(data)
  const primitiveEntries = entries.filter(([, v]) => isPrimitive(v))
  const complexEntries   = entries.filter(([, v]) => !isPrimitive(v))

  return (
    <div className="space-y-3">

      {/* ── Overview card: all root-level primitive fields ─────────── */}
      {primitiveEntries.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_1px_4px_0_rgb(0,0,0,0.05)]">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Overview</span>
            <span className="text-[11px] text-slate-400">
              {primitiveEntries.length} {primitiveEntries.length === 1 ? 'field' : 'fields'}
            </span>
          </div>
          <div className="divide-y divide-slate-100/80">
            {primitiveEntries.map(([key, value]) => (
              <JsonNode
                key={key}
                keyName={key}
                value={value}
                originalValue={originalData[key] ?? value}
                path={[key]}
                depth={0}
                modifiedPaths={modifiedPaths}
                onUpdate={onUpdate}
                onReset={onReset}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Complex sections: objects + arrays ─────────────────────── */}
      {complexEntries.map(([key, value]) => (
        <JsonNode
          key={key}
          keyName={key}
          value={value}
          originalValue={originalData[key] ?? value}
          path={[key]}
          depth={0}
          modifiedPaths={modifiedPaths}
          onUpdate={onUpdate}
          onReset={onReset}
        />
      ))}
    </div>
  )
}
