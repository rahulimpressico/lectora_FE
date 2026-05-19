import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, BookOpen, Clock, CheckCircle, Plus } from 'lucide-react'
import { Button } from '@/shared/components/Button'

const stats = [
  {
    label: 'Courses Generated',
    value: '0',
    icon: BookOpen,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/70',
    accentColor: 'from-indigo-500 to-violet-500',
    shadow: 'shadow-[0_2px_12px_0_rgb(99,102,241,0.1)]',
  },
  {
    label: 'In Progress',
    value: '0',
    icon: Clock,
    iconColor: 'text-amber-600',
    iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100/70',
    accentColor: 'from-amber-400 to-orange-400',
    shadow: 'shadow-[0_2px_12px_0_rgb(245,158,11,0.1)]',
  },
  {
    label: 'Completed',
    value: '0',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70',
    accentColor: 'from-emerald-400 to-teal-400',
    shadow: 'shadow-[0_2px_12px_0_rgb(16,185,129,0.1)]',
  },
]

export function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto">

      {/* Page hero header */}
      <div className="border-b border-slate-200/80 bg-white px-8 py-7">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1.5">
                Welcome back
              </p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500 max-w-md">
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
        <div className="grid grid-cols-3 gap-5">
          {stats.map(({ label, value, icon: Icon, iconColor, iconBg, accentColor, shadow }) => (
            <div
              key={label}
              className={`group relative rounded-2xl border border-slate-200/80 bg-white px-6 py-5 card-hover card-accent overflow-hidden ${shadow}`}
            >
              {/* Decorative orb */}
              <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-slate-100/50 blur-2xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon size={18} className={iconColor} />
                </div>
              </div>

              <div className="mt-5 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full w-0 rounded-full bg-gradient-to-r ${accentColor}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Getting-started CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 px-10 py-12 text-center shadow-[0_2px_24px_0_rgb(99,102,241,0.07)]">
          {/* Blurred gradient orbs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-violet-200/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_20px_0_rgb(99,102,241,0.45)]">
              <Sparkles size={24} className="text-white" />
            </div>
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
        </div>

        {/* Quick tips */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05)] p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">How it works</h3>
          <div className="grid grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Upload Documents', desc: 'Provide your study guide and timed outline as DOCX files.' },
              { step: '02', title: 'Review & Edit', desc: 'Inspect the AI-generated training outline and rules before generation.' },
              { step: '03', title: 'Generate Course', desc: 'Launch the pipeline and download your finished course package.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-600">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
