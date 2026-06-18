import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  Sparkles,
  ArrowRight,
  Upload,
  Cpu,
  Zap,
  Database,
  ChevronRight,
  CheckCircle,
  Star,
  Shield,
  Rocket,
  Clock,
} from 'lucide-react'

// ─── Scroll-aware fade-up wrapper ───────────────────────────────────
function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Animated floating blob ─────────────────────────────────────────
function Blob({
  className,
  delay = 0,
  duration = 8,
}: {
  className: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.12, 1],
        x: [0, 24, 0],
        y: [0, -16, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}

// ─── Data ───────────────────────────────────────────────────────────
const features = [
  {
    icon: Upload,
    title: 'Upload Multiple Files',
    desc: 'Drag-and-drop your DOCX study guides and timed outlines. Instant browser-side preview.',
    grad: 'from-blue-500 to-cyan-500',
    hoverBg: 'group-hover:from-blue-50',
  },
  {
    icon: Cpu,
    title: 'AI Generated TOC',
    desc: 'A0/A1 agents classify your content and produce a structured training outline automatically.',
    grad: 'from-violet-500 to-purple-600',
    hoverBg: 'group-hover:from-violet-50',
  },
  {
    icon: Zap,
    title: 'Smart Content Creation',
    desc: 'Multi-agent pipeline turns raw content into professional course sections with assessments.',
    grad: 'from-indigo-500 to-violet-500',
    hoverBg: 'group-hover:from-indigo-50',
  },
  {
    icon: Database,
    title: 'Azure Storage Integration',
    desc: 'Enterprise-grade Azure Blob Storage and Service Bus integration for production workloads.',
    grad: 'from-emerald-500 to-teal-500',
    hoverBg: 'group-hover:from-emerald-50',
  },
]

const workflowSteps = [
  { num: '01', title: 'Upload Files', desc: 'Drop DOCX study guides and timed outlines' },
  { num: '02', title: 'Generate TO', desc: 'AI builds a structured training outline' },
  { num: '03', title: 'Review Rules', desc: 'Edit content and validate rule packs' },
  { num: '04', title: 'Generate Course', desc: 'Pipeline assembles the final course' },
]

const whyUs = [
  {
    icon: Rocket,
    title: 'Production Pipeline',
    desc: 'Azure Service Bus queuing, blob storage, and a robust orchestrator that handles failures with automatic retry logic.',
    grad: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    icon: Shield,
    title: 'Intelligent Validation',
    desc: 'S1 and S2 gates with blocker/critical/warning severity levels catch content issues before production.',
    grad: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    icon: Clock,
    title: 'Minutes, Not Days',
    desc: 'Days of manual authoring compressed into minutes with intelligent multi-agent AI generation.',
    grad: 'from-blue-500 to-indigo-500',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Star,
    title: 'Compliance-First',
    desc: 'Rule packs for insurance CE, IARCE, and FIRM element ensure every course meets regulatory standards.',
    grad: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.15)',
  },
]

// ─── Component ──────────────────────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, 60])

  return (
    <div className="flex-1 w-full min-h-screen bg-white overflow-x-hidden antialiased flex flex-col">

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/75 backdrop-blur-2xl border-b border-slate-200/40 px-6 sm:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5 select-none">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_2px_12px_rgba(99,102,241,0.45)]">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              Course<span className="text-indigo-600"> Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="h-8 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-all duration-200"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/generate')}
              className="h-8 px-4 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg shadow-[0_2px_10px_rgba(99,102,241,0.38)] hover:shadow-[0_4px_18px_rgba(99,102,241,0.5)] hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 sm:px-10 pt-16 pb-12 overflow-hidden"
      >
        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Blob
            className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-indigo-100/55 blur-[120px]"
            delay={0}
            duration={9}
          />
          <Blob
            className="absolute top-1/4 -right-48 w-[600px] h-[600px] rounded-full bg-violet-100/40 blur-[100px]"
            delay={2}
            duration={11}
          />
          <Blob
            className="absolute -bottom-24 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-50/60 blur-[90px]"
            delay={4}
            duration={8}
          />
          {/* Extra soft center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-indigo-50/30 via-white to-violet-50/20 blur-3xl" />
        </div>

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Hero content with parallax */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative max-w-5xl w-full mx-auto text-center space-y-7 z-10"
        >
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-sm border border-indigo-100/80 rounded-full px-4 py-2 shadow-[0_2px_20px_rgba(99,102,241,0.1)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 tracking-wider uppercase">
              Powered by Azure OpenAI
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-[76px] font-bold text-slate-900 tracking-tight leading-[1.04]"
          >
            Generate Professional
            <br />
            <span
              className="bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 bg-clip-text text-transparent"
              style={{
                backgroundSize: '200% auto',
                animation: 'gradient-shift 5s ease infinite',
              }}
            >
              Courses with AI
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-500 max-w-lg mx-auto leading-relaxed"
          >
            Upload study materials. Our intelligent multi-agent pipeline produces
            structured, compliance-ready courses — in minutes, not days.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <button
              onClick={() => navigate('/generate')}
              className="group relative inline-flex items-center gap-2.5 h-13 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-[0_4px_24px_rgba(99,102,241,0.42)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.6)] hover:scale-[1.04] active:scale-[0.97] transition-all duration-300"
            >
              {/* Inner shine */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
              <Sparkles size={16} className="text-indigo-200 shrink-0" />
              Generate Your Course
              <ArrowRight
                size={15}
                className="group-hover:translate-x-1 transition-transform duration-250"
              />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="group inline-flex items-center gap-2 h-13 px-7 py-3.5 rounded-2xl bg-white/90 border border-slate-200 text-slate-700 text-sm font-medium shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:border-slate-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-250 backdrop-blur-sm"
            >
              View Dashboard
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 pt-1"
          >
            {['Enterprise Ready', 'Compliance-First', 'Azure Powered', 'No Setup Required'].map(
              (label) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                  <span className="font-medium">{label}</span>
                </span>
              ),
            )}
          </motion.div>
        </motion.div>

        {/* ── App mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 56, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, 80]) }}
          className="relative mt-16 w-full max-w-4xl mx-auto z-10"
        >
          {/* Ambient glow */}
          <div className="absolute -inset-8 bg-gradient-to-b from-indigo-100/50 via-violet-50/25 to-transparent blur-3xl rounded-[40px] pointer-events-none" />

          {/* Card shell */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative bg-white/95 rounded-2xl border border-slate-200/60 shadow-[0_32px_80px_-8px_rgba(0,0,0,0.14),0_0_0_1px_rgba(255,255,255,0.95)] overflow-hidden backdrop-blur-xl"
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100/90 bg-slate-50/80">
              <div className="h-3 w-3 rounded-full bg-rose-400/80" />
              <div className="h-3 w-3 rounded-full bg-amber-400/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <div className="ml-3 h-6 w-56 bg-white rounded-md border border-slate-200 flex items-center gap-2 px-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                <div className="h-2 w-24 bg-slate-200 rounded" />
              </div>
              <div className="ml-auto flex gap-1.5 opacity-40">
                <div className="h-5 w-5 rounded bg-slate-300" />
                <div className="h-5 w-5 rounded bg-slate-300" />
              </div>
            </div>

            {/* App content */}
            <div className="flex h-64 sm:h-72">
              {/* Mini sidebar */}
              <div className="w-44 border-r border-slate-100/80 bg-white hidden sm:flex flex-col flex-shrink-0">
                <div className="p-3 border-b border-slate-100/60">
                  <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/40">
                    <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 shadow-sm" />
                    <div className="h-2 w-16 bg-indigo-200/70 rounded" />
                  </div>
                </div>
                <div className="p-2 space-y-0.5">
                  {[
                    { w: 'w-16', active: false },
                    { w: 'w-20', active: true },
                    { w: 'w-14', active: false },
                    { w: 'w-16', active: false },
                  ].map(({ w, active }, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors ${active ? 'bg-gradient-to-r from-indigo-50 to-violet-50/60 shadow-[inset_2px_0_0_0_#818cf8]' : ''}`}
                    >
                      <div className={`h-3 w-3 rounded-md ${active ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                      <div className={`h-2 ${w} rounded ${active ? 'bg-indigo-200' : 'bg-slate-200'}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Main area */}
              <div className="flex-1 p-5 bg-[#f9fafb]/60">
                {/* Page header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-12 bg-indigo-200 rounded-full" />
                    <div className="h-3 w-36 bg-slate-800 rounded-md" />
                  </div>
                  <div className="h-7 w-24 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_2px_8px_rgba(99,102,241,0.35)]" />
                </div>

                {/* Pipeline stages */}
                <div className="grid grid-cols-4 gap-3">
                  {workflowSteps.map(({ num }, i) => (
                    <div
                      key={num}
                      className={`rounded-xl p-3 border transition-all ${
                        i === 0
                          ? 'border-emerald-200/70 bg-emerald-50/80'
                          : i === 1
                            ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50/80 shadow-[0_2px_12px_rgba(99,102,241,0.12)]'
                            : 'border-slate-200/40 bg-white/50 opacity-35'
                      }`}
                    >
                      <div
                        className={`h-6 w-6 rounded-lg mb-2.5 flex items-center justify-center ${
                          i === 0
                            ? 'bg-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.35)]'
                            : i === 1
                              ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_2px_6px_rgba(99,102,241,0.4)]'
                              : 'bg-slate-200'
                        }`}
                      >
                        {i === 0 ? (
                          <CheckCircle size={12} className="text-white" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-white/80" />
                        )}
                      </div>
                      <div
                        className="h-2 w-full rounded-md mb-1"
                        style={{
                          background:
                            i === 0 ? '#6ee7b7' : i === 1 ? '#a5b4fc' : '#e2e8f0',
                        }}
                      />
                      <div
                        className="h-1.5 w-3/4 rounded"
                        style={{
                          background:
                            i === 0 ? '#a7f3d0' : i === 1 ? '#c7d2fe' : '#f1f5f9',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-2 w-28 bg-slate-300/60 rounded" />
                    <div className="h-2 w-8 bg-indigo-400 rounded" />
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-[47%] rounded-full progress-bar-animated" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-slate-300/60 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 bg-slate-400 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section className="relative w-full py-28 px-6 sm:px-10 bg-[#f9fafb]">
        {/* Top separator */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Everything you need to create
              <br className="hidden sm:block" />
              professional courses at scale
            </h2>
            <p className="mt-4 text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              From upload to delivery — our platform handles every step of the course creation pipeline.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc, grad }, i) => (
              <FadeUp key={title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="group relative bg-white rounded-2xl border border-slate-200/70 p-6 hover:shadow-[0_12px_48px_rgba(0,0,0,0.09)] transition-shadow duration-300 overflow-hidden h-full flex flex-col"
                >
                  {/* Hover gradient top line */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${grad} opacity-0 group-hover:opacity-100 transition-opacity duration-350`}
                  />
                  {/* Hover inner glow */}
                  <div
                    className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${grad} opacity-0 group-hover:opacity-[0.08] blur-2xl transition-opacity duration-400`}
                  />

                  <motion.div
                    whileHover={{ scale: 1.12, rotate: -2 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className={`h-10 w-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center mb-4 shadow-[0_3px_12px_rgba(0,0,0,0.12)]`}
                  >
                    <Icon size={18} className="text-white" />
                  </motion.div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed flex-1">{desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ──────────────────────────────────────────────── */}
      <section className="relative w-full py-28 px-6 sm:px-10 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              From files to finished course
              <br className="hidden sm:block" />
              in four steps
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="relative mt-16">
              {/* Connector line */}
              <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-indigo-200 via-violet-400 to-indigo-200 hidden sm:block opacity-50" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-6">
                {workflowSteps.map(({ num, title, desc }, i) => (
                  <div key={num} className="flex flex-col items-center text-center gap-4">
                    <motion.div
                      whileHover={{ scale: 1.08, y: -4 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={`relative h-16 w-16 rounded-2xl flex items-center justify-center cursor-default ${
                        i === 0
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_6px_28px_rgba(99,102,241,0.42)]'
                          : 'bg-white border-2 border-slate-200 shadow-[0_3px_14px_rgba(0,0,0,0.06)]'
                      }`}
                    >
                      {i === 0 && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/15" />
                      )}
                      <span
                        className={`text-xl font-bold ${i === 0 ? 'text-white' : 'text-slate-400'}`}
                      >
                        {num}
                      </span>
                    </motion.div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-1">{title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[130px]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2} className="mt-14 text-center">
            <button
              onClick={() => navigate('/generate')}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-violet-600 transition-colors duration-200"
            >
              Try the pipeline yourself
              <ArrowRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform duration-200"
              />
            </button>
          </FadeUp>
        </div>
      </section>

      {/* ── WHY CHOOSE US ─────────────────────────────────────────── */}
      <section className="relative w-full py-28 px-6 sm:px-10 bg-[#f9fafb] overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-50/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-50/50 blur-3xl" />

        <div className="max-w-5xl mx-auto relative">
          <FadeUp className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">
              Why Course Studio
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Built for enterprise course
              <br className="hidden sm:block" />
              creation at scale
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {whyUs.map(({ icon: Icon, title, desc, grad, glow }, i) => (
              <FadeUp key={title} delay={i * 0.07}>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 4.5 + i * 0.7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 1.1,
                  }}
                  whileHover={{ y: -8, scale: 1.01 }}
                  className="group relative bg-white rounded-2xl border border-slate-200/70 p-7 cursor-default overflow-hidden"
                  style={{
                    boxShadow: `0 4px 20px ${glow}, 0 1px 4px rgba(0,0,0,0.04)`,
                  }}
                >
                  <div
                    className={`absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br ${grad} opacity-0 group-hover:opacity-[0.07] blur-3xl transition-opacity duration-500`}
                  />
                  <div className="flex items-start gap-4 relative">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -3 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-[0_3px_14px_rgba(0,0,0,0.14)]`}
                    >
                      <Icon size={20} className="text-white" />
                    </motion.div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 mb-1.5">{title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <section className="w-full py-24 px-6 sm:px-10 bg-white">
        <div className="max-w-3xl mx-auto">
          <FadeUp>
            <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-10 sm:p-16 text-center overflow-hidden shadow-[0_24px_80px_rgba(99,102,241,0.38)]">
              <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-violet-900/30 blur-3xl pointer-events-none" />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
              />

              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur border border-white/25 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
                >
                  <Sparkles size={22} className="text-white" />
                </motion.div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                  Ready to generate your first course?
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed max-w-md mx-auto mb-9">
                  Upload your study guide and let the AI pipeline handle the rest.
                  Professional, compliance-ready — generated in minutes.
                </p>

                <button
                  onClick={() => navigate('/generate')}
                  className="group inline-flex items-center gap-2.5 h-12 px-9 rounded-2xl bg-white text-indigo-700 text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.26)] hover:scale-[1.04] active:scale-[0.97] transition-all duration-300"
                >
                  <Sparkles size={15} className="text-indigo-500" />
                  Generate Your Course
                  <ArrowRight
                    size={14}
                    className="text-indigo-500 group-hover:translate-x-0.5 transition-transform duration-200"
                  />
                </button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-slate-200/60 bg-white px-6 sm:px-10 py-10 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              Course<span className="text-indigo-600"> Studio</span>
            </span>
          </div>

          <nav className="flex items-center gap-6 text-xs text-slate-400">
            {[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Generate', path: '/generate' },
              { label: 'Assets', path: '/assert_library' },
              { label: 'Documents', path: '/documents_library' },
            ].map(({ label, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="hover:text-slate-700 font-medium transition-colors duration-150"
              >
                {label}
              </button>
            ))}
          </nav>

          <p className="text-xs text-slate-400">© 2025 Course Studio · Impressico</p>
        </div>
      </footer>
    </div>
  )
}
