import { BookOpen, CheckCircle2, ChevronRight, Clock, FileText, GraduationCap, Target, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCourseStore } from '../../store/courseStore'
import type { JsonObject } from '../../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSections(toData: JsonObject): JsonObject[] {
  const s = toData.sections ?? toData.modules
  return Array.isArray(s) ? (s as JsonObject[]) : []
}

function getSectionTitle(section: JsonObject): string {
  return (
    (section.title as string | undefined) ??
    (section.name as string | undefined) ??
    'Untitled Section'
  )
}

function getSectionMeta(section: JsonObject): string {
  const wc = section.word_count ?? section.wordCount
  const mins = section.minutes ?? section.duration_minutes
  const parts: string[] = []
  if (typeof wc === 'number') parts.push(`${wc.toLocaleString()} words`)
  if (typeof mins === 'number') parts.push(`${mins} min`)
  return parts.join(' · ')
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Component ────────────────────────────────────────────────────────────────

export const CoursePreviewPanel = () => {
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint)
  const durationHours = useCourseStore((s) => s.durationHours)
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel)
  const audience = useCourseStore((s) => s.audience)
  const rawDocuments = useCourseStore((s) => s.rawDocuments)
  const wizardData = useCourseStore((s) => s.wizardData)
  const toData = useCourseStore((s) => s.toData)

  const description = wizardData.description
  const objectives = wizardData.objectives
  const docsCount = rawDocuments.filter((d) => d.status === 'success').length
  const sections = toData ? getSections(toData) : []

  const hasAnyContent = !!(
    courseTitle.trim() ||
    description.trim() ||
    audience.trim() ||
    objectives.length ||
    sections.length
  )

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">

      {/* ── Simulated browser chrome bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="h-4 w-px bg-slate-100" />
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
            lms.example.com / my-courses
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-emerald-600">Live</span>
        </div>
      </div>

      {/* ── Scrollable LMS course page ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Course hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-7 pt-8 pb-9">
          {courseTypeHint.trim() && (
            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/15 text-[11px] font-semibold text-white/90 mb-4 tracking-wide">
              {courseTypeHint}
            </div>
          )}

          <h1 className="text-xl font-bold text-white leading-snug mb-3 min-h-[2rem]">
            {courseTitle.trim() || (
              <span className="text-white/30 font-normal italic text-base">Your course title here…</span>
            )}
          </h1>

          {description.trim() && (
            <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-lg">
              {description.length > 160 ? description.slice(0, 160) + '…' : description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {durationHours ? (
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <Clock className="w-3.5 h-3.5" />
                {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
              </div>
            ) : (
              <div className="text-white/25 text-xs italic">Duration not set</div>
            )}
            {difficultyLevel && (
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <GraduationCap className="w-3.5 h-3.5" />
                {capitalize(difficultyLevel)} level
              </div>
            )}
            {docsCount > 0 && (
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <FileText className="w-3.5 h-3.5" />
                {docsCount} source {docsCount === 1 ? 'doc' : 'docs'}
              </div>
            )}
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="px-5 py-5 space-y-4">

          {/* Who this is for */}
          {audience.trim() && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Who this is for
                </h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {audience.length > 160 ? audience.slice(0, 160) + '…' : audience}
              </p>
              {wizardData.experienceLevel && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold">
                    {capitalize(wizardData.experienceLevel)} level
                  </span>
                </div>
              )}
            </div>
          )}

          {/* What you'll learn */}
          {objectives.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  What you'll learn
                </h3>
              </div>
              <div className={cn('gap-2.5', objectives.length > 3 ? 'grid grid-cols-2' : 'flex flex-col')}>
                {objectives.slice(0, 8).map((obj, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-px" />
                    <span className="text-xs text-slate-600 leading-snug">{obj}</span>
                  </div>
                ))}
              </div>
              {objectives.length > 8 && (
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                  +{objectives.length - 8} more learning objectives
                </p>
              )}
            </div>
          )}

          {/* Course content — real sections */}
          {sections.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1 mb-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Course Content
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {sections.length} sections
                </span>
              </div>
              <div className="space-y-2">
                {sections.slice(0, 12).map((section, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3.5 flex items-center gap-3.5 hover:border-indigo-200 hover:shadow-md transition-all duration-150 cursor-default"
                  >
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-500 font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {getSectionTitle(section)}
                      </p>
                      {getSectionMeta(section) && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{getSectionMeta(section)}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                ))}
                {sections.length > 12 && (
                  <p className="text-xs text-slate-400 text-center py-1">
                    +{sections.length - 12} more sections
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Skeleton — content exists but no TO yet */}
          {hasAnyContent && sections.length === 0 && (
            <div>
              <div className="flex items-center gap-2 px-1 mb-2.5">
                <BookOpen className="w-4 h-4 text-slate-300" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                  Course Content
                </h3>
              </div>
              <div className="space-y-2">
                {([50, 38, 44] as const).map((w, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3.5"
                  >
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300 font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded-md bg-slate-100" style={{ width: `${w * 4}px` }} />
                      <div className="h-2 rounded-md bg-slate-50" style={{ width: `${w * 2.6}px` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center italic pt-3">
                Module list appears after outline generation
              </p>
            </div>
          )}

          {/* Empty state — nothing filled in yet */}
          {!hasAnyContent && (
            <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400">
                  Your course preview will appear here
                </p>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-[240px] mx-auto">
                  Fill in the steps on the left and this panel syncs in real time.
                </p>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
