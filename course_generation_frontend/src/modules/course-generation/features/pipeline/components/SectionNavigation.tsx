import { useEffect } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '../../../store/editorStore'
import type { CourseSection } from '../../../types/editor'

interface SectionNavigationProps {
  sections: CourseSection[]
  activeSectionId: string | null
}

interface NavItemProps {
  section: CourseSection
  activeSectionId: string | null
  depth: number
  index: number
}

function NavItem({ section, activeSectionId, depth, index }: NavItemProps) {
  const { setActiveSectionId, expandSection, collapseSection, expandedSectionIds, sectionEditStates } =
    useEditorStore()
  const isActive = activeSectionId === section.id
  const isExpanded = expandedSectionIds.has(section.id)
  const isDirty = sectionEditStates.get(section.id)?.isDirty ?? false
  const hasChildren = section.children.length > 0

  function handleClick() {
    setActiveSectionId(section.id)
    if (hasChildren) {
      if (isExpanded) {
        collapseSection(section.id)
      } else {
        expandSection(section.id)
      }
    } else {
      expandSection(section.id)
    }
    const el = document.getElementById(`section-${section.id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        title={section.title}
        className={cn(
          'w-full text-left rounded-lg text-xs transition-all duration-150 flex items-center gap-2 group',
          depth === 0
            ? 'px-3 py-2 font-semibold'
            : 'px-3 py-1.5 pl-6 font-medium',
          isActive
            ? 'bg-brand-50 text-brand-700 border border-brand-200'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent',
        )}
      >
        {/* Section number pill for L1 */}
        {depth === 0 && (
          <span
            className={cn(
              'shrink-0 flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold',
              isActive
                ? 'bg-brand-200 text-brand-800'
                : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300',
            )}
          >
            {index + 1}
          </span>
        )}

        {/* Accent dot for L2+ */}
        {depth > 0 && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full shrink-0 transition-colors',
              isActive ? 'bg-brand-500' : 'bg-slate-300 group-hover:bg-slate-400',
            )}
          />
        )}

        <span className="truncate flex-1">{section.title}</span>

        {isDirty && (
          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
        )}
        {section.hasKnowledgeCheck && !isDirty && (
          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-brand-400" title="Knowledge Check" />
        )}

        {/* Expand/collapse chevron for sections with children */}
        {hasChildren && depth === 0 && (
          <ChevronRight
            size={11}
            className={cn(
              'shrink-0 transition-transform duration-200',
              isActive ? 'text-brand-500' : 'text-slate-300 group-hover:text-slate-500',
              isExpanded && 'rotate-90',
            )}
          />
        )}
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-0.5 border-l border-slate-100 ml-5">
          {section.children.map((child, ci) => (
            <NavItem
              key={child.id}
              section={child}
              activeSectionId={activeSectionId}
              depth={depth + 1}
              index={ci}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SectionNavigation({
  sections,
  activeSectionId,
}: SectionNavigationProps) {
  const { addSection, expandSection } = useEditorStore()

  // Auto-expand L1 sections that have subtopics so the hierarchy is visible
  const sectionIdsKey = sections.map((s) => s.id).join(',')
  useEffect(() => {
    for (const section of sections) {
      if (section.children.length > 0) {
        expandSection(section.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdsKey])

  return (
    <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col border-r border-slate-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Course Structure
        </p>
      </div>

      {/* Nav tree */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {sections.map((section, i) => (
          <NavItem
            key={section.id}
            section={section}
            activeSectionId={activeSectionId}
            depth={0}
            index={i}
          />
        ))}
      </nav>

      {/* Add section shortcut */}
      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => addSection()}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-dashed border-slate-200 text-[11px] font-medium text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all"
        >
          <Plus size={12} />
          Add Section
        </button>
      </div>
    </aside>
  )
}
