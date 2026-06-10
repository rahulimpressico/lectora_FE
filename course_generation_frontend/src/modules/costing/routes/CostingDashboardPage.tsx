import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign,
  ArrowUpRight,
  FileText,
  Cpu,
  TrendingUp,
  BarChart2,
  Layers,
  AlertCircle,
  RefreshCw,
  BookMarked,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Activity,
  ReceiptText,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { fetchCostingSummary } from '../api/api'
import { useCostingStore } from '../store/costingStore'
import type { CostingSummary } from '../types'
import { KPICard } from '../components/KPICard'
import { ModelBreakdownTable } from '../components/ModelBreakdownTable'
import { ModelPricingReference } from '../components/ModelPricingReference'
import { AgentModelPanel } from '../components/AgentModelPanel'
import { DocumentDrilldown } from '../components/DocumentDrilldown'
import { DocumentsSection } from '../components/DocumentsSection'
import { CostByModelChart } from '../components/charts/CostByModelChart'
import { TokenStackedChart } from '../components/charts/TokenStackedChart'
import { CostDistributionChart } from '../components/charts/CostDistributionChart'
import { CostTrendChart } from '../components/charts/CostTrendChart'
import { TokenTrendChart } from '../components/charts/TokenTrendChart'
import { StageCostChart } from '../components/charts/StageCostChart'
import { StageTokenChart } from '../components/charts/StageTokenChart'
import { ModelContributionChart } from '../components/charts/ModelContributionChart'
import { getStageColor } from '../components/charts/chartTheme'
import { StageTooltipLabel } from '../components/StageTooltipLabel'

// ─── Types ─────────────────────────────────────────────────────────────────────

type CostingTab = 'overview' | 'ai-pricing' | 'documents'

const TABS: { id: CostingTab; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] =
  [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
    { id: 'ai-pricing', label: 'AI Model Pricing', shortLabel: 'AI Pricing', icon: BookMarked },
    { id: 'documents', label: 'Per Document Analysis', shortLabel: 'Documents', icon: Layers },
  ]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function fmtCurrency(n: number, currency = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${n.toFixed(4)}`
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function hasLiveCostingData(summary: CostingSummary | null | undefined): boolean {
  if (!summary) return false
  return (
    summary.totalCost > 0 ||
    (summary.traceTotalCost ?? 0) > 0 ||
    summary.totalDocumentsProcessed > 0 ||
    summary.costTrend.length > 0 ||
    summary.modelSummary.length > 0 ||
    (summary.stageSummary?.length ?? 0) > 0 ||
    (summary.agentModelSummary?.length ?? 0) > 0 ||
    summary.documents.length > 0
  )
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof DollarSign
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100/50">
        <Icon size={14} className="text-indigo-600" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-800 leading-none">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function LoadingShimmer() {
  return (
    <div className="mx-auto max-w-7xl px-8 py-8 space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-slate-200/70 bg-white overflow-hidden"
          >
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-100 to-slate-50" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-200/70 bg-white overflow-hidden">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-100 to-slate-50" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-72 rounded-2xl border border-slate-200/70 bg-white overflow-hidden"
          >
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-100 to-slate-50" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyCostingState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
        <div className="relative border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8faff_100%)] px-8 py-8">
          <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-indigo-100/60 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.55)]">
              <ReceiptText size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-500">
                Cost Visibility
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                No run-backed costing data yet
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                This page is ready, but it will populate only after trace-tagged TO or course-generation
                runs are completed. Once a run executes, this dashboard will show per-model spend,
                token consumption, and per-document cost breakdown automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200/70 bg-slate-50/60 px-8 py-5 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Run-linked costing',
              text: 'Every new run is linked to the exact models and token usage recorded in backend traces.',
            },
            {
              icon: Activity,
              title: 'Live trend tracking',
              text: 'Daily spend and token graphs populate as soon as real traces are available.',
            },
            {
              icon: Sparkles,
              title: 'Document drilldown',
              text: 'Each processed course gets its own cost card with model and stage-level analysis.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200/70 bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
                  <Icon size={15} className="text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>

        <div className="px-8 py-5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <RefreshCw size={14} />
            Refresh costing data
          </button>
        </div>
      </div>
    </div>
  )
}

function CostingHero({ summary }: { summary: CostingSummary }) {
  const monthLabel = getCurrentMonthLabel()
  const currency = summary.currency ?? 'USD'

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f7faff_100%)] px-7 py-7 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.38)]">
      <div className="absolute -left-12 top-10 h-24 w-24 rounded-full bg-indigo-100/70 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-cyan-100/60 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-indigo-700 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live AI spend visibility
          </div>
          <h1 className="mt-4 max-w-3xl text-[30px] font-bold leading-[1.1] tracking-tight text-slate-900">
            Costing Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor actual model usage, token consumption, and course-generation spend across TO creation
            and full pipeline runs. This view is backed by recorded traces, not static estimates.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              <ShieldCheck size={12} className="text-emerald-600" />
              Run-backed pricing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              <Cpu size={12} className="text-indigo-600" />
              {summary.agentModelSummary?.length ?? 0} agents · {summary.modelSummary.length} models
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              <FileText size={12} className="text-cyan-600" />
              {summary.totalDocumentsProcessed} documents processed
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {[
            {
              label: 'Current Total',
              value: fmtCurrency(summary.totalCost, currency),
              meta: monthLabel,
            },
            {
              label: 'Tracked Tokens',
              value: `${fmtTokens(summary.totalInputTokens + summary.totalOutputTokens)}`,
              meta: `${fmtTokens(summary.totalInputTokens)} in · ${fmtTokens(summary.totalOutputTokens)} out`,
            },
            {
              label: 'Avg / Document',
              value: fmtCurrency(summary.averageCostPerDocument, currency),
              meta: `${summary.totalDocumentsProcessed} total documents`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] backdrop-blur"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Navigation ────────────────────────────────────────────────────────────

function TabNav({
  active,
  onChange,
}: {
  active: CostingTab
  onChange: (tab: CostingTab) => void
}) {
  return (
    <div className="border-b border-slate-200/50 bg-white/95 backdrop-blur-xl px-8 py-0 sticky top-[89px] z-10">
      <div className="mx-auto max-w-7xl">
        {/* Pill/segmented control */}
        <div className="flex items-center gap-0.5 py-2.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 select-none',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-[0_2px_8px_0_rgba(99,102,241,0.35)]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80',
                )}
              >
                <Icon
                  size={13}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-white/90' : 'text-slate-400',
                  )}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab content views ─────────────────────────────────────────────────────────

function OverviewTab({
  summary,
}: {
  summary: CostingSummary
}) {
  const currency = summary.currency ?? 'USD'
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-10"
    >
      {/* Executive Summary KPI Cards */}
      <section>
        <SectionHeader
          icon={DollarSign}
          title="Executive Summary"
          subtitle="Platform-wide AI cost metrics for the current period"
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          <KPICard
            label="Total Cost"
            value={fmtCurrency(summary.totalCost, currency)}
            subValue={`Current period (${currency})`}
            icon={DollarSign}
            iconColor="text-indigo-600"
            iconBg="bg-gradient-to-br from-indigo-50 to-indigo-100/70"
            accent="from-indigo-500 to-violet-500"
            glow="0 2px 20px 0 rgba(99,102,241,0.12)"
            trend={summary.costChangePercent ?? undefined}
            trendLabel="vs last period"
            delay={0}
          />
          <KPICard
            label="Total Input Tokens"
            value={fmtTokens(summary.totalInputTokens)}
            icon={ArrowUpRight}
            iconColor="text-cyan-600"
            iconBg="bg-gradient-to-br from-cyan-50 to-cyan-100/70"
            accent="from-cyan-400 to-blue-500"
            glow="0 2px 20px 0 rgba(6,182,212,0.10)"
            delay={0.06}
          />
          <KPICard
            label="Total Output Tokens"
            value={fmtTokens(summary.totalOutputTokens)}
            icon={ArrowUpRight}
            iconColor="text-violet-600"
            iconBg="bg-gradient-to-br from-violet-50 to-violet-100/70"
            accent="from-violet-400 to-purple-500"
            glow="0 2px 20px 0 rgba(139,92,246,0.10)"
            delay={0.12}
          />
          <KPICard
            label="Documents Processed"
            value={String(summary.totalDocumentsProcessed)}
            icon={FileText}
            iconColor="text-emerald-600"
            iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100/70"
            accent="from-emerald-400 to-teal-500"
            glow="0 2px 20px 0 rgba(16,185,129,0.10)"
            trend={summary.documentsChangePercent ?? undefined}
            trendLabel="vs last period"
            delay={0.18}
          />
          <KPICard
            label="Avg Cost / Document"
            value={fmtCurrency(summary.averageCostPerDocument, currency)}
            icon={Cpu}
            iconColor="text-amber-600"
            iconBg="bg-gradient-to-br from-amber-50 to-amber-100/70"
            accent="from-amber-400 to-orange-400"
            glow="0 2px 20px 0 rgba(245,158,11,0.10)"
            delay={0.24}
          />
          <KPICard
            label="Est. Monthly Cost"
            value={fmtCurrency(summary.estimatedMonthlyCost, currency)}
            subValue={`Projected at current rate (${currency})`}
            icon={TrendingUp}
            iconColor="text-rose-600"
            iconBg="bg-gradient-to-br from-rose-50 to-rose-100/70"
            accent="from-rose-400 to-pink-500"
            glow="0 2px 20px 0 rgba(244,63,94,0.10)"
            delay={0.30}
          />
        </div>
      </section>

      {/* Total Cost Breakdown */}
      {(summary.stageSummary?.length || summary.modelSummary.length) > 0 && (
        <section>
          <SectionHeader
            icon={ReceiptText}
            title="Total Cost Breakdown"
            subtitle="Pipeline stages and models from LLM traces"
          />

          {(summary.traceTotalCost ?? 0) > 0 && (
            <div className="mb-5">
              <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] max-w-sm">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <Database size={12} className="text-indigo-600" />
                  Trace-Estimated (all runs)
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                  {fmtCurrency(summary.traceTotalCost ?? 0, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Per-document attribution from tracer.py JSONL logs
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {summary.stageSummary && summary.stageSummary.length > 0 && (
              <ChartCard
                title="Cost by Pipeline Stage"
                subtitle="Highest spend at top — hover a bar or stage name for a plain-language explanation"
              >
                <StageCostChart data={summary.stageSummary} />
              </ChartCard>
            )}
            {summary.modelSummary.length > 0 && (
              <ChartCard title="Model Contribution" subtitle="Trace-backed cost share by deployment">
                <ModelContributionChart data={summary.modelSummary} />
              </ChartCard>
            )}
          </div>

          {summary.stageSummary && summary.stageSummary.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200/70">
              <div className="grid grid-cols-5 gap-4 bg-slate-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-2">Stage</div>
                <div className="text-right">Cost</div>
                <div className="text-right">Input Tokens</div>
                <div className="text-right">Output Tokens</div>
              </div>
              {summary.stageSummary.map((stage) => {
                const color = getStageColor(stage.stageKey)
                const traceTotal = summary.traceTotalCost ?? summary.totalCost
                const share = traceTotal > 0 ? (stage.cost / traceTotal) * 100 : 0
                return (
                  <div
                    key={stage.stageKey}
                    className="grid grid-cols-5 gap-4 border-t border-slate-100/80 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="col-span-2 flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <StageTooltipLabel
                          stageKey={stage.stageKey}
                          stageName={stage.stageName}
                          labelClassName="text-xs font-semibold text-slate-700"
                        />
                        <span className="text-[10px] text-slate-400 tabular-nums">{share.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end text-xs font-semibold text-slate-800 tabular-nums">
                      {fmtCurrency(stage.cost, currency)}
                    </div>
                    <div className="flex items-center justify-end text-xs text-slate-500 tabular-nums">
                      {fmtTokens(stage.inputTokens)}
                    </div>
                    <div className="flex items-center justify-end text-xs text-slate-500 tabular-nums">
                      {fmtTokens(stage.outputTokens)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Cost Trend Charts */}
      <section>
        <SectionHeader
          icon={BarChart2}
          title="Cost Trends"
          subtitle="Daily spend and token consumption across trace-backed runs"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title={`Cost Trend — ${getCurrentMonthLabel()}`} subtitle="Daily AI spend across recorded activity">
            <CostTrendChart data={summary.costTrend} />
          </ChartCard>
          <ChartCard title="Token Consumption Trend" subtitle="Daily input and output token volume">
            <TokenTrendChart data={summary.costTrend} />
          </ChartCard>
        </div>
        {summary.stageSummary && summary.stageSummary.length > 0 && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Token Usage by Stage" subtitle="Stacked input vs output tokens per pipeline stage">
              <StageTokenChart data={summary.stageSummary} />
            </ChartCard>
            <ChartCard title="Cost by Model" subtitle="Platform-wide model spend from traces">
              <CostByModelChart data={summary.modelSummary} />
            </ChartCard>
          </div>
        )}
      </section>
    </motion.div>
  )
}

function AIPricingTab({
  summary,
}: {
  summary: CostingSummary
}) {
  return (
    <motion.div
      key="ai-pricing"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-10"
    >
      {/* Active agents + configured models (validated against backend registry) */}
      {summary.agentModelSummary && summary.agentModelSummary.length > 0 && (
        <section>
          <SectionHeader
            icon={Cpu}
            title="Pipeline Agents & Models"
            subtitle="Live agent-to-model mapping from the backend registry, validated against tracer.py usage"
          />
          <AgentModelPanel agents={summary.agentModelSummary} />
        </section>
      )}

      {/* Model-wise Breakdown */}
      <section>
        <SectionHeader
          icon={Cpu}
          title="Model-wise Cost Breakdown"
          subtitle="Cost and token usage aggregated per AI model"
        />
        <ModelBreakdownTable models={summary.modelSummary} totalCost={summary.totalCost} />
      </section>

      {/* Cost Distribution Charts */}
      <section>
        <SectionHeader
          icon={BarChart2}
          title="Cost Distribution by Model"
          subtitle="Visual breakdown of cost and token share across all models"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard title="Cost by Model" subtitle="Total spend per AI model">
            <CostByModelChart data={summary.modelSummary} />
          </ChartCard>
          <ChartCard title="Token Usage by Model" subtitle="Input vs output token split">
            <TokenStackedChart data={summary.modelSummary} />
          </ChartCard>
          <ChartCard title="Cost Distribution" subtitle="Relative cost share across models">
            <CostDistributionChart data={summary.modelSummary} />
          </ChartCard>
        </div>
      </section>

      {/* Model Pricing Reference */}
      <section>
        <SectionHeader
          icon={BookMarked}
          title="AI Model Pricing Reference"
          subtitle="Understand how token consumption translates to cost across all models"
        />
        <ModelPricingReference />
      </section>
    </motion.div>
  )
}

function DocumentsTab({
  summary,
  isLoading,
  onSelectDocument,
}: {
  summary: CostingSummary
  isLoading: boolean
  onSelectDocument: (id: string) => void
}) {
  return (
    <motion.div
      key="documents"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-10"
    >
      <section>
        <SectionHeader
          icon={Layers}
          title="Per Document Analysis"
            subtitle="Each card is one traced document or pipeline run. Open it to see which agents, models, and stages drove the cost."
        />
        <DocumentsSection
          documents={summary.documents}
          isLoading={isLoading}
          onSelectDocument={onSelectDocument}
        />
      </section>
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CostingDashboardPage() {
  const { selectedDocument, selectDocument, clearSelectedDocument } = useCostingStore()

  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['costing-summary'],
    queryFn: fetchCostingSummary,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const [activeTab, setActiveTab] = useState<CostingTab>('overview')
  const errorMessage =
    error instanceof Error ? error.message : isError ? 'Failed to load costing data' : null

  // Document drilldown view — full-page takeover
  if (selectedDocument) {
    return <DocumentDrilldown doc={selectedDocument} onBack={clearSelectedDocument} />
  }

  // Error state
  if (isError && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 mb-4">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Failed to load costing data</p>
          <p className="text-xs text-slate-500 mb-4">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!isLoading && summary && !hasLiveCostingData(summary)) {
    return <EmptyCostingState onRetry={() => void refetch()} />
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-20 border-b border-slate-200/50 bg-white/88 px-8 py-4 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500">
              AI Operations
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Model usage, spend, and document-level cost analytics</p>
          </div>
          <div className="flex items-center gap-3">
            {(summary?.traceTotalCost ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                <Database size={11} className="text-indigo-600" />
                LLM Traces
              </span>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNav active={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {isLoading && !summary ? (
          <LoadingShimmer />
        ) : summary ? (
          <div className="mx-auto max-w-7xl px-8 py-8">
            <div className="mb-8">
              <CostingHero summary={summary} />
            </div>
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <OverviewTab key="overview" summary={summary} />
              )}
              {activeTab === 'ai-pricing' && (
                <AIPricingTab key="ai-pricing" summary={summary} />
              )}
              {activeTab === 'documents' && (
                <DocumentsTab
                  key="documents"
                  summary={summary}
                  isLoading={isFetching}
                  onSelectDocument={(id) => void selectDocument(id)}
                />
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </AnimatePresence>

    </div>
  )
}
