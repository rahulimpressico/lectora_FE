/**
 * CoursePreviewPane — formatted read-only render of a CourseContent object.
 *
 * Extracted from CourseEditorModal so it can be used by any consumer that needs
 * a preview of a fully loaded course.  Mirrors the layout of CoursePreviewModal
 * but is designed to fill a flex container rather than a fixed overlay.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Download,
  BookOpen,
  Clock,
  Layers,
  CheckSquare2,
  ImageOff,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CourseContent, CourseSection, SectionImage } from '../../../types/editor'

// ─── Internal components ──────────────────────────────────────────────────────

function SectionImageView({ image }: { image: SectionImage }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const src = `/api/storage/file?path=${encodeURIComponent(image.blobPath)}&source=artifacts`

  if (status === 'error') {
    return (
      <div className="my-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400">
        <ImageOff size={14} className="shrink-0" />
        <span className="text-[11.5px]">{image.caption || image.altText || image.fileName}</span>
      </div>
    )
  }
  return (
    <figure className="my-6">
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

function PreviewSection({ section, depth, index }: { section: CourseSection; depth: number; index: number }) {
  return (
    <div
      id={`modal-preview-${section.id}`}
      className={cn('preview-section', depth === 0 && 'mb-2 first:pt-0')}
      style={depth === 0 ? { animationDelay: `${index * 55}ms` } : undefined}
    >
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
        <div className="space-y-3 mb-4">
          {section.content.split('\n').map((para, i) =>
            para.trim() ? (
              <p key={i} className="text-[13.5px] text-slate-600 leading-[1.82] tracking-[0.008em]">
                {para}
              </p>
            ) : null,
          )}
        </div>
      )}

      {section.images && section.images.length > 0 && (
        <div className="space-y-0">
          {section.images.map((img) => <SectionImageView key={img.id} image={img} />)}
        </div>
      )}

      {section.hasKnowledgeCheck && (
        <div className="mt-4 flex items-center gap-3 p-3.5 bg-gradient-to-r from-brand-50/80 to-violet-50/60 border border-brand-100 rounded-2xl shadow-sm shadow-brand-100/40">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center">
            <CheckSquare2 size={15} className="text-brand-600" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-brand-700 leading-tight">Knowledge Check</p>
            <p className="text-[11px] text-brand-400 mt-0.5">Practice questions follow this section</p>
          </div>
        </div>
      )}

      {depth === 0 && (
        <div className="mt-8 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="w-[3px] h-[3px] rounded-full bg-slate-200" />
          <div className="flex-1 h-px bg-slate-100" />
        </div>
      )}

      {section.children.map((child, ci) => (
        <PreviewSection key={child.id} section={child} depth={depth + 1} index={ci} />
      ))}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface CoursePreviewPaneProps {
  courseContent: CourseContent
  onDownload: () => void
}

export function CoursePreviewPane({ courseContent, onDownload }: CoursePreviewPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState(courseContent.sections[0]?.id ?? '')

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function handleScroll() {
      const elRect = el!.getBoundingClientRect()
      let found = courseContent.sections[0]?.id
      for (const section of courseContent.sections) {
        const target = el!.querySelector(`#modal-preview-${section.id}`)
        if (!target) continue
        const rect = target.getBoundingClientRect()
        if (rect.top - elRect.top < elRect.height * 0.42) found = section.id
      }
      if (found) setActiveSectionId(found)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [courseContent.sections])

  const navigateToSection = useCallback((id: string) => {
    setActiveSectionId(id)
    const target = scrollRef.current?.querySelector(`#modal-preview-${id}`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[220px] shrink-0 flex-col overflow-hidden"
        style={{ background: 'linear-gradient(168deg, #1e1b4b 0%, #1a2240 45%, #0f172a 100%)' }}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[24px] h-[24px] rounded-lg bg-brand-500/20 border border-brand-400/15 flex items-center justify-center shrink-0">
              <BookOpen size={10} className="text-brand-300" />
            </div>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25 select-none">
              Preview
            </span>
          </div>
          <h2 className="text-[12px] font-semibold text-white/90 leading-snug line-clamp-2 mb-3">
            {courseContent.courseTitle}
          </h2>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <Layers size={9} className="text-white/20 shrink-0" />
              <span className="text-[10px] text-white/30 font-medium">{courseContent.meta.sectionCount} sections</span>
            </div>
            <span className="w-px h-3 bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <Clock size={9} className="text-white/20 shrink-0" />
              <span className="text-[10px] text-white/30 font-medium">{courseContent.meta.estimatedReadTime}</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2.5 pt-3 pb-2 space-y-px overflow-y-auto">
          {courseContent.sections.map((section, i) => {
            const isActive = activeSectionId === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => navigateToSection(section.id)}
                className={cn(
                  'relative w-full text-left rounded-xl flex items-center gap-2.5 px-3 py-2.5 transition-all duration-200',
                  isActive ? 'bg-white/[0.13] text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75',
                )}
              >
                <span className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-white/80 transition-all duration-300',
                  isActive ? 'h-5 opacity-100' : 'h-0 opacity-0',
                )} />
                <span className={cn(
                  'shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-200',
                  isActive ? 'bg-white/[0.18] text-white' : 'bg-white/[0.06] text-white/30',
                )}>
                  {i + 1}
                </span>
                <span className="truncate text-[11.5px] font-semibold leading-tight">{section.title}</span>
              </button>
            )
          })}
        </nav>
        <div className="relative shrink-0 px-3 py-3 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-white/60 rounded-xl border border-white/[0.09] hover:bg-white/[0.09] hover:text-white/85 hover:border-white/[0.16] transition-all duration-200 active:scale-[0.98]"
          >
            <Download size={11} className="shrink-0" />
            Download DOCX
          </button>
        </div>
      </aside>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-[680px] mx-auto px-6 lg:px-10 xl:px-12">
          {courseContent.sections.map((section, i) => (
            <PreviewSection key={section.id} section={section} depth={0} index={i} />
          ))}
          <div className="h-16" />
        </div>
      </div>
    </div>
  )
}
