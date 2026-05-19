import { cn } from '@/lib/cn'
import { useEditorStore } from '../../store/editorStore'
import type { CourseSection } from '../../types/editor'

interface SectionNavigationProps {
  sections: CourseSection[]
  activeSectionId: string | null
}

interface NavItemProps {
  section: CourseSection
  activeSectionId: string | null
  depth: number
}

function NavItem({ section, activeSectionId, depth }: NavItemProps) {
  const { setActiveSectionId, expandSection, expandedSectionIds } = useEditorStore()
  const isActive = activeSectionId === section.id
  const isExpanded = expandedSectionIds.has(section.id)

  function handleClick() {
    setActiveSectionId(section.id)
    expandSection(section.id)
    // Scroll section into view
    const el = document.getElementById(`section-${section.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        title={section.title}
        className={cn(
          'w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 flex items-center gap-2 group',
          depth === 0 ? 'font-semibold' : 'font-medium',
          isActive
            ? 'bg-brand-50 text-brand-700 border border-brand-200'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent',
          depth > 0 && 'pl-5',
        )}
      >
        {/* Accent dot */}
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0 transition-colors',
            isActive ? 'bg-brand-500' : 'bg-slate-300 group-hover:bg-slate-400',
          )}
        />
        <span className="truncate">{section.title}</span>

        {section.hasKnowledgeCheck && (
          <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-brand-400" title="Knowledge Check" />
        )}
      </button>

      {/* Children */}
      {section.children.length > 0 && isExpanded && (
        <div className="mt-0.5">
          {section.children.map((child) => (
            <NavItem
              key={child.id}
              section={child}
              activeSectionId={activeSectionId}
              depth={depth + 1}
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
        {sections.map((section) => (
          <NavItem
            key={section.id}
            section={section}
            activeSectionId={activeSectionId}
            depth={0}
          />
        ))}
      </nav>
    </aside>
  )
}
