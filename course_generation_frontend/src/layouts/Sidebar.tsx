import { NavLink, useNavigate } from "react-router-dom";
import {
  Sparkles,
  LayoutDashboard,
  Database,
  FileUp,
  // Settings,
  // HelpCircle,
  X,
  CircleDollarSign,
  // ListTodo,
  // Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/shared/components/Logo";
// Tasks/Settings/Help sidebar section disabled — see below. `useToTasks()` fired
// GET /documents/generate-to/jobs unconditionally on every mount of this
// always-rendered sidebar, which showed up as an unwanted automatic API call.
// import { useToTasks } from "@/modules/course-generation/features/upload/hooks/useToTasks";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/generate", label: "Generate", icon: Sparkles },
  { to: "/assert_library", label: "Asset Library", icon: Database },
  { to: "/documents_library", label: "Documents", icon: FileUp },
  { to: "/costing", label: "Costing", icon: CircleDollarSign },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  translucent?: boolean;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onTasksClick?: () => void;
  isSettingsOpen?: boolean;
  isHelpOpen?: boolean;
  isTasksOpen?: boolean;
}

function SidebarContent({
  onClose,
  translucent = false,
  // onSettingsClick, onHelpClick, onTasksClick, isSettingsOpen, isHelpOpen,
  // isTasksOpen intentionally not destructured — the Tasks/Settings/Help
  // button section that consumed them is disabled below. Still declared on
  // the prop type so AppLayout's wiring doesn't need to change if this is
  // re-enabled later.
}: {
  onClose?: () => void;
  translucent?: boolean;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onTasksClick?: () => void;
  isSettingsOpen?: boolean;
  isHelpOpen?: boolean;
  isTasksOpen?: boolean;
}) {
  const navigate = useNavigate();
  // const { runningCount } = useToTasks();

  // const bottomButtons = [
  //   {
  //     label: "Tasks",
  //     icon: ListTodo,
  //     onClick: onTasksClick,
  //     isActive: isTasksOpen,
  //     badge: runningCount > 0 ? runningCount : null,
  //   },
  //   {
  //     label: "Settings",
  //     icon: Settings,
  //     onClick: onSettingsClick,
  //     isActive: isSettingsOpen,
  //     badge: null,
  //   },
  //   {
  //     label: "Help",
  //     icon: HelpCircle,
  //     onClick: onHelpClick,
  //     isActive: isHelpOpen,
  //     badge: null,
  //   },
  // ];

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col shadow-[1px_0_0_0_rgba(0,0,0,0.02)]",
        translucent
          ? "border-r border-white/45 bg-white/48 backdrop-blur-xl"
          : "glass-sidebar",
      )}
    >
      {/* Brand mark */}
      <div
        className={cn(
          "flex items-center gap-4 border-b px-3 py-[18px]",
          translucent ? "border-white/40" : "border-slate-100/70",
        )}
      >
        <Logo className="text-xl shrink-0" />

        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Course<span className="text-indigo-600"> Studio</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide">
            Course Generation Platform
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex lg:hidden h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 shrink-0"
            aria-label="Close menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400/80">
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-50 to-violet-50/70 text-indigo-700 shadow-[inset_2px_0_0_0_#6366f1,0_1px_4px_rgba(99,102,241,0.08)]"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  className={
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Secondary navigation — Settings & Help as panel triggers */}
      {/* Tasks/Settings/Help section disabled — see comments above.
      <div
        className={cn(
          "space-y-0.5 border-t px-3 py-3",
          translucent ? "border-white/40" : "border-slate-100",
        )}
      >
        {bottomButtons.map(
          ({ label, icon: Icon, onClick, isActive, badge }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onClose?.();
                onClick?.();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-indigo-50 to-violet-50/60 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <Icon
                size={15}
                className={isActive ? "text-indigo-600" : "text-slate-400"}
              />
              <span className="flex-1 text-left">{label}</span>
              {badge != null && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                  <Loader2 size={7} className="animate-spin" />
                  {badge}
                </span>
              )}
            </button>
          ),
        )}
      </div>
      */}

      {/* User profile */}
      <div
        className={cn(
          "border-t px-4 py-3.5",
          translucent
            ? "border-white/40 bg-white/25"
            : "border-slate-100/70 bg-slate-50/40",
        )}
      >
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shrink-0 ring-2 ring-white shadow-[0_2px_8px_rgba(99,102,241,0.25)]">
            <User size={13} className="text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate leading-none">
              Course Author
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
              @ Impressico
            </p>
          </div>
          <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
            <div className="h-2.5 w-0.5 bg-slate-300 rounded-full" />
            <div className="h-0.5 w-0.5 bg-slate-300 rounded-full ml-0.5" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  translucent = false,
  onSettingsClick,
  onHelpClick,
  onTasksClick,
  isSettingsOpen,
  isHelpOpen,
  isTasksOpen,
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden h-full lg:flex">
        <SidebarContent
          translucent={translucent}
          onSettingsClick={onSettingsClick}
          onHelpClick={onHelpClick}
          onTasksClick={onTasksClick}
          isSettingsOpen={isSettingsOpen}
          isHelpOpen={isHelpOpen}
          isTasksOpen={isTasksOpen}
        />
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          {/* Drawer */}
          <div className="relative z-10 flex h-full">
            <SidebarContent
              onClose={onClose}
              translucent={translucent}
              onSettingsClick={onSettingsClick}
              onHelpClick={onHelpClick}
              onTasksClick={onTasksClick}
              isSettingsOpen={isSettingsOpen}
              isHelpOpen={isHelpOpen}
              isTasksOpen={isTasksOpen}
            />
          </div>
        </div>
      )}
    </>
  );
}
