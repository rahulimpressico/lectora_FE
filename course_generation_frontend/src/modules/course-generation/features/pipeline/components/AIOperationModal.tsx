import { useEffect, useRef, useState } from 'react'
import { X, Sparkles, PenLine, SmilePlus, Check, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/cn'
import type { BodyParagraph } from '../../../types/editor'
import { RichContentRenderer } from './RichContentRenderer'

interface AIOperationModalProps {
  operation: 'rewrite' | 'improve_tone'
  sectionTitle: string
  currentContent: string
  currentParagraphs?: BodyParagraph[]
  isProcessing: boolean
  result: string | null
  resultParagraphs?: BodyParagraph[]
  /** When set, the modal shows a batch-scope note and the confirm button says "Apply to All N Subtopics". */
  batchCount?: number
  onConfirm: (userPrompt: string) => void
  onApply: () => void
  onDiscard: () => void
  onClose: () => void
}

const CONFIG: Record<'rewrite' | 'improve_tone', {
  title: string
  subtitle: string
  promptLabel: string
  placeholder: string
  Icon: React.ElementType
  confirmLabel: string
  processingLabel: string
}> = {
  rewrite: {
    title: 'Rewrite by AI',
    subtitle: 'Describe what to change — AI will edit only those parts and keep everything else unchanged',
    promptLabel: 'Edit Instructions',
    placeholder: 'e.g., Make the second paragraph more concise, or simplify the bullet list under "Key Terms"…',
    Icon: PenLine,
    confirmLabel: 'Apply Edits',
    processingLabel: 'Applying edits…',
  },
  improve_tone: {
    title: 'Improve Tone',
    subtitle: 'Describe the tone you want — only affected passages will be updated',
    promptLabel: 'Desired Tone / Style',
    placeholder: 'e.g., Make the introduction more conversational; keep technical terms in the rest…',
    Icon: SmilePlus,
    confirmLabel: 'Apply Tone Edits',
    processingLabel: 'Applying tone edits…',
  },
}

function ContentPreview({
  content,
  paragraphs,
  className,
}: {
  content: string
  paragraphs?: BodyParagraph[]
  className?: string
}) {
  if (paragraphs && paragraphs.length > 0) {
    return (
      <RichContentRenderer
        paragraphs={paragraphs}
        fallbackText={content}
        className={className}
      />
    )
  }
  return (
    <div className={cn('prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export function AIOperationModal({
  operation,
  sectionTitle,
  currentContent,
  currentParagraphs,
  isProcessing,
  result,
  resultParagraphs,
  batchCount,
  onConfirm,
  onApply,
  onDiscard,
  onClose,
}: AIOperationModalProps) {
  const cfg = CONFIG[operation]
  const { Icon } = cfg
  const isBatchMode = (batchCount ?? 0) > 0
  const [prompt, setPrompt] = useState('')
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    promptRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const hasResult =
    (result !== null && result.trim().length > 0) ||
    (resultParagraphs !== undefined && resultParagraphs.length > 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overlay-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden scale-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
            <Icon size={18} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">{cfg.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBatchMode
                ? `Will be applied individually to all ${batchCount} subtopics in this section`
                : cfg.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Section being edited */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Section
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">{sectionTitle}</p>
              <div className="text-xs text-slate-500 leading-relaxed max-h-32 overflow-y-auto pr-1">
                <ContentPreview
                  content={currentContent}
                  paragraphs={currentParagraphs}
                />
              </div>
            </div>
          </div>

          {/* Prompt input */}
          {!hasResult && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                {cfg.promptLabel}
              </label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isProcessing}
                rows={3}
                placeholder={cfg.placeholder}
                className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>
          )}

          {/* Result preview */}
          {hasResult && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-brand-500" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-500">
                  AI Result — Preview
                </p>
              </div>
              <div className="rounded-lg border border-brand-200 bg-brand-50/40 px-4 py-3 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                <ContentPreview
                  content={result ?? ''}
                  paragraphs={resultParagraphs}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            'flex items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0',
            hasResult ? 'justify-between' : 'justify-end',
          )}
        >
          {hasResult ? (
            <>
              <button
                type="button"
                onClick={onDiscard}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <RotateCcw size={12} />
                Try Again
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={onApply}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <Check size={12} />
                  Apply Changes
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(prompt)}
                disabled={isProcessing}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg transition-all',
                  isProcessing
                    ? 'bg-brand-400 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-700',
                )}
              >
                {isProcessing ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {cfg.processingLabel}
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    {isBatchMode ? `Apply to All ${batchCount} Subtopics` : cfg.confirmLabel}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
