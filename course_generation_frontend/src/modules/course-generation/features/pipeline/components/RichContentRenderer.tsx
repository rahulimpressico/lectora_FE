import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'
import type { BodyParagraph } from '../../../types/editor'

// ── Inline parser: **bold**, *italic* ────────────────────────────────────────
function parseInline(text: string): ReactNode {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return <strong key={i} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return <em key={i}>{token.slice(1, -1)}</em>
    }
    return token
  })
}

// ── Extract letter prefix from option text e.g. "A) Some text" → ['A', 'Some text'] ──
function parseOption(opt: string): { letter: string; text: string } {
  const m = opt.match(/^([A-D])\)\s*(.*)$/s)
  if (m) return { letter: m[1], text: m[2] }
  return { letter: '', text: opt }
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE CHECK BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function KnowledgeCheckBlock({
  question,
  options,
  correct_answer,
  explanation,
}: {
  question?: string
  options?: string[]
  correct_answer?: string | number
  explanation?: string
}) {
  const [revealed, setRevealed] = useState(false)
  if (!question) return null

  // Normalise correct_answer to a letter string
  const correctLetter: string =
    typeof correct_answer === 'number'
      ? String.fromCharCode(65 + correct_answer)
      : String(correct_answer ?? '').toUpperCase().trim()

  const parsedOptions = (options ?? []).map(parseOption)

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-200 shadow-sm shadow-indigo-100/60 my-1">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
          <HelpCircle size={14} className="text-white" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-indigo-100">
            Knowledge Check
          </p>
          <p className="text-[10px] text-indigo-200/80">Test your understanding</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pt-4 pb-4 bg-white">
        {/* Question */}
        <p className="text-[13.5px] font-medium text-slate-800 leading-[1.78] mb-4">
          {parseInline(question)}
        </p>

        {/* Options */}
        {parsedOptions.length > 0 && (
          <div className="space-y-2 mb-4">
            {parsedOptions.map(({ letter, text }, i) => {
              const isCorrect = letter === correctLetter
              const showResult = revealed && letter !== ''

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-xl px-3.5 py-3 border transition-all duration-300',
                    showResult && isCorrect
                      ? 'bg-emerald-50 border-emerald-300'
                      : showResult && !isCorrect
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-slate-50 border-slate-200',
                  )}
                >
                  {/* Letter badge */}
                  <span
                    className={cn(
                      'shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors duration-300',
                      showResult && isCorrect
                        ? 'bg-emerald-500 text-white'
                        : showResult && !isCorrect
                          ? 'bg-slate-300 text-slate-500'
                          : 'bg-white border border-slate-300 text-slate-600',
                    )}
                  >
                    {letter || String.fromCharCode(65 + i)}
                  </span>

                  {/* Option text */}
                  <span
                    className={cn(
                      'text-[13px] leading-relaxed transition-colors duration-300',
                      showResult && isCorrect
                        ? 'text-emerald-800 font-medium'
                        : 'text-slate-700',
                    )}
                  >
                    {parseInline(text)}
                  </span>

                  {/* Correct indicator */}
                  {showResult && isCorrect && (
                    <CheckCircle2
                      size={15}
                      className="shrink-0 ml-auto mt-0.5 text-emerald-500"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200',
            revealed
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200',
          )}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          {revealed ? 'Hide Answer' : 'Show Answer'}
        </button>

        {/* Explanation — slides in when revealed */}
        {revealed && explanation && (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={11} />
              Explanation
            </p>
            <p className="text-[12.5px] text-emerald-900 leading-relaxed">
              {parseInline(explanation)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CALLOUT BLOCK — themed per label
// ─────────────────────────────────────────────────────────────────────────────
type CalloutVariant = {
  bg: string
  border: string
  iconBg: string
  labelColor: string
  textColor: string
  Icon: typeof AlertCircle
}

const CALLOUT_VARIANTS: Record<string, CalloutVariant> = {
  Important: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    iconBg: 'bg-amber-100',
    labelColor: 'text-amber-700',
    textColor: 'text-amber-900',
    Icon: AlertCircle,
  },
  Warning: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    iconBg: 'bg-red-100',
    labelColor: 'text-red-700',
    textColor: 'text-red-900',
    Icon: AlertTriangle,
  },
  'Pro Tip': {
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    iconBg: 'bg-violet-100',
    labelColor: 'text-violet-700',
    textColor: 'text-violet-900',
    Icon: Lightbulb,
  },
  'Best Practice': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    iconBg: 'bg-emerald-100',
    labelColor: 'text-emerald-700',
    textColor: 'text-emerald-900',
    Icon: CheckCircle2,
  },
  'Common Mistake': {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    iconBg: 'bg-rose-100',
    labelColor: 'text-rose-700',
    textColor: 'text-rose-900',
    Icon: XCircle,
  },
  Note: {
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    iconBg: 'bg-sky-100',
    labelColor: 'text-sky-700',
    textColor: 'text-sky-900',
    Icon: Info,
  },
}
const DEFAULT_CALLOUT: CalloutVariant = {
  bg: 'bg-slate-50',
  border: 'border-slate-300',
  iconBg: 'bg-slate-100',
  labelColor: 'text-slate-600',
  textColor: 'text-slate-800',
  Icon: Info,
}

function CalloutBlock({ label, content }: { label?: string; content: string }) {
  const key = label ?? 'Important'
  const variant = CALLOUT_VARIANTS[key] ?? DEFAULT_CALLOUT
  const { bg, border, iconBg, labelColor, textColor, Icon } = variant
  const displayLabel = label ?? 'Important'

  return (
    <div className={cn('flex gap-3.5 rounded-xl border px-4 py-3.5 my-0.5', bg, border)}>
      {/* Icon */}
      <div className={cn('shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5', iconBg)}>
        <Icon size={14} className={labelColor} />
      </div>
      {/* Content */}
      <div className="min-w-0">
        <p className={cn('text-[11px] font-bold uppercase tracking-[0.09em] mb-1', labelColor)}>
          {displayLabel}
        </p>
        <p className={cn('text-[13px] leading-[1.78]', textColor)}>
          {parseInline(content)}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD BLOCK RENDERERS
// ─────────────────────────────────────────────────────────────────────────────
function TextBlock({ content }: { content: string }) {
  return (
    <p className="text-[13.5px] text-slate-700 leading-[1.82] tracking-[0.008em]">
      {parseInline(content)}
    </p>
  )
}

function HeadingBlock({ content, level }: { content: string; level: 3 | 4 }) {
  const cls =
    level === 3
      ? 'text-[13.5px] font-semibold text-slate-800 pt-1'
      : 'text-[13px] font-semibold text-slate-700 pt-0.5'
  return <p className={cls}>{parseInline(content)}</p>
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="shrink-0 mt-[8px] w-1.5 h-1.5 rounded-full bg-brand-400" />
          <span className="text-[13.5px] text-slate-700 leading-[1.82]">{parseInline(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold mt-0.5 select-none">
            {i + 1}
          </span>
          <span className="text-[13.5px] text-slate-700 leading-[1.82]">{parseInline(item)}</span>
        </li>
      ))}
    </ol>
  )
}

function SubBulletList({ items }: { items: string[] }) {
  return (
    <ul className="ml-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="shrink-0 mt-[9px] w-1 h-1 rounded-full bg-slate-400" />
          <span className="text-[13px] text-slate-600 leading-[1.82]">{parseInline(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function TableBlock({
  headers,
  rows,
  caption,
}: {
  headers?: string[]
  rows?: string[][]
  caption?: string
}) {
  if (!headers?.length && !rows?.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      {caption && (
        <p className="text-[11px] text-slate-500 font-medium px-4 pt-3 pb-1 border-b border-slate-100">
          {caption}
        </p>
      )}
      <table className="w-full text-[12.5px] text-slate-700 border-collapse">
        {headers && headers.length > 0 && (
          <thead>
            <tr className="bg-slate-50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        {rows && rows.length > 0 && (
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className={cn('px-4 py-2.5 leading-relaxed', ci === 0 && 'font-medium text-slate-800')}>
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}

// ── Plain-text fallback (for edited/dirty content) ───────────────────────────
function PlainTextRenderer({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) =>
        line.trim() ? (
          <p key={i} className="text-[13.5px] text-slate-700 leading-[1.82] tracking-[0.008em]">
            {parseInline(line)}
          </p>
        ) : (
          <br key={i} />
        ),
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface RichContentRendererProps {
  paragraphs?: BodyParagraph[]
  fallbackText?: string
  className?: string
}

export function RichContentRenderer({
  paragraphs,
  fallbackText,
  className,
}: RichContentRendererProps) {
  if (!paragraphs || paragraphs.length === 0) {
    if (!fallbackText) return null
    return (
      <div className={cn('space-y-2.5', className)}>
        <PlainTextRenderer text={fallbackText} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {paragraphs.map((para, i) => {
        const { type } = para
        if (type === 'text') {
          return <TextBlock key={i} content={para.content ?? ''} />
        }
        if (type === 'heading_3') {
          return <HeadingBlock key={i} content={para.content ?? ''} level={3} />
        }
        if (type === 'heading_4') {
          return <HeadingBlock key={i} content={para.content ?? ''} level={4} />
        }
        if (type === 'bullet_list') {
          return <BulletList key={i} items={para.items ?? []} />
        }
        if (type === 'numbered_list') {
          return <NumberedList key={i} items={para.items ?? []} />
        }
        if (type === 'sub_bullet_list') {
          return <SubBulletList key={i} items={para.items ?? []} />
        }
        if (type === 'important_callout' || type === 'callout') {
          return <CalloutBlock key={i} label={para.label} content={para.content ?? ''} />
        }
        if (type === 'knowledge_check') {
          return (
            <KnowledgeCheckBlock
              key={i}
              question={para.question}
              options={para.options}
              correct_answer={para.correct_answer}
              explanation={para.explanation}
            />
          )
        }
        if (type === 'table') {
          return (
            <TableBlock key={i} headers={para.headers} rows={para.rows} caption={para.caption} />
          )
        }
        if (para.content) {
          return <TextBlock key={i} content={para.content} />
        }
        return null
      })}
    </div>
  )
}

// Re-export for use in section summary/preview contexts
export { KnowledgeCheckBlock, CalloutBlock }
