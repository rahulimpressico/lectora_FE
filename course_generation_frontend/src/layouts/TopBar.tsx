import { useLocation, Link } from 'react-router-dom'
import { ChevronRight, Bell, Search, Menu } from 'lucide-react'
import { cn } from '@/lib/cn'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/generate':           'Course Generation',
  '/assert_library':     'Asset Library',
  '/documents_library':  'Documents Library',
  '/settings':           'Settings',
  '/help':               'Help',
}

interface TopBarProps {
  onMenuClick?: () => void
  translucent?: boolean
}

export function TopBar({ onMenuClick, translucent = false }: TopBarProps) {
  const { pathname } = useLocation()
  const label = ROUTE_LABELS[pathname] ?? 'Page'

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center justify-between px-4 sm:px-6',
        translucent
          ? 'border-b border-white/45 bg-white/50 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.4)]'
          : 'border-b border-slate-200/50 bg-white/88 shadow-[0_1px_0_0_rgba(0,0,0,0.035),0_2px_8px_-2px_rgba(0,0,0,0.03)] backdrop-blur-2xl',
      )}
    >

      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 text-sm min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/80 hover:text-slate-700 transition-all duration-150 active:scale-95"
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>
        )}
        <Link
          to="/"
          className="hidden sm:inline font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150 text-xs"
        >
          Course Studio
        </Link>
        <ChevronRight size={12} className="hidden sm:inline text-slate-300/80" />
        <span className="font-semibold text-slate-800 truncate text-sm tracking-tight">{label}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 text-xs text-slate-400 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-600 transition-all duration-200"
        >
          <Search size={12} />
          <span className="hidden sm:inline">Search…</span>
          <span className="hidden sm:inline ml-1 text-[10px] font-semibold bg-slate-200/80 text-slate-500 rounded-md px-1.5 py-px tracking-tight">⌘K</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100/80 hover:text-slate-700 transition-all duration-150 hover:scale-105 active:scale-95"
        >
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_0_1.5px_white]" />
        </button>

        {/* User avatar */}
        <div className="ml-1 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 ring-2 ring-white shadow-[0_2px_8px_rgba(99,102,241,0.25)] cursor-pointer hover:scale-105 hover:shadow-[0_3px_14px_rgba(99,102,241,0.35)] transition-all duration-200 active:scale-95" />
      </div>
    </header>
  )
}
