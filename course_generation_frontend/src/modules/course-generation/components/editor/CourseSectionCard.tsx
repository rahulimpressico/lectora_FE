import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  CheckSquare,
  Clock,
  Hash,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '../../store/editorStore'
import { useAIOperation } from '../../hooks/useAIOperation'
import { performAIOperation, saveSectionContent } from '@/api/editor/api'
import { AIToolbar } from './AIToolbar'
import { AIOperationModal } from './AIOperationModal'
import type { AIOperationType, CourseSection } from '../../types/editor'

interface CourseSectionCardProps {
  section: CourseSection
  jobId: string
  depth: number
}

export function CourseSectionCard({
  section,
  jobId,
  depth,
}: CourseSectionCardProps) {
  const {
    sectionEditStates,
    expandedSectionIds,
    activeSectionId,
    toggleSection,
    expandSection,
    setActiveSectionId,
    startEditing,
    updateEditContent,
    saveSection,
    cancelEditing,
    updateSectionTitle,
    setAIProcessing,
    clearAIOperation,
  } = useEditorStore()

  const editState = sectionEditStates.get(section.id)
  const isExpanded = expandedSectionIds.has(section.id)
  const isActive = activeSectionId === section.id
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { triggerOperation, error: aiOperationError } = useAIOperation(jobId)

  const [isSavingToBackend, setIsSavingToBackend] = useState(false)
  const [modalOp, setModalOp] = useState<'rewrite' | 'improve_tone' | null>(null)
  const [modalResult, setModalResult] = useState<string | null>(null)
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(section.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [undoContent, setUndoContent] = useState<string | null>(null)
  const [showUndoBanner, setShowUndoBanner] = useState(false)
  const [prevWordCount, setPrevWordCount] = useState<number | null>(null)
  const wasProcessingRef = useRef(false)
  // True while a modal operation is in-flight or showing a result.
  // Prevents the generic "Content updated" banner from firing before the user
  // has explicitly chosen to apply or discard the modal result.
  const isModalOpRef = useRef(false)

  // Separate mutation for modal ops — does NOT auto-apply to the editor on success
  const modalMutation = useMutation({
    mutationFn: ({ op, userPrompt }: { op: AIOperationType; userPrompt: string }) => {
      isModalOpRef.current = true
      setAIProcessing(section.id, op)
      return performAIOperation({
        jobId,
        sectionId: section.id,
        operation: op,
        content: editState?.currentContent ?? '',
        userPrompt,
      })
    },
    onSuccess: (result) => {
      clearAIOperation(section.id)
      // Reset wasProcessingRef so the detection effect doesn't fire the undo
      // banner — the modal still has the result and the user hasn't applied yet.
      wasProcessingRef.current = false
      setModalResult(result.content)
    },
    onError: () => {
      isModalOpRef.current = false
      clearAIOperation(section.id)
    },
  })

  async function handleSave() {
    const content = editState?.currentContent ?? ''
    setIsSavingToBackend(true)
    try {
      await saveSectionContent(
        jobId,
        section.id,
        content,
        section.sectionType,
      )
    } catch {
      // Network error — still update local state so user doesn't lose work
    } finally {
      setIsSavingToBackend(false)
    }
    saveSection(section.id, content)
  }

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (editState?.isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editState?.isEditing])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editState?.currentContent])

  // Auto-focus title input when title edit starts
  useEffect(() => {
    if (isTitleEditing && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isTitleEditing])

  // Keep titleValue in sync with section.title when not editing
  useEffect(() => {
    if (!isTitleEditing) setTitleValue(section.title)
  }, [section.title, isTitleEditing])

  // Keyboard shortcut Cmd+S / Ctrl+S to save while editing
  useEffect(() => {
    if (!editState?.isEditing) return
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editState?.isEditing])

  // Auto-hide the undo banner after 8 s whenever it becomes visible.
  useEffect(() => {
    if (!showUndoBanner) return
    const timer = setTimeout(() => setShowUndoBanner(false), 8000)
    return () => clearTimeout(timer)
  }, [showUndoBanner])

  // Detect direct-AI processing completion and show undo banner.
  // Skipped for modal ops — the modal controls its own apply/discard flow.
  useEffect(() => {
    if (wasProcessingRef.current && !editState?.isAIProcessing && !aiOperationError && !isModalOpRef.current) {
      setShowUndoBanner(true)
    }
    wasProcessingRef.current = editState?.isAIProcessing ?? false
  }, [editState?.isAIProcessing, aiOperationError])

  if (!editState) return null

  const handleAITrigger = (op: AIOperationType, content: string) => {
    setUndoContent(content)
    setPrevWordCount(content.trim().split(/\s+/).filter(Boolean).length)
    setShowUndoBanner(false)
    triggerOperation({ sectionId: section.id, operation: op, content })
  }

  const hasChildren = section.children.length > 0
  const isL1 = section.level === 1
  const isEditing = editState.isEditing
  const isAIProcessing = editState.isAIProcessing

  return (
    <div
      id={`section-${section.id}`}
      className={cn(
        'bg-white rounded-xl border transition-all duration-200',
        isActive
          ? 'border-brand-200 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
          : 'border-slate-200/80',
        depth > 0 && 'ml-6',
      )}
      onClick={() => setActiveSectionId(section.id)}
    >
      {/* ── Section header ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-start gap-3 p-5 cursor-pointer select-none',
          hasChildren && 'pb-3',
        )}
        onClick={(e) => {
          // Only toggle expand when clicking header, not action buttons
          if ((e.target as HTMLElement).closest('button')) return
          if (hasChildren) toggleSection(section.id)
        }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleSection(section.id)
          }}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          {isTitleEditing ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateSectionTitle(section.id, titleValue.trim() || section.title)
                  setIsTitleEditing(false)
                }
                if (e.key === 'Escape') {
                  setTitleValue(section.title)
                  setIsTitleEditing(false)
                }
              }}
              onBlur={() => {
                updateSectionTitle(section.id, titleValue.trim() || section.title)
                setIsTitleEditing(false)
              }}
              className={cn(
                'w-full font-bold text-slate-900 leading-snug bg-white border border-brand-300 rounded px-1.5 py-0.5 outline-none ring-2 ring-brand-200',
                isL1 ? 'text-base' : 'text-sm',
              )}
            />
          ) : (
            <h3
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsTitleEditing(true)
              }}
              title="Double-click to edit title"
              className={cn(
                'font-bold text-slate-900 leading-snug cursor-text hover:text-brand-700 transition-colors',
                isL1 ? 'text-base' : 'text-sm',
              )}
            >
              {section.title}
            </h3>
          )}

          {/* Meta chips */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {section.wordCount > 0 && section.sectionType !== 'learning-objectives' && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Hash size={10} />
                {section.wordCount.toLocaleString()} words
              </span>
            )}
            {section.estimatedDuration && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={10} />
                {section.estimatedDuration}
              </span>
            )}
            {section.hasKnowledgeCheck && (
              <span className="flex items-center gap-1 text-[11px] text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                <CheckSquare size={10} />
                Knowledge Check
              </span>
            )}
            {editState.isDirty && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                ● Unsaved
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={() => startEditing(section.id)}
                disabled={isAIProcessing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Pencil size={11} />
                Edit
              </button>
              <AIToolbar
                sectionId={section.id}
                content={editState.currentContent}
                isProcessing={isAIProcessing}
                currentOperation={editState.currentAIOperation}
                onTrigger={handleAITrigger}
                onOpenModal={(op) => {
                  setModalResult(null)
                  setModalOp(op)
                }}
              />
            </>
          )}

          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => { void handleSave() }}
                disabled={isSavingToBackend}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Check size={11} />
                {isSavingToBackend ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => cancelEditing(section.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={11} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── AI operation modal (Rewrite by AI / Improve Tone) ─────────── */}
      {modalOp && (
        <AIOperationModal
          operation={modalOp}
          sectionTitle={section.title}
          currentContent={editState.currentContent}
          isProcessing={isAIProcessing}
          result={modalResult}
          onConfirm={(userPrompt) => {
            setModalResult(null)
            modalMutation.mutate({ op: modalOp as AIOperationType, userPrompt })
          }}
          onApply={() => {
            if (modalResult) {
              // Stage AI content in the edit buffer and open edit mode so the
              // user can review the AI output, then explicitly Save (accept) or
              // Cancel (revert to originalContent) — no time-limited undo needed.
              updateEditContent(section.id, modalResult)
              startEditing(section.id)
              // Expand the section so the textarea and Save/Cancel buttons are visible.
              expandSection(section.id)
            }
            isModalOpRef.current = false
            setModalOp(null)
            setModalResult(null)
          }}
          onDiscard={() => {
            // "Try Again" — clear result so user can re-prompt; modal stays open.
            setModalResult(null)
          }}
          onClose={() => {
            // "Discard" or Escape — close without applying anything.
            isModalOpRef.current = false
            setModalOp(null)
            setModalResult(null)
          }}
        />
      )}

      {/* ── Section body (collapsible) ─────────────────────────────────── */}
      {isExpanded && (
        <div className={cn('px-5 pb-5', hasChildren && 'pt-0')}>

          {/* ── Undo banner ───────────────────────────────────────────────── */}
          {showUndoBanner && !isEditing && (
            <div className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={12} />
                <span className="font-medium">Content updated</span>
                {prevWordCount !== null && (
                  <span className="text-emerald-500 tabular-nums">
                    {prevWordCount} → {editState.currentContent.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (undoContent !== null) {
                    updateEditContent(section.id, undoContent)
                  }
                  setShowUndoBanner(false)
                  setUndoContent(null)
                }}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
              >
                <RotateCcw size={10} />
                Undo
              </button>
            </div>
          )}

          {/* ── Learning Objectives special section — numbered list ────────── */}
          {section.sectionType === 'learning-objectives' && !isEditing ? (
            <ol className="space-y-3">
              {section.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 leading-relaxed">{obj}</span>
                </li>
              ))}
            </ol>
          ) : (
            /* ── Overview / Content / LO edit mode ───────────────────────── */
            <>
              {isEditing ? (
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={editState.currentContent}
                    onChange={(e) => updateEditContent(section.id, e.target.value)}
                    className="w-full text-sm text-slate-700 leading-relaxed bg-white border border-brand-300 rounded-lg px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors min-h-[120px]"
                    placeholder="Section content…"
                  />
                  <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 tabular-nums">
                    {editState.currentContent.trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600 leading-relaxed prose-sm max-w-none">
                  {isAIProcessing ? (
                    <div className="space-y-2">
                      <div className="skeleton h-4 rounded" style={{ width: '95%' }} />
                      <div className="skeleton h-4 rounded" style={{ width: '88%' }} />
                      <div className="skeleton h-4 rounded" style={{ width: '76%' }} />
                      <div className="skeleton h-4 rounded" style={{ width: '92%' }} />
                      <div className="skeleton h-4 rounded" style={{ width: '65%' }} />
                    </div>
                  ) : (
                    editState.currentContent.split('\n').map((para, i) =>
                      para.trim() ? (
                        <p key={i} className="mb-2 last:mb-0">
                          {para}
                        </p>
                      ) : (
                        <br key={i} />
                      ),
                    )
                  )}
                </div>
              )}
            </>
          )}

          {/* AI operation error */}
          {aiOperationError && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={12} />
              AI operation failed. Please try again.
            </div>
          )}

          {/* Child sections */}
          {hasChildren && isExpanded && section.children.length > 0 && (
            <div className="mt-5 space-y-3">
              {section.children.map((child) => (
                <CourseSectionCard
                  key={child.id}
                  section={child}
                  jobId={jobId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
