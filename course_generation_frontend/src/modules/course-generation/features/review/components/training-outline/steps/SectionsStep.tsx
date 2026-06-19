import { useCallback } from 'react'
import {
  getSections,
  getSectionTitleKey,
  getSectionSubTopicsKey,
  getSectionSubTopics,
  getStr,
} from '../helpers'
import { SubTopicsEditor } from '../SubTopicsEditor'
import type { JsonObject, JsonValue } from '../helpers'

interface SectionsStepProps {
  localTO: JsonObject
  onChange: (path: string[], value: JsonValue) => void
}

export const SectionsStep = ({ localTO, onChange }: SectionsStepProps) => {
  const sections = getSections(localTO)

  const handleSubTopicsChange = useCallback(
    (sectionIdx: number, subTopicsKey: string, updated: string[]) => {
      onChange(['sections', String(sectionIdx), subTopicsKey], updated)
    },
    [onChange],
  )

  if (sections.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic text-center py-8">
        No sections found in the training outline.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        Edit section titles and manage sub-topics. Use the arrows to reorder sub-topics within a
        section.
      </p>

      {sections.map((section, i) => {
        const titleKey     = getSectionTitleKey(section)
        const subTopicsKey = getSectionSubTopicsKey(section)
        const title        = getStr(section, titleKey) || `Section ${i + 1}`
        const subTopics    = getSectionSubTopics(section)

        return (
          <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Live-preview header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[11px] font-bold shadow-sm">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-800 leading-snug truncate">{title}</p>
                {subTopics.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {subTopics.slice(0, 3).join(' · ')}
                    {subTopics.length > 3 && ` +${subTopics.length - 3} more`}
                  </p>
                )}
              </div>
            </div>

            {/* Editable body */}
            <div className="p-4 space-y-4 bg-white">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Section Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onChange(['sections', String(i), titleKey], e.target.value)}
                  placeholder="Section title…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                />
              </div>

              <div className="border-t border-slate-100" />

              {/* Sub-topics */}
              <SubTopicsEditor
                subTopics={subTopics}
                onChange={(updated) => handleSubTopicsChange(i, subTopicsKey, updated)}
              />
            </div>
          </div>
        )
      })}

    </div>
  )
}
