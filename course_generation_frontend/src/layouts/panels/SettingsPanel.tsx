/**
 * SettingsPanel — fully-wired enterprise settings slide-over.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Appearance  │  AI Models (live backend)  │  Editor  │  Output   │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * "AI Models" section fetches from GET /api/settings, persists via
 * PUT /api/settings/models.  All other sections write to Zustand
 * (persisted to localStorage).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Sun,
  Moon,
  Monitor,
  Settings,
  Check,
  Zap,
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSettingsStore } from '@/store/settingsStore'
import type { Theme } from '@/store/settingsStore'
import { settingsApi } from '@/api/settings/api'
import type { AgentModelConfig, AvailableModel } from '@/api/settings/api'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        {icon}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-indigo-400 focus-visible:ring-offset-1',
        checked ? 'bg-indigo-600' : 'bg-slate-200',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition-opacity',
      disabled && 'opacity-50',
    )}>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

// ─── Theme section ────────────────────────────────────────────────────────────

const themeOptions: { value: Theme; label: string; icon: React.ElementType; preview: string }[] = [
  { value: 'light',  label: 'Light',  icon: Sun,     preview: 'bg-white border-slate-200' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    preview: 'bg-slate-800 border-slate-700' },
  { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-slate-800 border-slate-300' },
]

function AppearanceSection() {
  const { theme, setTheme } = useSettingsStore()
  return (
    <section>
      <SectionLabel icon={<Sun size={12} />} label="Appearance" />
      <div className="grid grid-cols-3 gap-2">
        {themeOptions.map(({ value, label, icon: Icon, preview }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'relative flex flex-col items-center gap-2.5 rounded-xl border px-2 py-3.5 text-center transition-all duration-150',
              theme === value
                ? 'border-indigo-300 bg-indigo-50 shadow-[0_0_0_2px_rgba(99,102,241,0.12)]'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80',
            )}
          >
            <div className={cn('h-7 w-full rounded-lg border', preview)} />
            <div className="flex items-center gap-1.5">
              <Icon size={11} className={theme === value ? 'text-indigo-600' : 'text-slate-400'} />
              <span className={cn('text-[11px] font-semibold', theme === value ? 'text-indigo-700' : 'text-slate-600')}>{label}</span>
            </div>
            {theme === value && (
              <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 shadow-sm">
                <Check size={9} className="text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── Editor preferences section ───────────────────────────────────────────────

function EditorSection() {
  const { animations, autoSave, compactMode, setAnimations, setAutoSave, setCompactMode } = useSettingsStore()
  return (
    <section>
      <SectionLabel icon={<Zap size={12} />} label="Editor Preferences" />
      <div className="space-y-2">
        <ToggleRow
          label="Auto-save edits"
          desc="Save changes automatically while editing course content"
          checked={autoSave}
          onChange={setAutoSave}
        />
        <ToggleRow
          label="Enable animations"
          desc="Page transitions and UI micro-interactions"
          checked={animations}
          onChange={setAnimations}
        />
        <ToggleRow
          label="Compact layout"
          desc="Reduce spacing across panels and cards"
          checked={compactMode}
          onChange={setCompactMode}
        />
      </div>
    </section>
  )
}

// ─── Model dropdown ────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  reasoning: 'bg-violet-50 text-violet-700 border-violet-200',
  flagship:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  efficient: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  previous:  'bg-slate-100 text-slate-600 border-slate-200',
}

function ModelDropdown({
  value,
  models,
  onChange,
  disabled,
}: {
  value: string
  models: AvailableModel[]
  onChange: (m: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = models.find((m) => m.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2',
          'text-[12px] font-semibold text-slate-800 transition-all hover:border-slate-300',
          'focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{selected?.label ?? value}</span>
          {selected && (
            <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', tierColors[selected.tier] ?? tierColors.previous)}>
              {selected.tier}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={12} className="text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)]"
          >
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m.id); setOpen(false) }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50',
                  m.id === value && 'bg-indigo-50/60',
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[12px] font-semibold', m.id === value ? 'text-indigo-700' : 'text-slate-800')}>{m.label}</span>
                    <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', tierColors[m.tier] ?? tierColors.previous)}>
                      {m.tier}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.provider}</p>
                </div>
                {m.id === value && <Check size={12} className="shrink-0 text-indigo-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Agent model card ──────────────────────────────────────────────────────────

const agentColors: Record<string, { icon: string; ring: string }> = {
  A0: { icon: 'from-violet-500 to-purple-600', ring: 'ring-violet-200' },
  A1: { icon: 'from-indigo-500 to-blue-600',   ring: 'ring-indigo-200' },
  A2: { icon: 'from-sky-500 to-indigo-500',    ring: 'ring-sky-200'    },
}

function AgentModelCard({
  agent,
  models,
  pendingValue,
  onChangeLocal,
  isSaving,
  isSuccess,
}: {
  agent: AgentModelConfig
  models: AvailableModel[]
  pendingValue: string
  onChangeLocal: (v: string) => void
  isSaving: boolean
  isSuccess: boolean
}) {
  const colors = agentColors[agent.agent_id] ?? agentColors.A2
  const isDirty = pendingValue !== agent.current_deployment

  return (
    <div className={cn(
      'rounded-xl border bg-white transition-all duration-150',
      isDirty ? 'border-indigo-200 shadow-[0_0_0_3px_rgba(99,102,241,0.07)]' : 'border-slate-200',
    )}>
      <div className="flex items-start gap-3 p-3.5">
        {/* Agent icon */}
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white text-[10px] font-bold shadow-sm ring-2 ring-offset-1',
          colors.icon,
          colors.ring,
        )}>
          {agent.agent_id}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{agent.name}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {isDirty && !isSaving && !isSuccess && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200">
                  Unsaved
                </span>
              )}
              {isSaving && (
                <Loader2 size={11} className="animate-spin text-indigo-500" />
              )}
              {isSuccess && (
                <CheckCircle2 size={12} className="text-emerald-500" />
              )}
              {agent.is_overridden && !isDirty && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600 border border-indigo-200">
                  Custom
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug mb-2.5">{agent.role}</p>
          <ModelDropdown
            value={pendingValue}
            models={models}
            onChange={onChangeLocal}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Default indicator */}
      {agent.is_overridden && (
        <div className="flex items-center justify-between px-3.5 pb-3 -mt-0.5">
          <span className="text-[10px] text-slate-400">
            Default: <code className="font-mono text-slate-500">{agent.default_deployment}</code>
          </span>
        </div>
      )}
    </div>
  )
}

// ─── AI Models section ─────────────────────────────────────────────────────────

function AIModelsSection() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 30_000,
    retry: 2,
  })

  // Local pending changes — { agentId: deployment }
  const [pending, setPending] = useState<Record<string, string>>({})
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set())

  // Sync pending with server values on first load (or refresh)
  useEffect(() => {
    if (data?.agents) {
      const initial: Record<string, string> = {}
      for (const a of data.agents) initial[a.agent_id] = a.current_deployment
      setPending(initial)
    }
  }, [data?.agents])

  const { mutate: saveModels, isPending: isSaving } = useMutation({
    mutationFn: (updates: { agent_id: string; deployment: string }[]) =>
      settingsApi.updateModels(updates),
    onSuccess: (res) => {
      // Update local query cache with fresh values
      queryClient.setQueryData(['settings'], (old: typeof data) =>
        old ? { ...old, agents: res.agents } : old,
      )
      // Re-sync pending to confirmed server state
      const confirmed: Record<string, string> = {}
      for (const a of res.agents) confirmed[a.agent_id] = a.current_deployment
      setPending(confirmed)
      // Flash success badges
      const ids = new Set(res.agents.map((a) => a.agent_id))
      setSuccessIds(ids)
      setTimeout(() => setSuccessIds(new Set()), 2000)
    },
  })

  const { mutate: resetAll, isPending: isResetting } = useMutation({
    mutationFn: () => settingsApi.resetModels(),
    onSuccess: (res) => {
      queryClient.setQueryData(['settings'], (old: typeof data) =>
        old ? { ...old, agents: res.agents } : old,
      )
      const reset: Record<string, string> = {}
      for (const a of res.agents) reset[a.agent_id] = a.current_deployment
      setPending(reset)
    },
  })

  const dirtyUpdates = useCallback(() => {
    if (!data?.agents) return []
    return data.agents
      .filter((a) => pending[a.agent_id] && pending[a.agent_id] !== a.current_deployment)
      .map((a) => ({ agent_id: a.agent_id, deployment: pending[a.agent_id] }))
  }, [data?.agents, pending])

  const hasDirty = dirtyUpdates().length > 0

  if (isLoading) {
    return (
      <section>
        <SectionLabel icon={<Cpu size={12} />} label="Agent AI Models" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-100 bg-slate-50/60 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section>
        <SectionLabel icon={<Cpu size={12} />} label="Agent AI Models" />
        <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/60 px-4 py-3.5">
          <AlertCircle size={14} className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-red-700">Could not load model config</p>
            <p className="text-[11px] text-red-500 mt-0.5">Backend may be offline or unreachable.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-100 transition-colors"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </section>
    )
  }

  const agents = data?.agents ?? []
  const models = data?.available_models ?? []

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
            <Cpu size={12} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Agent AI Models
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => resetAll()}
            disabled={isResetting || isSaving}
            title="Reset all to defaults"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            {isResetting ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <AgentModelCard
            key={agent.agent_id}
            agent={agent}
            models={models}
            pendingValue={pending[agent.agent_id] ?? agent.current_deployment}
            onChangeLocal={(v) => setPending((p) => ({ ...p, [agent.agent_id]: v }))}
            isSaving={isSaving}
            isSuccess={successIds.has(agent.agent_id)}
          />
        ))}
      </div>

      {/* Save bar */}
      <AnimatePresence>
        {hasDirty && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3"
          >
            <p className="text-[12px] text-indigo-700 font-semibold">
              {dirtyUpdates().length} unsaved change{dirtyUpdates().length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (data?.agents) {
                    const reset: Record<string, string> = {}
                    for (const a of data.agents) reset[a.agent_id] = a.current_deployment
                    setPending(reset)
                  }
                }}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveModels(dirtyUpdates())}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white',
                  'hover:bg-indigo-700 transition-colors disabled:opacity-60',
                )}
              >
                {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-3 text-center text-[10px] text-slate-400 leading-relaxed">
        Changes take effect immediately on the next generation run.
      </p>
    </section>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="settings-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-[440px] max-w-[92vw] flex-col bg-white shadow-[-20px_0_60px_-4px_rgba(0,0,0,0.12)] border-l border-slate-200"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100/80 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_2px_10px_rgba(99,102,241,0.35)]">
                  <Settings size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none">Settings</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Workspace preferences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Close settings"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
              <AppearanceSection />
              <div className="h-px bg-slate-100" />
              <AIModelsSection />
              <div className="h-px bg-slate-100" />
              <EditorSection />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
              <p className="text-center text-[11px] text-slate-400">
                UI preferences saved to browser · Model settings synced to backend
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
