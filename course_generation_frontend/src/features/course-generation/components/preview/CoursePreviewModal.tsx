import { useEffect, useRef, useState } from 'react'
import {
  X,
  Download,
  BookOpen,
  ChevronRight,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { courseApi } from '../../api/courseApi'
import type { CourseContent, CourseSection } from '../../types/editor'

interface CoursePreviewModalProps {
  courseContent: CourseContent
  onClose: () => void
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function PreviewNavItem({
  section,
  activeSectionId,
  depth,
  onNavigate,
}: {
  section: CourseSection
  activeSectionId: string
  depth: number
  onNavigate: (id: string) => void
}) {
  const isActive = activeSectionId === section.id
  return (
    <div>
      <button
        type="button"
        onClick={() => onNavigate(section.id)}
        className={cn(
          'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 group',
          depth === 0 ? 'font-semibold' : 'font-medium',
          isActive
            ? 'bg-white/20 text-white'
            : 'text-white/60 hover:bg-white/10 hover:text-white/90',
          depth > 0 && 'pl-6',
        )}
      >
        <ChevronRight
          size={10}
          className={cn(
            'shrink-0 transition-transform',
            isActive && 'rotate-90',
          )}
        />
        <span className="truncate">{section.title}</span>
      </button>
      {depth === 0 &&
        section.children.map((child) => (
          <PreviewNavItem
            key={child.id}
            section={child}
            activeSectionId={activeSectionId}
            depth={1}
            onNavigate={onNavigate}
          />
        ))}
    </div>
  )
}

// ─── Section content renderer ─────────────────────────────────────────────────
function PreviewSection({
  section,
  depth,
}: {
  section: CourseSection
  depth: number
}) {
  const headingClass =
    depth === 0
      ? 'text-2xl font-bold text-slate-900 mb-3'
      : 'text-lg font-semibold text-slate-800 mb-2 mt-6'

  return (
    <div id={`preview-${section.id}`} className={cn(depth === 0 && 'pt-6 first:pt-0')}>
      {/* Heading */}
      <h2 className={headingClass}>{section.title}</h2>

      {/* Learning objectives */}
      {section.learningObjectives.length > 0 && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2.5">
            <BookOpen size={12} className="text-indigo-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
              Learning Objectives
            </span>
          </div>
          <ul className="space-y-1.5">
            {section.learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Body paragraphs */}
      <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
        {section.content.split('\n').map((para, i) =>
          para.trim() ? (
            <p key={i} className="mb-3">
              {para}
            </p>
          ) : (
            <br key={i} />
          ),
        )}
      </div>

      {/* Knowledge check badge */}
      {section.hasKnowledgeCheck && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-brand-50 border border-brand-200 rounded-lg">
          <CheckSquare size={14} className="text-brand-500 shrink-0" />
          <span className="text-xs font-semibold text-brand-700">
            Knowledge Check — practice questions follow this section
          </span>
        </div>
      )}

      {/* Divider between top-level sections */}
      {depth === 0 && section.children.length === 0 && (
        <hr className="my-8 border-slate-200" />
      )}

      {/* Child sections */}
      {section.children.map((child) => (
        <PreviewSection key={child.id} section={child} depth={depth + 1} />
      ))}

      {depth === 0 && section.children.length > 0 && (
        <hr className="my-8 border-slate-200" />
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function CoursePreviewModal({
  courseContent,
  onClose,
}: CoursePreviewModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState(
    courseContent.sections[0]?.id ?? '',
  )

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Scroll-spy: update active nav item as user scrolls
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function handleScroll() {
      const allIds = courseContent.sections.map((s) => s.id)
      for (const id of allIds) {
        const target = el!.querySelector(`#preview-${id}`)
        if (!target) continue
        const rect = target.getBoundingClientRect()
        if (rect.top >= 0 && rect.top < el!.clientHeight * 0.4) {
          setActiveSectionId(id)
          break
        }
      }
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [courseContent.sections])

  function navigateToSection(id: string) {
    setActiveSectionId(id)
    const el = scrollRef.current?.querySelector(`#preview-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fixed inset-0 z-50 flex overlay-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex w-full max-w-6xl mx-auto my-4 bg-white rounded-2xl shadow-2xl overflow-hidden scale-in">

        {/* ── Left nav sidebar ──────────────────────────────────────────── */}
        <aside className="hidden md:flex w-64 xl:w-72 shrink-0 flex-col bg-slate-800 overflow-y-auto">
          {/* Branding strip */}
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
              Course Preview
            </p>
            <h2 className="text-sm font-bold text-white leading-snug line-clamp-2">
              {courseContent.courseTitle}
            </h2>
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] text-white/40">
                {courseContent.meta.sectionCount} sections
              </span>
              <span className="text-[10px] text-white/40">
                {courseContent.meta.estimatedReadTime} read
              </span>
            </div>
          </div>

          {/* Nav tree */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {courseContent.sections.map((section) => (
              <PreviewNavItem
                key={section.id}
                section={section}
                activeSectionId={activeSectionId}
                depth={0}
                onNavigate={navigateToSection}
              />
            ))}
          </nav>

          {/* Footer actions */}
          <div className="p-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => courseApi.downloadCourseArtifact(courseContent.jobId)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <Download size={12} />
              Download DOCX
            </button>
          </div>
        </aside>

        {/* ── Content area ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {courseContent.courseTitle}
              </p>
              <p className="text-[11px] text-slate-400">
                {courseContent.meta.totalWordCount.toLocaleString()} words ·{' '}
                {courseContent.meta.estimatedReadTime} read
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-8 py-6 lg:px-12 lg:py-8"
          >
            <div className="max-w-2xl mx-auto">
              {courseContent.sections.map((section) => (
                <PreviewSection key={section.id} section={section} depth={0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
