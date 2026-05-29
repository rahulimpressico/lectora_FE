import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Keyboard,
  MessageSquare,
  Upload,
  FileSearch,
  Cpu,
  Download,
  ArrowRight,
  ExternalLink,
  Mail,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/cn'

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'guide' | 'faq' | 'shortcuts' | 'support'

// ─── Data ─────────────────────────────────────────────────────────────────────
const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'guide', label: 'Quick Guide', icon: BookOpen },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'support', label: 'Support', icon: MessageSquare },
]

const guideSteps = [
  {
    icon: Upload,
    color: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99,102,241,0.25)',
    step: '01',
    title: 'Upload Source Documents',
    desc: 'Drop your study guide (DOCX or PDF) and optional timed outline. Enter a course topic to organize your files in Azure Blob Storage.',
  },
  {
    icon: FileSearch,
    color: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.25)',
    step: '02',
    title: 'Generate Training Outline',
    desc: 'The AI extracts a structured Training Outline (TO) from your documents. Review and edit the TO and rule pack in the three-panel layout before proceeding.',
  },
  {
    icon: Cpu,
    color: 'from-sky-500 to-indigo-500',
    glow: 'rgba(14,165,233,0.2)',
    step: '03',
    title: 'Run the Pipeline',
    desc: 'Click "Generate Course" to launch the multi-agent pipeline. Watch real-time progress as agents extract knowledge, map sections, and generate structured content.',
  },
  {
    icon: Download,
    color: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.22)',
    step: '04',
    title: 'Review & Export',
    desc: 'Edit the generated course section-by-section in the Course Editor. Preview the full output and export a polished DOCX file when ready.',
  },
]

const faqItems: { q: string; a: string }[] = [
  {
    q: 'How long does course generation take?',
    a: 'Typically 3–8 minutes depending on document length and complexity. The pipeline runs 4–6 AI agents sequentially. You can watch live progress in the Pipeline view.',
  },
  {
    q: 'What file formats can I upload?',
    a: 'The platform accepts DOCX and PDF files for source documents. The Training Outline (TO) must be a DOCX file. All files are uploaded to Azure Blob Storage before processing.',
  },
  {
    q: 'Can I edit the Training Outline before generating?',
    a: 'Yes — after the TO is generated, you land in the three-panel Review view where you can edit every field of the TO JSON and the rule pack. Your edits are sent directly to the pipeline.',
  },
  {
    q: 'What is a "rule pack" and why does it matter?',
    a: 'A rule pack defines content, style, and assessment constraints specific to your course family (e.g. insurance_ce, iarce). The AI classifies your content and selects the appropriate pack automatically.',
  },
  {
    q: 'What happens if the pipeline fails?',
    a: 'Blockers are classified as warnings, criticals, or blockers. A blocker stops the pipeline and triggers a retry. You can also manually retry from the Pipeline view. All logs are shown in the activity feed.',
  },
  {
    q: 'How do I download the final course?',
    a: 'In the Course Editor, use the Export button in the top bar. A DOCX file is generated client-side from the course JSON and downloaded immediately to your computer.',
  },
]

const shortcutGroups: {
  group: string
  items: { keys: string[]; desc: string }[]
}[] = [
  {
    group: 'Global',
    items: [
      { keys: ['⌘', 'K'], desc: 'Open command search' },
      { keys: ['⌘', 'N'], desc: 'Start new course' },
      { keys: ['Esc'], desc: 'Close panel or modal' },
      { keys: ['⌘', '?'], desc: 'Toggle this help panel' },
    ],
  },
  {
    group: 'Course Editor',
    items: [
      { keys: ['⌘', 'S'], desc: 'Save section changes' },
      { keys: ['⌘', 'Z'], desc: 'Undo last edit' },
      { keys: ['⌘', '⇧', 'Z'], desc: 'Redo' },
      { keys: ['⌘', 'E'], desc: 'Export course as DOCX' },
      { keys: ['⌘', '⇧', 'P'], desc: 'Toggle course preview' },
    ],
  },
  {
    group: 'Upload & Review',
    items: [
      { keys: ['⌘', '↵'], desc: 'Generate Training Outline' },
      { keys: ['⌘', '⇧', '↵'], desc: 'Generate Course' },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 shadow-[0_1px_0_rgba(0,0,0,0.08)] font-mono">
      {children}
    </span>
  )
}

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="rounded-xl border border-slate-100 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="text-[13px] font-semibold text-slate-800 leading-snug">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={14} className="text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 pt-1 text-[12px] text-slate-500 leading-relaxed border-t border-slate-100">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function GuideTab() {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-slate-400 leading-relaxed">
        Follow this four-step flow to generate a fully structured enterprise course.
      </p>
      <div className="space-y-3">
        {guideSteps.map(({ icon: Icon, color, glow, step, title, desc }, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="flex gap-4 rounded-xl border border-slate-100 bg-white p-4 hover:border-slate-200 hover:shadow-sm transition-all duration-150"
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                color,
              )}
              style={{ boxShadow: `0 3px 12px ${glow}` }}
            >
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-300 font-mono">{step}</span>
                <span className="text-[13px] font-bold text-slate-800">{title}</span>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-indigo-600/10">
          <FileText size={13} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-indigo-800">
            Ready to start?
          </p>
          <p className="text-[11px] text-indigo-500 mt-0.5">
            Head to the Generate page and upload your first study guide.
          </p>
        </div>
        <ArrowRight size={14} className="shrink-0 text-indigo-400" />
      </div>
    </div>
  )
}

function FAQTab() {
  return (
    <div className="space-y-2">
      {faqItems.map((item, i) => (
        <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
      ))}
    </div>
  )
}

function ShortcutsTab() {
  return (
    <div className="space-y-5">
      {shortcutGroups.map(({ group, items }, gi) => (
        <motion.section
          key={group}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.06, duration: 0.3 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
            {group}
          </p>
          <div className="space-y-1.5">
            {items.map(({ keys, desc }) => (
              <div
                key={desc}
                className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <span className="text-[13px] text-slate-700">{desc}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {keys.map((k, ki) => (
                    <span key={ki} className="flex items-center gap-1">
                      <Kbd>{k}</Kbd>
                      {ki < keys.length - 1 && (
                        <span className="text-[10px] text-slate-300 font-semibold">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      ))}
      <p className="text-[11px] text-slate-400 text-center pt-2">
        Shortcuts work when no input is focused
      </p>
    </div>
  )
}

function SupportTab() {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-400 leading-relaxed">
        Need help with Course Studio? Reach out through any of the channels below.
      </p>

      {/* Contact cards */}
      <div className="space-y-2.5">
        <motion.a
          href="mailto:support@impressico.com"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-150 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_2px_8px_rgba(99,102,241,0.25)]">
            <Mail size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">Email Support</p>
            <p className="text-[11px] text-slate-400 mt-0.5">support@impressico.com · Response within 24h</p>
          </div>
          <ExternalLink size={13} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
        </motion.a>

        <motion.a
          href="https://docs.lactora.ai"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 hover:border-violet-200 hover:bg-violet-50/30 transition-all duration-150 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_2px_8px_rgba(139,92,246,0.22)]">
            <BookOpen size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">Documentation</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Full API & pipeline reference docs</p>
          </div>
          <ExternalLink size={13} className="shrink-0 text-slate-300 group-hover:text-violet-400 transition-colors" />
        </motion.a>

        <motion.a
          href="https://github.com/impressico/lactora"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-white">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">GitHub Issues</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Report bugs or request features</p>
          </div>
          <ExternalLink size={13} className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </motion.a>
      </div>

      {/* System info */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">System Info</p>
        <div className="space-y-1.5">
          {[
            { label: 'App version', value: '0.1.0' },
            { label: 'Environment', value: 'Production' },
            { label: 'Backend', value: 'FastAPI + LangGraph' },
            { label: 'Storage', value: 'Azure Blob Storage' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">{label}</span>
              <span className="text-[11px] font-semibold text-slate-700 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('guide')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="help-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Slide-over panel */}
          <motion.div
            key="help-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[92vw] flex-col bg-white shadow-[-20px_0_60px_-4px_rgba(0,0,0,0.12)] border-l border-slate-200"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100/80 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_2px_10px_rgba(139,92,246,0.32)]">
                  <HelpCircle size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none">Help & Support</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Guides, FAQs and shortcuts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Close help"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex items-center gap-1 border-b border-slate-100 bg-white px-4 py-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150',
                    activeTab === id
                      ? 'bg-indigo-50 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                  )}
                >
                  <Icon size={12} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {activeTab === 'guide'     && <GuideTab />}
                  {activeTab === 'faq'       && <FAQTab />}
                  {activeTab === 'shortcuts' && <ShortcutsTab />}
                  {activeTab === 'support'   && <SupportTab />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
              <p className="text-center text-[11px] text-slate-400">
                Course Studio · AI Course Generation · v0.1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
