import { useLocation } from 'react-router-dom'
import { ChevronRight, Bell, Search } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  '/':         'Dashboard',
  '/generate': 'Course Generation',
  '/settings': 'Settings',
  '/help':     'Help',
}

export function TopBar() {
  const { pathname } = useLocation()
  const label = ROUTE_LABELS[pathname] ?? 'Page'

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-xl px-6 shrink-0 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-400">AI Course Builder</span>
        <ChevronRight size={13} className="text-slate-300" />
        <span className="font-semibold text-slate-800">{label}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Search trigger */}
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 text-xs text-slate-400 hover:border-slate-300 hover:bg-slate-100 transition-all duration-150"
        >
          <Search size={12} />
          <span className="hidden sm:inline">Search…</span>
          <span className="hidden sm:inline ml-1 text-[10px] font-medium bg-slate-200 text-slate-500 rounded px-1 py-px">⌘K</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150 hover:scale-105"
        >
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_0_1.5px_white]" />
        </button>

        {/* User avatar */}
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 ring-2 ring-white shadow-sm cursor-pointer hover:scale-105 transition-transform duration-150 ml-1" />
      </div>
    </header>
  )
}
