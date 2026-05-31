import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCostingStore } from '../store/costingStore'
import type { CostingSummary } from '../types'
import { KPICard } from '../components/KPICard'
import { ModelBreakdownTable } from '../components/ModelBreakdownTable'
import { ModelPricingReference } from '../components/ModelPricingReference'
import { DocumentDrilldown } from '../components/DocumentDrilldown'
import { DocumentsSection } from '../components/DocumentsSection'
import { CostByModelChart } from '../components/charts/CostByModelChart'
import { TokenStackedChart } from '../components/charts/TokenStackedChart'
import { CostDistributionChart } from '../components/charts/CostDistributionChart'
import { CostTrendChart } from '../components/charts/CostTrendChart'
import { TokenTrendChart } from '../components/charts/TokenTrendChart'

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
            value={`$${summary.totalCost.toFixed(4)}`}
            subValue="Current period"
            icon={DollarSign}
            iconColor="text-indigo-600"
            iconBg="bg-gradient-to-br from-indigo-50 to-indigo-100/70"
            accent="from-indigo-500 to-violet-500"
            glow="0 2px 20px 0 rgba(99,102,241,0.12)"
            trend={summary.costChangePercent}
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
            trend={summary.documentsChangePercent}
            trendLabel="vs last period"
            delay={0.18}
          />
          <KPICard
            label="Avg Cost / Document"
            value={`$${summary.averageCostPerDocument.toFixed(4)}`}
            icon={Cpu}
            iconColor="text-amber-600"
            iconBg="bg-gradient-to-br from-amber-50 to-amber-100/70"
            accent="from-amber-400 to-orange-400"
            glow="0 2px 20px 0 rgba(245,158,11,0.10)"
            delay={0.24}
          />
          <KPICard
            label="Est. Monthly Cost"
            value={`$${summary.estimatedMonthlyCost.toFixed(2)}`}
            subValue="Projected at current rate"
            icon={TrendingUp}
            iconColor="text-rose-600"
            iconBg="bg-gradient-to-br from-rose-50 to-rose-100/70"
            accent="from-rose-400 to-pink-500"
            glow="0 2px 20px 0 rgba(244,63,94,0.10)"
            delay={0.30}
          />
        </div>
      </section>

      {/* Cost Trend Charts */}
      <section>
        <SectionHeader
          icon={BarChart2}
          title="Cost Trends"
          subtitle="Daily spend and token consumption over the current period"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Cost Trend — May 2026" subtitle="Daily AI spend over the last 31 days">
            <CostTrendChart data={summary.costTrend} />
          </ChartCard>
          <ChartCard title="Token Consumption Trend" subtitle="Daily input and output token volume">
            <TokenTrendChart data={summary.costTrend} />
          </ChartCard>
        </div>
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
          subtitle="Search, filter, and sort all processed documents — click any card to view a full cost breakdown"
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
  const {
    summary,
    isLoading,
    error,
    selectedDocument,
    loadSummary,
    selectDocument,
    clearSelectedDocument,
  } = useCostingStore()

  const [activeTab, setActiveTab] = useState<CostingTab>('overview')

  useEffect(() => {
    if (!summary) {
      void loadSummary()
    }
  }, [summary, loadSummary])

  // Document drilldown view — full-page takeover
  if (selectedDocument) {
    return <DocumentDrilldown doc={selectedDocument} onBack={clearSelectedDocument} />
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 mb-4">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Failed to load costing data</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">

      {/* Sticky page header */}
      <div className="border-b border-slate-200/50 bg-white/90 backdrop-blur-xl px-8 pt-4 pb-4 sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">
                AI Operations
              </p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Costing Dashboard
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 max-w-md leading-relaxed">
                Token consumption, model usage, and cost visibility across all generated courses.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live data · May 2026
              </span>
              <button
                type="button"
                onClick={() => void loadSummary()}
                disabled={isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
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
                  isLoading={isLoading}
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
