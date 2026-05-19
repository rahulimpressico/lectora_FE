import { NavLink } from 'react-router-dom'
import { Sparkles, LayoutDashboard, Settings, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/generate', label: 'Generate',  icon: Sparkles        },
]

const bottomItems = [
  { to: '/settings', label: 'Settings', icon: Settings   },
  { to: '/help',     label: 'Help',     icon: HelpCircle },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-200/80 bg-white shrink-0 shadow-[1px_0_0_0_rgba(0,0,0,0.03)]">

      {/* Brand mark */}
      <div className="flex items-center gap-3 px-5 py-[18px] border-b border-slate-100">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_2px_10px_0_rgb(99,102,241,0.45)] shrink-0">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">
            Lectora AI
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide">
            Course Engine
          </p>
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-indigo-50 to-violet-50/60 text-indigo-700 shadow-[inset_2px_0_0_0_rgb(99,102,241)]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  className={isActive ? 'text-indigo-600' : 'text-slate-400'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Secondary navigation */}
      <div className="space-y-0.5 px-3 py-3 border-t border-slate-100">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-indigo-50 to-violet-50/60 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  className={isActive ? 'text-indigo-600' : 'text-slate-400'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User profile */}
      <div className="px-4 py-3.5 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shrink-0 ring-2 ring-white shadow-sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate leading-none">
              Course Author
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">Impressico</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
