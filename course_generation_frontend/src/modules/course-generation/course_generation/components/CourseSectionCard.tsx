import { useRef, useEffect, useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion'
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
  GripVertical,
  Trash2,
  Plus,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '../../store/editorStore'
import { useAIOperation } from '../hooks/useAIOperation'
import { performAIOperation, saveSectionContent } from '@/api/editor/api'
import { AIToolbar } from './AIToolbar'
import { AIOperationModal } from './AIOperationModal'
import type { AIOperationType, CourseSection } from '../../types/editor'

interface CourseSectionCardProps {
  section: CourseSection
  jobId: string
  depth: number
  index: number
  onDragHandlePointerDown?: (e: React.PointerEvent) => void
}

// ── Child drag wrapper ────────────────────────────────────────────────────────
function DraggableChildItem({
  child,
  childIndex,
  jobId,
}: {
  child: CourseSection
  childIndex: number
  jobId: string
}) {
  const dragControls = useDragControls()
  return (
    // as="div" is required — default "li" inside a "div" group breaks layout measurement
    <Reorder.Item
      as="div"
      value={child.id}
      dragListener={false}
      dragControls={dragControls}
      style={{ position: 'relative' }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
    >
      <CourseSectionCard
        section={child}
        jobId={jobId}
        depth={1}
        index={childIndex}
        onDragHandlePointerDown={(e) => dragControls.start(e)}
      />
    </Reorder.Item>
  )
}

export function CourseSectionCard({
  section,
  jobId,
  depth,
  index,
  onDragHandlePointerDown,
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
    addSubtopic,
    deleteSection,
    reorderChildren,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [undoContent, setUndoContent] = useState<string | null>(null)
  const [showUndoBanner, setShowUndoBanner] = useState(false)
  const [prevWordCount, setPrevWordCount] = useState<number | null>(null)
  const wasProcessingRef = useRef(false)
  const isModalOpRef = useRef(false)

  // ── Child DnD state ───────────────────────────────────────────────────────
  const childIds = useMemo(
    () => section.children.map((c) => c.id),
    [section.children],
  )
  const [localChildIds, setLocalChildIds] = useState<string[]>(childIds)
  const childById = useMemo(() => {
    const m = new Map<string, CourseSection>()
    section.children.forEach((c) => m.set(c.id, c))
    return m
  }, [section.children])

  // Sync localChildIds only when the set of child IDs changes (add/delete),
  // not on every content update.
  const childIdsKey = childIds.join(',')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalChildIds(childIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIdsKey])

  function handleChildReorder(newIds: string[]) {
    setLocalChildIds(newIds)
    const reordered = newIds
      .map((id) => childById.get(id))
      .filter(Boolean) as CourseSection[]
    reorderChildren(section.id, reordered)
  }

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
      await saveSectionContent(jobId, section.id, content, section.sectionType)
    } catch {
      // Network error — still update local state
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

  // Auto-focus title input
  useEffect(() => {
    if (isTitleEditing && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isTitleEditing])

  // Sync titleValue when not editing
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isTitleEditing) setTitleValue(section.title)
  }, [section.title, isTitleEditing])

  // Cmd+S / Ctrl+S to save
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

  // Auto-hide undo banner
  useEffect(() => {
    if (!showUndoBanner) return
    const timer = setTimeout(() => setShowUndoBanner(false), 8000)
    return () => clearTimeout(timer)
  }, [showUndoBanner])

  // Detect AI processing completion
  useEffect(() => {
    if (
      wasProcessingRef.current &&
      !editState?.isAIProcessing &&
      !aiOperationError &&
      !isModalOpRef.current
    ) {
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
  const isL1 = depth === 0
  const isEditing = editState.isEditing
  const isAIProcessing = editState.isAIProcessing
  const sectionLabel = isL1 ? `Section ${index + 1}` : null
  // Show Edit/AI only on sections that actually have content to work with.
  // L1 container headers (no content, only children) stay clean.
  const showEditControls = editState.currentContent.trim().length > 0 || isEditing || !isL1

  return (
    <div
      id={`section-${section.id}`}
      className={cn(
        'group/card rounded-xl border transition-all duration-200',
        isL1
          ? 'bg-white shadow-sm'
          : 'bg-slate-50/80',
        isActive
          ? 'border-brand-200 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
          : isL1
            ? 'border-slate-200 hover:border-slate-300'
            : 'border-slate-200/70 hover:border-slate-300',
        !isL1 && 'ml-0',
      )}
      onClick={() => setActiveSectionId(section.id)}
    >
      {/* ── Section label banner (L1 only) ───────────────────────────────── */}
      {isL1 && (
        <div className={cn(
          'flex items-center justify-between px-4 pt-3 pb-0',
        )}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-50 border border-brand-100 text-[10px] font-bold uppercase tracking-wider text-brand-600">
              <Layers size={9} />
              {sectionLabel}
            </span>
            {editState.isDirty && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100">
                ● Unsaved
              </span>
            )}
          </div>
          {/* Delete section confirm */}
          {showDeleteConfirm ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] text-slate-500">Delete this section?</span>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  deleteSection(section.id)
                }}
                className="px-2 py-1 text-[11px] font-semibold text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              className="opacity-0 group-hover/card:opacity-100 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
              title="Delete section"
            >
              <Trash2 size={11} />
              Delete
            </button>
          )}
        </div>
      )}

      {/* ── Section header ───────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-start gap-2 cursor-pointer select-none',
          isL1 ? 'px-4 pt-2 pb-3' : 'px-4 py-3',
          hasChildren && 'pb-2',
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          toggleSection(section.id)
        }}
      >
        {/* Drag handle */}
        <div
          className="flex items-center self-start pt-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors touch-none shrink-0"
          onPointerDown={onDragHandlePointerDown}
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleSection(section.id)
          }}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Title + meta */}
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
                'w-full text-slate-900 leading-snug bg-white border border-brand-300 rounded px-1.5 py-0.5 outline-none ring-2 ring-brand-200',
                isL1 ? 'text-base font-bold' : 'text-sm font-semibold',
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
                'text-slate-900 leading-snug cursor-text group/title flex items-center gap-1.5',
                isL1 ? 'text-base font-bold hover:text-brand-700' : 'text-sm font-semibold hover:text-brand-700',
                'transition-colors',
              )}
            >
              {section.title}
              <Pencil
                size={10}
                className="shrink-0 text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity"
              />
            </h3>
          )}

          {/* Meta chips */}
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            {section.wordCount > 0 && section.sectionType !== 'learning-objectives' && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Hash size={9} />
                {section.wordCount.toLocaleString()} words
              </span>
            )}
            {section.estimatedDuration && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={9} />
                {section.estimatedDuration}
              </span>
            )}
            {hasChildren && (
              <span className="text-[11px] text-slate-400">
                {section.children.length} {section.children.length === 1 ? 'subtopic' : 'subtopics'}
              </span>
            )}
            {section.hasKnowledgeCheck && (
              <span className="flex items-center gap-1 text-[11px] text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                <CheckSquare size={9} />
                Knowledge Check
              </span>
            )}
            {!isL1 && editState.isDirty && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                ● Unsaved
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {!isEditing && (
            <>
              {/* Delete subtopic (non-L1) */}
              {!isL1 && (
                <button
                  type="button"
                  onClick={() => deleteSection(section.id)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all opacity-0 group-hover/card:opacity-100"
                  title="Delete subtopic"
                >
                  <Trash2 size={11} />
                </button>
              )}
              {showEditControls && (
                <>
                  <button
                    type="button"
                    onClick={() => startEditing(section.id)}
                    disabled={isAIProcessing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
            </>
          )}

          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => { void handleSave() }}
                disabled={isSavingToBackend}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
              >
                <Check size={11} />
                {isSavingToBackend ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => cancelEditing(section.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={11} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── AI operation modal ───────────────────────────────────────────── */}
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
              updateEditContent(section.id, modalResult)
              startEditing(section.id)
              expandSection(section.id)
            }
            isModalOpRef.current = false
            setModalOp(null)
            setModalResult(null)
          }}
          onDiscard={() => setModalResult(null)}
          onClose={() => {
            isModalOpRef.current = false
            setModalOp(null)
            setModalResult(null)
          }}
        />
      )}

      {/* ── Collapsible body ─────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'px-4 pb-4',
              isL1 ? 'pt-0' : 'pt-0',
            )}>
              {/* Divider before content */}
              {(section.content || isEditing || section.sectionType === 'learning-objectives') && (
                <div className="border-t border-slate-100 mb-3" />
              )}

              {/* Undo banner */}
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
                      if (undoContent !== null) updateEditContent(section.id, undoContent)
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

              {/* Learning objectives */}
              {section.sectionType === 'learning-objectives' && !isEditing ? (
                <ol className="space-y-2.5">
                  {section.learningObjectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700 leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                /* Content / edit area */
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
                    editState.currentContent && (
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
                              <p key={i} className="mb-2 last:mb-0">{para}</p>
                            ) : (
                              <br key={i} />
                            ),
                          )
                        )}
                      </div>
                    )
                  )}
                </>
              )}

              {/* AI error */}
              {aiOperationError && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={12} />
                  AI operation failed. Please try again.
                </div>
              )}

              {/* ── Subtopics ──────────────────────────────────────────────── */}
              {(hasChildren || isL1) && (
                <div className={cn(
                  hasChildren || isL1 ? 'mt-3' : 'mt-2',
                )}>
                  {/* Subtopics heading (L1 only) */}
                  {isL1 && hasChildren && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
                      Subtopics
                    </p>
                  )}

                  {/* Draggable children — AnimatePresence wraps group, not inside it */}
                  {hasChildren && (
                    <AnimatePresence initial={false} mode="popLayout">
                      <Reorder.Group
                        axis="y"
                        values={localChildIds}
                        onReorder={handleChildReorder}
                        as="div"
                        className="space-y-2"
                      >
                        {localChildIds.map((cid, childIndex) => {
                          const child = childById.get(cid)
                          if (!child) return null
                          return (
                            <DraggableChildItem
                              key={cid}
                              child={child}
                              childIndex={childIndex}
                              jobId={jobId}
                            />
                          )
                        })}
                      </Reorder.Group>
                    </AnimatePresence>
                  )}

                  {/* Add subtopic button */}
                  {isL1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        addSubtopic(section.id)
                      }}
                      className={cn(
                        'flex items-center gap-1.5 text-[12px] font-medium text-slate-400',
                        'hover:text-brand-500 transition-colors',
                        'py-2 px-1',
                        hasChildren ? 'mt-2' : 'mt-1',
                      )}
                    >
                      <Plus size={12} />
                      Add Subtopic
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
