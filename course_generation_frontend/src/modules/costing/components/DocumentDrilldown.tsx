import { motion } from 'framer-motion'
import { ArrowLeft, FileText, DollarSign, Zap, BarChart2, Layers, Cpu, CalendarClock, ReceiptText } from 'lucide-react'
import type { DocumentCost } from '../types'
import { ModelBreakdownTable } from './ModelBreakdownTable'
import { StageCostChart } from './charts/StageCostChart'
import { StageTokenChart } from './charts/StageTokenChart'
import { ModelContributionChart } from './charts/ModelContributionChart'
import { getStageColor } from './charts/chartTheme'

interface Props {
  doc: DocumentCost
  onBack: () => void
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] p-5">
      <h4 className="text-sm font-bold text-slate-800 mb-4">{title}</h4>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: typeof DollarSign; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
        <Icon size={14} className="text-indigo-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    </div>
  )
}

export function DocumentDrilldown({ doc, onBack }: Props) {
  const totalCost = doc.modelBreakdown.reduce((s, m) => s + m.cost, 0)
  const totalTokens = doc.inputTokens + doc.outputTokens

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 overflow-y-auto"
    >
      {/* Drilldown header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/50 bg-white/90 px-8 pt-3 pb-4 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-7xl space-y-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-indigo-600 transition-colors duration-150"
          >
            <ArrowLeft size={12} />
            Back to Costing Dashboard
          </button>

          <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_36%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-5 py-4 shadow-[0_14px_46px_-30px_rgba(15,23,42,0.28)]">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(420px,1fr)] xl:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50 to-violet-100 shadow-[0_10px_24px_-16px_rgba(99,102,241,0.45)]">
                  <FileText size={18} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500 mb-0.5">
                    Document Detail
                  </p>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 break-words">
                    {doc.documentName}
                  </h1>
                  <p className="mt-1 text-xs font-medium text-slate-400">{doc.documentType}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: ReceiptText,
                    label: 'Run Cost',
                    value: `$${doc.totalCost.toFixed(4)}`,
                    meta: `${doc.totalRequests} requests`,
                  },
                  {
                    icon: Cpu,
                    label: 'Tracked Tokens',
                    value: fmtTokens(totalTokens),
                    meta: `${fmtTokens(doc.inputTokens)} in · ${fmtTokens(doc.outputTokens)} out`,
                  },
                  {
                    icon: CalendarClock,
                    label: 'Last Updated',
                    value: new Date(doc.lastUpdated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                    meta: doc.status,
                  },
                ].map(({ icon: Icon, label, value, meta }) => (
                  <div key={label} className="rounded-2xl border border-white/70 bg-white/88 px-4 py-3 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.25)]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
                        <Icon size={14} className="text-indigo-600" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    </div>
                    <p className="mt-2 text-base font-bold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-1 text-[11px] text-slate-500 break-words">{meta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-6 space-y-8">

        {/* Document Summary KPIs */}
        <section>
          <SectionHeader icon={DollarSign} title="Document Summary" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Cost', value: `$${doc.totalCost.toFixed(4)}`, accent: 'from-indigo-500 to-violet-500' },
              { label: 'Input Tokens', value: fmtTokens(doc.inputTokens), accent: 'from-cyan-400 to-blue-500' },
              { label: 'Output Tokens', value: fmtTokens(doc.outputTokens), accent: 'from-violet-400 to-purple-500' },
              { label: 'Total Requests', value: doc.totalRequests.toLocaleString(), accent: 'from-emerald-400 to-teal-500' },
            ].map(({ label, value, accent }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-slate-200/70 bg-white px-5 py-4 shadow-[0_1px_6px_0_rgba(0,0,0,0.04)]"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {label}
                </p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
                <div className="mt-3 h-0.5 rounded-full overflow-hidden bg-slate-100">
                  <div className={`h-full w-full rounded-full bg-gradient-to-r ${accent} opacity-60`} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Model Usage Breakdown */}
        <section>
          <SectionHeader icon={BarChart2} title="Model Usage Breakdown" />
          <ModelBreakdownTable models={doc.modelBreakdown} totalCost={totalCost} />
        </section>

        {/* Generation Stage Breakdown */}
        <section>
          <SectionHeader icon={Layers} title="Generation Stage Breakdown" />
          <div className="overflow-hidden rounded-xl border border-slate-200/70">
            <div className="grid grid-cols-5 gap-4 bg-slate-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-2">Stage</div>
              <div className="text-right">Cost</div>
              <div className="text-right">Input Tokens</div>
              <div className="text-right">Output Tokens</div>
            </div>
            {doc.stageBreakdown.map((stage, i) => {
              const color = getStageColor(stage.stageKey)
              const share = doc.totalCost > 0 ? (stage.cost / doc.totalCost) * 100 : 0
              return (
                <motion.div
                  key={stage.stageKey}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="grid grid-cols-5 gap-4 border-t border-slate-100/80 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="col-span-2 flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{stage.stageName}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-1 w-16 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${share}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-xs font-semibold text-slate-800 tabular-nums">
                      ${stage.cost.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-slate-500 tabular-nums">{fmtTokens(stage.inputTokens)}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-slate-500 tabular-nums">{fmtTokens(stage.outputTokens)}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Charts */}
        <section>
          <SectionHeader icon={Zap} title="Visual Breakdown" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChartCard title="Cost by Stage">
              <StageCostChart data={doc.stageBreakdown} />
            </ChartCard>
            <ChartCard title="Token Usage by Stage">
              <StageTokenChart data={doc.stageBreakdown} />
            </ChartCard>
            <ChartCard title="Model Contribution">
              <ModelContributionChart data={doc.modelBreakdown} />
            </ChartCard>
          </div>
        </section>

      </div>
    </motion.div>
  )
}
