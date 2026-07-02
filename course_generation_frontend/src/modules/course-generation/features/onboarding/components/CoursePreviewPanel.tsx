import { useState } from 'react'
import { BookOpen, CheckCircle2, ChevronRight, Clock, FileText, GraduationCap, Target, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useCourseStore } from '../../../store/courseStore'
import type { JsonObject } from '../../../types'

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const cardEnter = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

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

// Handles all field-name variants the backend may use for sub-topics/lessons.
const TOPIC_KEYS = [
  'sub_topics', 'subtopics', 'sub_topic', 'subtopic',
  'topics', 'topic_list', 'lessons', 'lesson_list',
  'sub_title', 'subtitle',
] as const

function getSectionTopics(section: JsonObject): string[] {
  for (const key of TOPIC_KEYS) {
    if (!(key in section)) continue
    const val = section[key]
    if (typeof val === 'string') return val ? [val] : []
    if (Array.isArray(val)) {
      return (val as unknown[])
        .map((item) => {
          if (typeof item === 'string') return item
          if (item !== null && typeof item === 'object') {
            const obj = item as JsonObject
            for (const k of ['title', 'name', 'topic', 'sub_topic', 'label', 'text']) {
              if (typeof obj[k] === 'string' && obj[k]) return obj[k] as string
            }
          }
          return ''
        })
        .filter(Boolean)
    }
  }
  return []
}

// ── Component ────────────────────────────────────────────────────────────────

export const CoursePreviewPanel = () => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  function toggleSection(idx: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

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

  const trimmedTitle = courseTitle.trim()

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
          {/* "Live" dot — keep existing animate-pulse */}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-emerald-600">Live</span>
        </div>
      </div>

      {/* ── Scrollable LMS course page ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Course hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-7 pt-8 pb-9">

          {/* Course type chip — AnimatePresence so it fades in/out */}
          <AnimatePresence mode="wait">
            {courseTypeHint.trim() && (
              <motion.div
                key="type-chip"
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit="hidden"
                style={{ willChange: 'transform' }}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/15 text-[11px] font-semibold text-white/90 mb-4 tracking-wide"
              >
                {courseTypeHint}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course title — re-enters when it changes from placeholder to real text */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={trimmedTitle || '__placeholder__'}
              variants={scaleIn}
              initial="hidden"
              animate="show"
              exit="hidden"
              style={{ willChange: 'transform' }}
              className="text-xl font-bold text-white leading-snug mb-3 min-h-[2rem]"
            >
              {trimmedTitle || (
                <span className="text-white/30 font-normal italic text-base">Your course title here…</span>
              )}
            </motion.h1>
          </AnimatePresence>

          {/* Description — AnimatePresence keyed on presence */}
          <AnimatePresence>
            {description.trim() && (
              <motion.p
                key="description"
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="text-white/70 text-sm leading-relaxed mb-5"
              >
                {description}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Stats row — stagger each badge */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            {durationHours ? (
              <motion.div
                variants={fadeUp}
                style={{ willChange: 'transform' }}
                className="flex items-center gap-1.5 text-white/60 text-xs"
              >
                <Clock className="w-3.5 h-3.5" />
                {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
              </motion.div>
            ) : (
              <motion.div
                variants={fadeUp}
                style={{ willChange: 'transform' }}
                className="text-white/25 text-xs italic"
              >
                Duration not set
              </motion.div>
            )}
            {difficultyLevel && (
              <motion.div
                variants={fadeUp}
                style={{ willChange: 'transform' }}
                className="flex items-center gap-1.5 text-white/60 text-xs"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {capitalize(difficultyLevel)} level
              </motion.div>
            )}
            {docsCount > 0 && (
              <motion.div
                variants={fadeUp}
                style={{ willChange: 'transform' }}
                className="flex items-center gap-1.5 text-white/60 text-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                {docsCount} source {docsCount === 1 ? 'doc' : 'docs'}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ── Main content area ── */}
        <div className="px-5 py-5 space-y-4">

          {/* Who this is for — slides in when audience appears */}
          <AnimatePresence>
            {audience.trim() && (
              <motion.div
                key="audience-card"
                layout
                variants={cardEnter}
                initial="hidden"
                animate="show"
                exit="hidden"
                style={{ willChange: 'transform' }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Who this is for
                  </h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {audience}
                </p>
                {wizardData.experienceLevel && (
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold">
                      {capitalize(wizardData.experienceLevel)} level
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* What you'll learn — slides in when objectives appear */}
          <AnimatePresence>
            {objectives.length > 0 && (
              <motion.div
                key="objectives-card"
                layout
                variants={cardEnter}
                initial="hidden"
                animate="show"
                exit="hidden"
                style={{ willChange: 'transform' }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    What you'll learn
                  </h3>
                </div>
                {/* Objectives grid — staggered items */}
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className={cn('gap-2.5', objectives.length > 3 ? 'grid grid-cols-2' : 'flex flex-col')}
                >
                  {objectives.slice(0, 8).map((obj, i) => (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      style={{ willChange: 'transform' }}
                      className="flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-px" />
                      <span className="text-xs text-slate-600 leading-snug">{obj}</span>
                    </motion.div>
                  ))}
                </motion.div>
                {objectives.length > 8 && (
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    +{objectives.length - 8} more learning objectives
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course content — real sections with stagger */}
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
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {sections.slice(0, 12).map((section, i) => {
                  const topics = getSectionTopics(section)
                  const hasTopics = topics.length > 0
                  const isExpanded = expandedSections.has(i)

                  return (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      style={{ willChange: 'transform' }}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      {/* ── Section header row (clickable when sub-topics exist) ── */}
                      <div
                        role={hasTopics ? 'button' : undefined}
                        tabIndex={hasTopics ? 0 : undefined}
                        onClick={() => hasTopics && toggleSection(i)}
                        onKeyDown={(e) => {
                          if (hasTopics && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            toggleSection(i)
                          }
                        }}
                        aria-expanded={hasTopics ? isExpanded : undefined}
                        className={cn(
                          'px-4 py-3.5 flex items-center gap-3.5 transition-colors duration-150',
                          hasTopics
                            ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100'
                            : 'cursor-default',
                          isExpanded && 'bg-slate-50',
                        )}
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
                          {hasTopics && (
                            <p className="text-[10px] text-indigo-400 mt-0.5">
                              {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
                            </p>
                          )}
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          style={{ flexShrink: 0 }}
                        >
                          <ChevronRight className={cn('w-4 h-4', hasTopics ? 'text-slate-400' : 'text-slate-200')} />
                        </motion.div>
                      </div>

                      {/* ── Sub-topics accordion ── */}
                      <AnimatePresence initial={false}>
                        {isExpanded && hasTopics && (
                          <motion.div
                            key="topics"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="border-t border-slate-100 px-4 pt-3 pb-3.5 space-y-2.5">
                              {topics.map((topic, j) => (
                                <motion.div
                                  key={j}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: j * 0.04, duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                  className="flex items-start gap-2.5"
                                >
                                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-200 mt-1.5" />
                                  <span className="text-xs text-slate-600 leading-relaxed">{topic}</span>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
                {sections.length > 12 && (
                  <p className="text-xs text-slate-400 text-center py-1">
                    +{sections.length - 12} more sections
                  </p>
                )}
              </motion.div>
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
                      {/* Skeleton bars with staggered animate-pulse delay */}
                      <div
                        className="h-3 rounded-md bg-slate-100 animate-pulse"
                        style={{ width: `${w * 4}px`, animationDelay: `${i * 0.1}s` }}
                      />
                      <div
                        className="h-2 rounded-md bg-slate-50 animate-pulse"
                        style={{ width: `${w * 2.6}px`, animationDelay: `${i * 0.1}s` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center italic pt-3">
                Module list appears after structure generation
              </p>
            </div>
          )}

          {/* Empty state — scaleIn when nothing is filled in */}
          <AnimatePresence>
            {!hasAnyContent && (
              <motion.div
                key="empty-state"
                variants={scaleIn}
                initial="hidden"
                animate="show"
                exit="hidden"
                style={{ willChange: 'transform' }}
                className="flex flex-col items-center justify-center gap-5 py-16 text-center"
              >
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
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
