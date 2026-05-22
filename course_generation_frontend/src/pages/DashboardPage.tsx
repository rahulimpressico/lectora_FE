import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, BookOpen, Clock, CheckCircle, Plus, ArrowUpRight } from 'lucide-react'
import { Button } from '@/shared/components/Button'

const stats = [
  {
    label: 'Courses Generated',
    value: '0',
    icon: BookOpen,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/70',
    accent: 'from-indigo-500 to-violet-500',
    glow: '0 2px 20px 0 rgba(99,102,241,0.10)',
  },
  {
    label: 'In Progress',
    value: '0',
    icon: Clock,
    iconColor: 'text-amber-600',
    iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100/70',
    accent: 'from-amber-400 to-orange-400',
    glow: '0 2px 20px 0 rgba(245,158,11,0.10)',
  },
  {
    label: 'Completed',
    value: '0',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70',
    accent: 'from-emerald-400 to-teal-400',
    glow: '0 2px 20px 0 rgba(16,185,129,0.10)',
  },
]

const howItWorks = [
  {
    step: '01',
    title: 'Upload Documents',
    desc: 'Provide your study guide and timed outline as DOCX files.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    step: '02',
    title: 'Review & Edit',
    desc: 'Inspect the AI-generated training outline and rules before generation.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    step: '03',
    title: 'Generate Course',
    desc: 'Launch the pipeline and download your finished course package.',
    color: 'bg-emerald-50 text-emerald-600',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

export function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto">

      {/* Page header */}
      <div className="border-b border-slate-200/50 bg-white/90 backdrop-blur-xl px-8 py-7 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1.5">
                Welcome back
              </p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500 max-w-md leading-relaxed">
                Manage your AI-powered course generation pipeline for enterprise learning.
              </p>
            </div>
            <Link to="/generate">
              <Button icon={<Plus size={14} />} size="md">
                New Course
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-8 space-y-8">

        {/* Stats grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {stats.map(({ label, value, icon: Icon, iconColor, iconBg, accent, glow }) => (
            <motion.div
              key={label}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="group relative rounded-2xl border border-slate-200/70 bg-white px-6 py-5 card-accent overflow-hidden cursor-default"
              style={{ boxShadow: glow }}
            >
              <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-slate-50 blur-2xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.12, rotate: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                >
                  <Icon size={18} className={iconColor} />
                </motion.div>
              </div>

              <div className="mt-5 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full w-0 rounded-full bg-gradient-to-r ${accent}`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Getting-started CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 px-10 py-12 text-center shadow-[0_2px_32px_0_rgba(99,102,241,0.08)]"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-200/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle, #a5b4fc 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_6px_28px_0_rgba(99,102,241,0.48)]"
            >
              <Sparkles size={24} className="text-white" />
            </motion.div>
            <h2 className="mt-5 text-lg font-bold text-slate-800 tracking-tight">
              Generate your first course
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Upload a study guide, configure the rule pack, and let the AI pipeline
              produce a fully structured course in minutes.
            </p>
            <div className="mt-7">
              <Link to="/generate">
                <Button icon={<ArrowRight size={15} />} size="lg">
                  Start Generating
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] p-7"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900">How it works</h3>
            <Link
              to="/generate"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Get started
              <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {howItWorks.map(({ step, title, desc, color }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.35 + i * 0.08 }}
                className="flex gap-4"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color} text-[11px] font-bold`}
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back to home */}
        <div className="pb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
