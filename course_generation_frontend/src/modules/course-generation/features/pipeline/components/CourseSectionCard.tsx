import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import { AnimatePresence, motion } from 'framer-motion'
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
  Sparkles,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '../../../store/editorStore'
import { useAIOperation } from '../hooks/useAIOperation'
import { performAIOperation } from '@/api/editor/api'
import {
  allowsStructuralChange,
  buildAIContentPayload,
  resolveAIOperationResult,
} from '../../../utils/aiContentStructure'
import { AIToolbar } from './AIToolbar'
import { AIOperationModal } from './AIOperationModal'
import { RichContentRenderer } from './RichContentRenderer'
import type { AIOperationType, BodyParagraph, CourseSection } from '../../../types/editor'

interface AIContentSnapshot {
  content: string
  paragraphs?: BodyParagraph[]
}

interface CourseSectionCardProps {
  section: CourseSection
  depth: number
  index: number
  dragHandleProps?: DraggableProvidedDragHandleProps | null
}

export function CourseSectionCard({
  section,
  depth,
  index,
  dragHandleProps,
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
    applyAIResult,
    addSubtopic,
    moveSubtopicToSection,
    deleteSection,
    courseContent,
  } = useEditorStore()

  const editState = sectionEditStates.get(section.id)
  const isExpanded = expandedSectionIds.has(section.id)
  const isActive = activeSectionId === section.id
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { triggerOperation, error: aiOperationError } = useAIOperation()

  const [modalOp, setModalOp] = useState<'rewrite' | 'improve_tone' | null>(null)
  const [modalResult, setModalResult] = useState<AIContentSnapshot | null>(null)
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(section.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false)
  const [moveMenuPos, setMoveMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [moveFocusIndex, setMoveFocusIndex] = useState(-1)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Available parent sections for "Move to Section" — all L1 sections except self/current parent
  const availableParents = useMemo(
    () => (courseContent?.sections ?? []).filter(
      (s) => s.level === 1 && s.id !== section.parentId && s.id !== section.id,
    ),
    [courseContent?.sections, section.parentId, section.id],
  )

  const [undoSnapshot, setUndoSnapshot] = useState<AIContentSnapshot | null>(null)
  const [showUndoBanner, setShowUndoBanner] = useState(false)
  const [prevWordCount, setPrevWordCount] = useState<number | null>(null)
  const wasProcessingRef = useRef(false)
  const isModalOpRef = useRef(false)

  // Batch AI state — tracks progress when an operation is applied to all children
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number } | null>(null)
  const batchCancelledRef = useRef(false)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])


  // Computed early so modalMutation and the render path share the same value.
  const children = section.children ?? []
  const hasChildren = children.length > 0
  const isL1 = depth === 0
  const canAddSubtopic =
    isL1 &&
    section.sectionType !== 'overview' &&
    section.sectionType !== 'learning-objectives' &&
    section.id !== 'course-overview' &&
    section.id !== 'course-learning-objectives'

  // For L1 sections with children but little/no direct content, build combined text
  // from all subsections so AI operations have real material to work with.
  const combinedChildrenContent =
    isL1 && hasChildren
      ? children
          .map((child) => {
            const childState = sectionEditStates.get(child.id)
            const text = (childState?.currentContent || child.content).trim()
            return text ? `${child.title}\n${text}` : ''
          })
          .filter(Boolean)
          .join('\n\n')
      : ''
  const aiContent =
    isL1 && hasChildren && !(editState?.currentContent ?? section.content).trim()
      ? combinedChildrenContent
      : (editState?.currentContent ?? section.content)

  // Prefer live structured blocks when the section is not mid-markdown-edit.
  const aiParagraphs: BodyParagraph[] | undefined =
    editState && !editState.isDirty && section.paragraphs && section.paragraphs.length > 0
      ? section.paragraphs
      : undefined

  const modalMutation = useMutation({
    mutationFn: async ({ op, userPrompt }: { op: AIOperationType; userPrompt: string }) => {
      isModalOpRef.current = true
      setAIProcessing(section.id, op)
      const payload = buildAIContentPayload(section.id, aiContent, aiParagraphs)
      const preserveStructure = !allowsStructuralChange(op, userPrompt)
      const raw = await performAIOperation({
        sectionId: section.id,
        operation: op,
        content: payload.content,
        paragraphs: payload.paragraphs,
        userPrompt,
        preserveStructure,
      })
      return resolveAIOperationResult(payload.paragraphs ?? aiParagraphs, raw, {
        sectionId: section.id,
        operation: op,
        userPrompt,
        preserveStructure,
      })
    },
    onSuccess: (result) => {
      clearAIOperation(section.id)
      wasProcessingRef.current = false
      setModalResult(result)
    },
    onError: () => {
      isModalOpRef.current = false
      clearAIOperation(section.id)
    },
  })

  function handleSave() {
    const content = editState?.currentContent ?? ''
    saveSection(section.id, content)
  }

  function commitTitle(newTitle: string) {
    const saved = newTitle.trim() || section.title
    updateSectionTitle(section.id, saved)
    setTitleValue(saved)
    setIsTitleEditing(false)
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

  // Close move menu on Escape
  useEffect(() => {
    if (!isMoveMenuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMoveMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMoveMenuOpen])

  // Cmd+S / Ctrl+S to save
  useEffect(() => {
    if (!editState?.isEditing) return
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
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

  // Applies an AI operation to every child individually, sequentially.
  const handleBatchAITrigger = useCallback(
    async (op: AIOperationType, userPrompt?: string) => {
      const children = section.children
      if (children.length === 0) return
      batchCancelledRef.current = false
      setBatchProgress({ total: children.length, done: 0 })
      expandSection(section.id)

      for (let i = 0; i < children.length; i++) {
        if (batchCancelledRef.current || !isMountedRef.current) break
        const child = children[i]
        const childState = sectionEditStates.get(child.id)
        const childContent = childState?.currentContent ?? child.content
        const childParagraphs =
          childState && !childState.isDirty && child.paragraphs && child.paragraphs.length > 0
            ? child.paragraphs
            : undefined
        setAIProcessing(child.id, op)
        try {
          const payload = buildAIContentPayload(child.id, childContent, childParagraphs)
          const preserveStructure = !allowsStructuralChange(op, userPrompt)
          const raw = await performAIOperation({
            sectionId: child.id,
            operation: op,
            content: payload.content,
            paragraphs: payload.paragraphs,
            userPrompt,
            preserveStructure,
          })
          const resolved = resolveAIOperationResult(
            payload.paragraphs ?? childParagraphs,
            raw,
            {
              sectionId: child.id,
              operation: op,
              userPrompt,
              preserveStructure,
            },
          )
          if (isMountedRef.current) {
            applyAIResult(child.id, resolved.content, resolved.paragraphs)
          }
        } catch {
          if (isMountedRef.current) clearAIOperation(child.id)
        }
        if (isMountedRef.current) setBatchProgress({ total: children.length, done: i + 1 })
      }
      if (isMountedRef.current) setBatchProgress(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section.children, section.id, sectionEditStates],
  )

  const isBatchProcessing = batchProgress !== null

  const handleAITrigger = (op: AIOperationType, content: string) => {
    if (isL1 && hasChildren) {
      void handleBatchAITrigger(op)
      return
    }
    setUndoSnapshot({
      content,
      paragraphs: aiParagraphs ? aiParagraphs.map((p) => ({ ...p })) : undefined,
    })
    setPrevWordCount(content.trim().split(/\s+/).filter(Boolean).length)
    setShowUndoBanner(false)
    triggerOperation({
      sectionId: section.id,
      operation: op,
      content,
      paragraphs: aiParagraphs,
    })
  }

  const isEditing = editState.isEditing
  const isAIProcessing = editState.isAIProcessing
  const sectionLabel = isL1 ? `Section ${index + 1}` : null
  // Show AI/Edit controls when the section has its own content, is actively being
  // edited, is a non-L1 (subsections always show), or is an L1 with children
  // (so the whole-section AI feature is reachable from the parent card).
  const showEditControls =
    editState.currentContent.trim().length > 0 || isEditing || !isL1 || hasChildren

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
          {...(dragHandleProps ?? {})}
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
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitTitle(titleValue)
                  }
                  if (e.key === 'Escape') {
                    setTitleValue(section.title)
                    setIsTitleEditing(false)
                  }
                }}
                onBlur={() => {
                  commitTitle(titleValue)
                }}
                className={cn(
                  'flex-1 min-w-0 text-slate-900 leading-snug bg-white border border-brand-300 rounded px-1.5 py-0.5 outline-none ring-2 ring-brand-200',
                  isL1 ? 'text-base font-bold' : 'text-sm font-semibold',
                )}
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  // Use mousedown so it fires before the input's onBlur
                  e.preventDefault()
                  commitTitle(titleValue)
                }}
                className="shrink-0 flex items-center justify-center h-6 w-6 rounded bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                title="Save title (Enter)"
              >
                <Check size={11} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setTitleValue(section.title)
                  setIsTitleEditing(false)
                }}
                className="shrink-0 flex items-center justify-center h-6 w-6 rounded border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                title="Cancel (Esc)"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation()
                setIsTitleEditing(true)
              }}
              title="Click to edit title"
              className={cn(
                'text-slate-900 leading-snug cursor-pointer group/title flex items-center gap-1.5',
                isL1 ? 'text-base font-bold hover:text-brand-700' : 'text-sm font-semibold hover:text-brand-700',
                'transition-colors',
              )}
            >
              {section.title}
              <Pencil
                size={10}
                className="shrink-0 text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity"
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
              {/* Delete + Move buttons (non-L1 only) */}
              {!isL1 && (
                <>
                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all opacity-0 group-hover/card:opacity-100"
                    title="Delete subtopic"
                  >
                    <Trash2 size={11} />
                  </button>
                  {/* Move to Section — only when other parent sections exist */}
                  {availableParents.length > 0 && (
                    <div className="relative">
                      <button
                        ref={moveButtonRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isMoveMenuOpen && moveButtonRef.current) {
                            const rect = moveButtonRef.current.getBoundingClientRect()
                            const MENU_HEIGHT = Math.min(availableParents.length * 36 + 48, 208)
                            const fitsBelow = rect.bottom + 4 + MENU_HEIGHT < window.innerHeight
                            setMoveMenuPos({
                              top: fitsBelow ? rect.bottom + 4 : rect.top - MENU_HEIGHT - 4,
                              right: window.innerWidth - rect.right,
                            })
                            setMoveFocusIndex(-1)
                          }
                          setIsMoveMenuOpen((o) => !o)
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-transparent hover:border-brand-100 transition-all opacity-0 group-hover/card:opacity-100"
                        title="Move to another section"
                      >
                        <GripVertical size={11} />
                      </button>
                      {createPortal(
                        <>
                          {isMoveMenuOpen && (
                            <div
                              className="fixed inset-0 z-[998]"
                              onClick={() => setIsMoveMenuOpen(false)}
                            />
                          )}
                          <AnimatePresence>
                            {isMoveMenuOpen && moveMenuPos && (
                              <motion.div
                                key="move-menu"
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                                className="fixed z-[999] w-52 bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden"
                                style={{ top: moveMenuPos.top, right: moveMenuPos.right }}
                                onClick={(e) => e.stopPropagation()}
                                role="menu"
                                aria-orientation="vertical"
                                aria-label="Move subtopic to section"
                              >
                                {/* Header */}
                                <div className="px-3 pt-2.5 pb-2 border-b border-slate-100">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Move to section
                                  </p>
                                </div>
                                {/* Section list */}
                                <div
                                  className="overflow-y-auto overscroll-contain py-1"
                                  style={{ maxHeight: '160px' }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault()
                                      setMoveFocusIndex((i) => Math.min(i + 1, availableParents.length - 1))
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault()
                                      setMoveFocusIndex((i) => Math.max(i - 1, 0))
                                    } else if (e.key === 'Enter' && moveFocusIndex >= 0) {
                                      const parent = availableParents[moveFocusIndex]
                                      if (parent) {
                                        setIsMoveMenuOpen(false)
                                        moveSubtopicToSection(section.id, parent.id)
                                      }
                                    }
                                  }}
                                >
                                  {availableParents.map((parent, i) => {
                                    const sectionNum = (courseContent?.sections ?? []).findIndex(
                                      (s) => s.id === parent.id,
                                    ) + 1
                                    const isFocused = moveFocusIndex === i
                                    return (
                                      <button
                                        key={parent.id}
                                        type="button"
                                        role="menuitem"
                                        tabIndex={0}
                                        className={cn(
                                          'w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs transition-colors outline-none',
                                          isFocused
                                            ? 'bg-brand-50 text-brand-700'
                                            : 'text-slate-700 hover:bg-slate-50',
                                        )}
                                        onMouseEnter={() => setMoveFocusIndex(i)}
                                        onMouseLeave={() => setMoveFocusIndex(-1)}
                                        onClick={() => {
                                          setIsMoveMenuOpen(false)
                                          moveSubtopicToSection(section.id, parent.id)
                                        }}
                                      >
                                        <span className={cn(
                                          'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                                          isFocused
                                            ? 'bg-brand-100 text-brand-700'
                                            : 'bg-slate-100 text-slate-500',
                                        )}>
                                          {sectionNum}
                                        </span>
                                        <span className="truncate font-medium leading-snug">
                                          {parent.title}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>,
                        document.body,
                      )}
                    </div>
                  )}
                </>
              )}
              {showEditControls && (
                <>
                  {!(isL1 && hasChildren && !editState.currentContent.trim()) && (
                    <button
                      type="button"
                      onClick={() => startEditing(section.id)}
                      disabled={isAIProcessing || isBatchProcessing}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Pencil size={11} />
                      Edit
                    </button>
                  )}
                  <AIToolbar
                    sectionId={section.id}
                    content={aiContent}
                    isProcessing={isAIProcessing || isBatchProcessing}
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
                onClick={handleSave}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
              >
                <Check size={11} />
                Save
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
          currentContent={aiContent}
          currentParagraphs={aiParagraphs}
          isProcessing={isAIProcessing}
          result={modalResult?.content ?? null}
          resultParagraphs={modalResult?.paragraphs}
          batchCount={isL1 && hasChildren ? section.children.length : undefined}
          onConfirm={(userPrompt) => {
            setModalResult(null)
            if (isL1 && hasChildren) {
              // Batch mode: close the modal immediately and process each child
              isModalOpRef.current = false
              setModalOp(null)
              void handleBatchAITrigger(modalOp as AIOperationType, userPrompt)
            } else {
              modalMutation.mutate({ op: modalOp as AIOperationType, userPrompt })
            }
          }}
          onApply={() => {
            if (modalResult) {
              setUndoSnapshot({
                content: editState.currentContent,
                paragraphs: section.paragraphs
                  ? section.paragraphs.map((p) => ({ ...p }))
                  : undefined,
              })
              applyAIResult(section.id, modalResult.content, modalResult.paragraphs)
              expandSection(section.id)
              setShowUndoBanner(true)
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

              {/* Batch AI progress banner */}
              {isBatchProcessing && batchProgress && (
                <div className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg bg-brand-50 border border-brand-100 text-xs">
                  <div className="flex items-center gap-2 text-brand-700">
                    <Sparkles size={12} className="animate-pulse" />
                    <span className="font-medium">
                      Processing subtopic {batchProgress.done + 1} of {batchProgress.total} with AI…
                    </span>
                    <span className="text-brand-400 tabular-nums">
                      ({batchProgress.done}/{batchProgress.total} done)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { batchCancelledRef.current = true }}
                    className="flex items-center gap-1 text-brand-500 hover:text-brand-700 font-medium transition-colors"
                  >
                    <XCircle size={12} />
                    Cancel
                  </button>
                </div>
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
                      if (undoSnapshot) {
                        applyAIResult(
                          section.id,
                          undoSnapshot.content,
                          undoSnapshot.paragraphs,
                        )
                      }
                      setShowUndoBanner(false)
                      setUndoSnapshot(null)
                    }}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                  >
                    <RotateCcw size={10} />
                    Undo
                  </button>
                </div>
              )}

              {/* Learning objectives — prefer section array; fall back to course-level LOs */}
              {section.sectionType === 'learning-objectives' && !isEditing ? (
                <ol className="space-y-2.5">
                  {(
                    section.learningObjectives?.length
                      ? section.learningObjectives
                      : (courseContent?.learningObjectives ?? [])
                  ).map((obj, i) => (
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
                      <div className="prose-sm max-w-none">
                        {isAIProcessing ? (
                          <div className="space-y-2">
                            <div className="skeleton h-4 rounded" style={{ width: '95%' }} />
                            <div className="skeleton h-4 rounded" style={{ width: '88%' }} />
                            <div className="skeleton h-4 rounded" style={{ width: '76%' }} />
                            <div className="skeleton h-4 rounded" style={{ width: '92%' }} />
                            <div className="skeleton h-4 rounded" style={{ width: '65%' }} />
                          </div>
                        ) : (
                          <RichContentRenderer
                            paragraphs={editState.isDirty ? undefined : section.paragraphs}
                            fallbackText={editState.currentContent}
                          />
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

                  {/* Draggable children via @hello-pangea/dnd */}
                  {hasChildren && (
                    <Droppable droppableId={section.id} type="CHILD">
                      {(droppableProvided, droppableSnapshot) => (
                        <div
                          ref={droppableProvided.innerRef}
                          {...droppableProvided.droppableProps}
                          className={cn(
                            'space-y-2 rounded-lg transition-colors duration-150',
                            droppableSnapshot.isDraggingOver && 'bg-brand-50/50',
                          )}
                        >
                          {children.map((child, childIndex) => (
                            <Draggable
                              key={`${child.id}-${childIndex}`}
                              draggableId={`${child.id}-${childIndex}`}
                              index={childIndex}
                            >
                              {(draggableProvided, draggableSnapshot) => (
                                <div
                                  ref={draggableProvided.innerRef as React.Ref<HTMLDivElement>}
                                  {...draggableProvided.draggableProps}
                                  style={draggableProvided.draggableProps.style as CSSProperties}
                                  className={cn(
                                    'rounded-lg transition-shadow duration-150',
                                    draggableSnapshot.isDragging && 'shadow-lg ring-2 ring-brand-300',
                                  )}
                                >
                                  <CourseSectionCard
                                    section={child}
                                    depth={1}
                                    index={childIndex}
                                    dragHandleProps={draggableProvided.dragHandleProps}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {droppableProvided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )}

                  {/* Add subtopic button */}
                  {canAddSubtopic && (
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
