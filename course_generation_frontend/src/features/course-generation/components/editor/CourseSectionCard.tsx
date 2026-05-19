import { useRef, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  BookOpen,
  CheckSquare,
  Clock,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '../../store/editorStore'
import { useAIOperation } from '../../hooks/useAIOperation'
import { AIToolbar } from './AIToolbar'
import type { CourseSection } from '../../types/editor'

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
    setActiveSectionId,
    startEditing,
    updateEditContent,
    saveSection,
    cancelEditing,
  } = useEditorStore()

  const editState = sectionEditStates.get(section.id)
  const isExpanded = expandedSectionIds.has(section.id)
  const isActive = activeSectionId === section.id
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { triggerOperation } = useAIOperation(jobId)

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

  if (!editState) return null

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
        {hasChildren ? (
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
        ) : (
          <div className="mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          </div>
        )}

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-bold text-slate-900 leading-snug',
              isL1 ? 'text-base' : 'text-sm',
            )}
          >
            {section.title}
          </h3>

          {/* Meta chips */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {section.wordCount > 0 && (
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
          {!isEditing && !isAIProcessing && (
            <>
              <button
                type="button"
                onClick={() => startEditing(section.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
              <AIToolbar
                sectionId={section.id}
                content={editState.currentContent}
                isProcessing={isAIProcessing}
                currentOperation={editState.currentAIOperation}
                onTrigger={(op, content) =>
                  triggerOperation({ sectionId: section.id, operation: op, content })
                }
              />
            </>
          )}

          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => saveSection(section.id, editState.currentContent)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Check size={11} />
                Save
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

      {/* ── Section body (collapsible) ─────────────────────────────────── */}
      {(isExpanded || !hasChildren) && (
        <div className={cn('px-5 pb-5', hasChildren && 'pt-0')}>
          {/* Learning objectives */}
          {section.learningObjectives.length > 0 && (
            <div className="mb-4 p-3.5 bg-brand-50/50 border border-brand-100 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen size={11} className="text-brand-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                  Learning Objectives
                </span>
              </div>
              <ul className="space-y-1">
                {section.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-300 shrink-0" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content: editable textarea or display */}
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
            <div
              className={cn(
                'text-sm text-slate-600 leading-relaxed prose-sm max-w-none',
                isAIProcessing && 'opacity-50',
              )}
            >
              {isAIProcessing ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 rounded" style={{ width: '92%' }} />
                  <div className="skeleton h-4 rounded" style={{ width: '85%' }} />
                  <div className="skeleton h-4 rounded" style={{ width: '78%' }} />
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
