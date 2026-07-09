import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SubTopicsEditor } from '../../../review/components/training-outline/SubTopicsEditor'
import {
  getSectionSubTopics,
  getSectionSubTopicsKey,
  getSectionTitleKey,
} from '../../../review/components/training-outline/helpers'
import { resolveSectionsKey, getOutlineSections, getSectionTitle, getSectionMeta } from '../utils'
import type { OutlineSectionsEditorProps } from '../types'

export function OutlineSectionsEditor({
  toData,
  isEditing,
  expandedSections,
  onToggleSection,
  onUpdate,
}: OutlineSectionsEditorProps) {
  const sectionsKey = resolveSectionsKey(toData)
  const sections = getOutlineSections(toData)

  const handleSubTopicsChange = useCallback(
    (sectionIdx: number, subTopicsKey: string, updated: string[]) => {
      onUpdate([sectionsKey, String(sectionIdx), subTopicsKey], updated)
    },
    [onUpdate, sectionsKey],
  )

  if (sections.length === 0) return null

  return (
    <div className="space-y-2">
      {sections.map((section, i) => {
        const titleKey = getSectionTitleKey(section)
        const subTopicsKey = getSectionSubTopicsKey(section)
        const title = getSectionTitle(section)
        const subTopics = getSectionSubTopics(section)
        const hasSubTopics = subTopics.length > 0
        const isExpanded = expandedSections.has(i)
        const canExpand = isEditing

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, delay: Math.min(i, 10) * 0.04 }}
            className="bg-white border border-border rounded-xl overflow-hidden"
            style={{ willChange: 'transform' }}
          >
            <div
              role={canExpand ? 'button' : undefined}
              tabIndex={canExpand ? 0 : undefined}
              onClick={() => canExpand && onToggleSection(i)}
              onKeyDown={(e) => {
                if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onToggleSection(i)
                }
              }}
              aria-expanded={canExpand ? isExpanded : undefined}
              className={cn(
                'flex items-center justify-between gap-3 p-4 transition-colors',
                canExpand && 'cursor-pointer hover:bg-slate-50/80',
                isExpanded && canExpand && 'bg-slate-50/60 border-b border-border',
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0 w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
                  {hasSubTopics && !isExpanded && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {subTopics.length} {subTopics.length === 1 ? 'sub-topic' : 'sub-topics'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getSectionMeta(section) && (
                  <span className="text-xs text-slate-400 hidden sm:inline">{getSectionMeta(section)}</span>
                )}
                {canExpand && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </motion.div>
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isEditing && isExpanded && (
                <motion.div
                  key="editor"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="p-4 pt-3 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Chapter Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) =>
                          onUpdate([sectionsKey, String(i), titleKey], e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Chapter title…"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                    <div className="border-t border-slate-100" />
                    <div onClick={(e) => e.stopPropagation()}>
                      <SubTopicsEditor
                        subTopics={subTopics}
                        onChange={(updated) => handleSubTopicsChange(i, subTopicsKey, updated)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
