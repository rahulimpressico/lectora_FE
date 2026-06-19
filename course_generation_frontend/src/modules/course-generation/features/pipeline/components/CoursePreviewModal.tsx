import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X,
  Download,
  BookOpen,
  Clock,
  Layers,
  CheckSquare2,
  ImageOff,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { downloadCourseArtifact } from '@/api/editor/api'
import type { CourseContent, CourseSection, SectionImage } from '../../../types/editor'

interface CoursePreviewModalProps {
  courseContent: CourseContent
  onClose: () => void
}

// ─── Reading progress bar ──────────────────────────────────────────────────
function ReadingProgressBar({ scrollEl }: { scrollEl: HTMLDivElement | null }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!scrollEl) return
    function update() {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl!
      const max = scrollHeight - clientHeight
      setProgress(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0)
    }
    scrollEl.addEventListener('scroll', update, { passive: true })
    return () => scrollEl.removeEventListener('scroll', update)
  }, [scrollEl])

  return (
    <div
      className="absolute top-0 left-0 right-0 h-[2.5px] z-20 bg-slate-100"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-purple-500 to-brand-400 transition-[width] duration-100 ease-out origin-left"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

// ─── Sidebar nav item ──────────────────────────────────────────────────────
function PreviewNavItem({
  section,
  activeSectionId,
  index,
  depth,
  onNavigate,
}: {
  section: CourseSection
  activeSectionId: string
  index: number
  depth: number
  onNavigate: (id: string) => void
}) {
  const isActive = activeSectionId === section.id

  return (
    <div className={cn(depth > 0 && 'ml-2.5 mt-0.5')}>
      <button
        type="button"
        onClick={() => onNavigate(section.id)}
        className={cn(
          'relative w-full text-left rounded-xl flex items-center gap-2.5 transition-all duration-200 group',
          depth === 0 ? 'px-3 py-2.5' : 'px-2.5 py-1.5',
          isActive
            ? 'bg-white/[0.13] text-white'
            : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75',
        )}
      >
        {/* Active left indicator */}
        <span
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-white/80 transition-all duration-300 ease-out',
            isActive ? 'h-5 opacity-100' : 'h-0 opacity-0',
          )}
        />

        {depth === 0 && (
          <span
            className={cn(
              'shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-200',
              isActive
                ? 'bg-white/[0.18] text-white'
                : 'bg-white/[0.06] text-white/30 group-hover:bg-white/[0.1] group-hover:text-white/50',
            )}
          >
            {index + 1}
          </span>
        )}

        <span
          className={cn(
            'truncate leading-tight transition-colors',
            depth === 0 ? 'text-[11.5px] font-semibold' : 'text-[11px] font-medium',
          )}
        >
          {section.title}
        </span>
      </button>

      {/* Child nav items (depth 0 only) */}
      {depth === 0 &&
        section.children.map((child, ci) => (
          <PreviewNavItem
            key={child.id}
            section={child}
            activeSectionId={activeSectionId}
            index={ci}
            depth={1}
            onNavigate={onNavigate}
          />
        ))}
    </div>
  )
}

// ─── Section image card ───────────────────────────────────────────────────────
function SectionImageView({ image }: { image: SectionImage }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const src = `/api/storage/file?path=${encodeURIComponent(image.blobPath)}&source=artifacts`

  if (status === 'error') {
    return (
      <div className="my-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400">
        <ImageOff size={14} className="shrink-0" />
        <span className="text-[11.5px]">
          {image.caption || image.altText || image.fileName}
        </span>
      </div>
    )
  }

  return (
    <figure className="my-6">
      {/* Skeleton placeholder while loading */}
      {status === 'loading' && (
        <div className="skeleton w-full rounded-xl" style={{ aspectRatio: '16/9' }} />
      )}

      <img
        src={src}
        alt={image.altText || image.caption || image.fileName}
        loading="lazy"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'w-full h-auto rounded-xl block shadow-sm shadow-slate-200/80 transition-opacity duration-500',
          status === 'loaded' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none',
        )}
      />

      {status === 'loaded' && image.caption && (
        <figcaption className="mt-2.5 text-center text-[11.5px] text-slate-400 leading-relaxed px-4">
          {image.caption}
        </figcaption>
      )}
    </figure>
  )
}

// ─── Section renderer ──────────────────────────────────────────────────────
function PreviewSection({
  section,
  depth,
  index,
}: {
  section: CourseSection
  depth: number
  index: number
}) {
  return (
    <div
      id={`preview-${section.id}`}
      className={cn('preview-section', depth === 0 && 'mb-2 first:pt-0')}
      style={depth === 0 ? { animationDelay: `${index * 55}ms` } : undefined}
    >
      {/* ── Section heading ── */}
      {depth === 0 ? (
        <div className="mb-5 pt-8 first:pt-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-brand-400/70 tabular-nums select-none">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 h-px bg-slate-100" />
          </div>
          <h2 className="text-[20px] font-bold text-slate-900 leading-tight tracking-[-0.015em]">
            {section.title}
          </h2>
        </div>
      ) : (
        <h3 className="text-[14px] font-semibold text-slate-700 mb-3 mt-6 flex items-center gap-2">
          <span className="shrink-0 w-1 h-[14px] rounded-full bg-brand-300/70" />
          {section.title}
        </h3>
      )}

      {/* ── Learning objectives ── */}
      {section.sectionType === 'learning-objectives' ? (
        <ol className="space-y-3 mb-5">
          {section.learningObjectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-3 group">
              <span className="shrink-0 mt-[2px] w-[22px] h-[22px] rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shadow-brand-200/60 select-none">
                {i + 1}
              </span>
              <p className="text-[13.5px] text-slate-600 leading-[1.78] group-hover:text-slate-800 transition-colors duration-150">
                {obj}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        /* Prose content */
        <div className="space-y-3 mb-4">
          {section.content.split('\n').map((para, i) =>
            para.trim() ? (
              <p
                key={i}
                className="text-[13.5px] text-slate-600 leading-[1.82] tracking-[0.008em]"
              >
                {para}
              </p>
            ) : null,
          )}
        </div>
      )}

      {/* ── Section images ── */}
      {section.images && section.images.length > 0 && (
        <div className="space-y-0">
          {section.images.map((img) => (
            <SectionImageView key={img.id} image={img} />
          ))}
        </div>
      )}

      {/* ── Knowledge check badge ── */}
      {section.hasKnowledgeCheck && (
        <div className="mt-4 flex items-center gap-3 p-3.5 bg-gradient-to-r from-brand-50/80 to-violet-50/60 border border-brand-100 rounded-2xl shadow-sm shadow-brand-100/40">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center">
            <CheckSquare2 size={15} className="text-brand-600" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-brand-700 leading-tight">
              Knowledge Check
            </p>
            <p className="text-[11px] text-brand-400 mt-0.5">
              Practice questions follow this section
            </p>
          </div>
        </div>
      )}

      {/* ── Top-level divider ── */}
      {depth === 0 && (
        <div className="mt-8 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="w-[3px] h-[3px] rounded-full bg-slate-200" />
          <div className="flex-1 h-px bg-slate-100" />
        </div>
      )}

      {/* ── Children ── */}
      {section.children.map((child, ci) => (
        <PreviewSection key={child.id} section={child} depth={depth + 1} index={ci} />
      ))}
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────
export function CoursePreviewModal({
  courseContent,
  onClose,
}: CoursePreviewModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [activeSectionId, setActiveSectionId] = useState(
    courseContent.sections[0]?.id ?? '',
  )

  // Feed scroll element to ReadingProgressBar after mount
  useEffect(() => {
    setScrollEl(scrollRef.current)
  }, [])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Scroll-spy: track which top-level section is in view
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function handleScroll() {
      const elRect = el!.getBoundingClientRect()
      let found = courseContent.sections[0]?.id

      for (const section of courseContent.sections) {
        const target = el!.querySelector(`#preview-${section.id}`)
        if (!target) continue
        const rect = target.getBoundingClientRect()
        if (rect.top - elRect.top < elRect.height * 0.42) {
          found = section.id
        }
      }

      if (found) setActiveSectionId(found)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [courseContent.sections])

  const navigateToSection = useCallback((id: string) => {
    setActiveSectionId(id)
    const target = scrollRef.current?.querySelector(`#preview-${id}`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-5 md:py-8 preview-backdrop">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Modal shell */}
      <div className="relative flex w-full max-w-5xl xl:max-w-[1100px] preview-modal"
        style={{
          height: 'min(calc(100vh - 4rem), 880px)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 40px 100px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className="hidden md:flex w-[232px] xl:w-[248px] shrink-0 flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(168deg, #1e1b4b 0%, #1a2240 45%, #0f172a 100%)',
          }}
        >
          {/* Ambient glow at top */}
          <div
            className="absolute top-0 left-0 w-[232px] xl:w-[248px] h-28 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 100%)',
            }}
            aria-hidden="true"
          />

          {/* Header */}
          <div className="relative px-4 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-[26px] h-[26px] rounded-lg bg-brand-500/20 border border-brand-400/15 flex items-center justify-center shrink-0">
                <BookOpen size={11} className="text-brand-300" />
              </div>
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25 select-none">
                Course Preview
              </span>
            </div>

            <h2 className="text-[12.5px] font-semibold text-white/90 leading-snug line-clamp-3 mb-3.5">
              {courseContent.courseTitle}
            </h2>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Layers size={9} className="text-white/20 shrink-0" />
                <span className="text-[10px] text-white/30 font-medium">
                  {courseContent.meta.sectionCount} sections
                </span>
              </div>
              <span className="w-px h-3 bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                <Clock size={9} className="text-white/20 shrink-0" />
                <span className="text-[10px] text-white/30 font-medium">
                  {courseContent.meta.estimatedReadTime}
                </span>
              </div>
            </div>
          </div>

          {/* Nav tree */}
          <nav className="flex-1 px-2.5 pt-3 pb-2 space-y-px overflow-y-auto preview-nav-scroll">
            {courseContent.sections.map((section, i) => (
              <PreviewNavItem
                key={section.id}
                section={section}
                activeSectionId={activeSectionId}
                index={i}
                depth={0}
                onNavigate={navigateToSection}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="relative shrink-0 px-3 py-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() => downloadCourseArtifact(courseContent.jobId)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-white/60 rounded-xl border border-white/[0.09] hover:bg-white/[0.09] hover:text-white/85 hover:border-white/[0.16] transition-all duration-200 active:scale-[0.98] group"
            >
              <Download
                size={11}
                className="group-hover:scale-110 transition-transform duration-150 shrink-0"
              />
              Download DOCX
            </button>
          </div>
        </aside>

        {/* ── Content area ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {/* Reading progress */}
          <ReadingProgressBar scrollEl={scrollEl} />

          {/* Top bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100/80 bg-white shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                {courseContent.courseTitle}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>{courseContent.meta.totalWordCount.toLocaleString()} words</span>
                <span className="mx-1 text-slate-200">·</span>
                <span>{courseContent.meta.estimatedReadTime} read</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all duration-150 active:scale-90"
            >
              <X size={13} />
            </button>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto preview-content-scroll"
          >
            <div className="max-w-[680px] mx-auto px-6 lg:px-10 xl:px-12">
              {courseContent.sections.map((section, i) => (
                <PreviewSection
                  key={section.id}
                  section={section}
                  depth={0}
                  index={i}
                />
              ))}
              {/* Bottom breathing room */}
              <div className="h-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
