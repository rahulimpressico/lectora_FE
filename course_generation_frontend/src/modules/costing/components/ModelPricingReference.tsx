import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Info,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Sparkles,
  Zap,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/cn'

// ─── Pricing data ──────────────────────────────────────────────────────────────

type Tier = 'flagship' | 'premium' | 'balanced' | 'economy'

interface ModelPricing {
  modelId: string
  modelName: string
  tier: Tier
  tierLabel: string
  inputCostPer1M: number
  outputCostPer1M: number
  approximate?: boolean
  tagline: string
  color: string
  accentFrom: string
  accentTo: string
  iconBg: string
}

const MODEL_PRICING: ModelPricing[] = [
  {
    modelId: 'o3',
    modelName: 'O3',
    tier: 'flagship',
    tierLabel: 'Flagship Reasoning',
    inputCostPer1M: 2.0,
    outputCostPer1M: 8.0,
    tagline: 'A0 rule-family classification — default deployment for Request Synthesizer',
    color: '#f59e0b',
    accentFrom: 'from-amber-500',
    accentTo: 'to-orange-500',
    iconBg: 'bg-amber-50 border-amber-200/60',
  },
  {
    modelId: 'o4-mini',
    modelName: 'O4 Mini',
    tier: 'flagship',
    tierLabel: 'Flagship Reasoning',
    inputCostPer1M: 1.1,
    outputCostPer1M: 4.4,
    tagline: 'Efficient reasoning model available for agent override',
    color: '#f97316',
    accentFrom: 'from-orange-500',
    accentTo: 'to-amber-400',
    iconBg: 'bg-orange-50 border-orange-200/60',
  },
  {
    modelId: 'gpt-5.4-mini',
    modelName: 'GPT-5.4 Mini',
    tier: 'economy',
    tierLabel: 'Economy',
    inputCostPer1M: 0.75,
    outputCostPer1M: 4.50,
    tagline: 'A0_TO, A1, and A2 — default deployment for TO extraction, outline, and content',
    color: '#8b5cf6',
    accentFrom: 'from-violet-500',
    accentTo: 'to-purple-500',
    iconBg: 'bg-violet-50 border-violet-200/60',
  },
  {
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    tier: 'premium',
    tierLabel: 'Premium',
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    tagline: 'Advanced multimodal model available for agent override',
    color: '#6366f1',
    accentFrom: 'from-indigo-500',
    accentTo: 'to-violet-500',
    iconBg: 'bg-indigo-50 border-indigo-200/60',
  },
  {
    modelId: 'gpt-4o-mini',
    modelName: 'GPT-4o Mini',
    tier: 'economy',
    tierLabel: 'Economy',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    tagline: 'Lightweight GPT-4o variant available for agent override',
    color: '#14b8a6',
    accentFrom: 'from-teal-500',
    accentTo: 'to-cyan-500',
    iconBg: 'bg-teal-50 border-teal-200/60',
  },
]

// ─── Tier config ───────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<Tier, { label: string; icon: typeof Sparkles; badgeCls: string }> = {
  flagship: {
    label: 'Flagship Reasoning',
    icon: Sparkles,
    badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200/70',
  },
  premium: {
    label: 'Premium',
    icon: Gauge,
    badgeCls: 'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
  },
  balanced: {
    label: 'Premium',
    icon: Zap,
    badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
  },
  economy: {
    label: 'Economy',
    icon: BookOpen,
    badgeCls: 'bg-violet-50 text-violet-700 border border-violet-200/70',
  },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FormulaChip({
  label,
  color,
  sub,
}: {
  label: string
  color: 'cyan' | 'violet' | 'indigo'
  sub?: string
}) {
  const palette = {
    cyan: 'bg-cyan-50 border-cyan-200/70 text-cyan-800',
    violet: 'bg-violet-50 border-violet-200/70 text-violet-800',
    indigo: 'bg-indigo-50 border-indigo-200/70 text-indigo-800',
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border px-3.5 py-2 text-center',
        palette[color],
      )}
    >
      <span className="text-[11px] font-bold leading-none">{label}</span>
      {sub && (
        <span className="mt-0.5 text-[9px] font-semibold opacity-60 uppercase tracking-wide leading-none">
          {sub}
        </span>
      )}
    </div>
  )
}

function FormulaOperator({ symbol }: { symbol: string }) {
  return (
    <span className="text-slate-400 font-bold text-sm select-none shrink-0">{symbol}</span>
  )
}

function PricingCard({ model, index }: { model: ModelPricing; index: number }) {
  const tier = TIER_CONFIG[model.tier]
  const TierIcon = tier.icon

  const totalRate = model.inputCostPer1M + model.outputCostPer1M
  const inputShare = Math.round((model.inputCostPer1M / totalRate) * 100)
  const outputShare = 100 - inputShare

  const approxPrefix = model.approximate ? '~' : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_0_rgba(0,0,0,0.08)] hover:border-slate-300/70 transition-all duration-200 overflow-hidden"
    >
      {/* Top accent line */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          model.accentFrom,
          model.accentTo,
        )}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
              model.iconBg,
            )}
          >
            <TierIcon size={14} style={{ color: model.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">{model.modelName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-none">
              {model.tagline}
            </p>
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider', tier.badgeCls)}>
          {tier.label}
        </span>
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Input rate */}
        <div className="rounded-xl bg-cyan-50/70 border border-cyan-100/60 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-md bg-cyan-100">
              <ArrowDownToLine size={9} className="text-cyan-600" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-600">
              Input
            </span>
          </div>
          <p className="text-sm font-bold text-cyan-900 tabular-nums leading-none">
            {approxPrefix}${model.inputCostPer1M.toFixed(2)}
          </p>
          <p className="text-[9px] text-cyan-600/70 font-medium mt-0.5">per 1M tokens</p>
        </div>

        {/* Output rate */}
        <div className="rounded-xl bg-violet-50/70 border border-violet-100/60 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-md bg-violet-100">
              <ArrowUpFromLine size={9} className="text-violet-600" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600">
              Output
            </span>
          </div>
          <p className="text-sm font-bold text-violet-900 tabular-nums leading-none">
            {approxPrefix}${model.outputCostPer1M.toFixed(2)}
          </p>
          <p className="text-[9px] text-violet-600/70 font-medium mt-0.5">per 1M tokens</p>
        </div>
      </div>

      {/* Input / Output cost ratio bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
            Cost weight
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-cyan-600 font-semibold tabular-nums">
              {inputShare}% input
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-[9px] text-violet-600 font-semibold tabular-nums">
              {outputShare}% output
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 flex">
          <div
            className="h-full rounded-l-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-700"
            style={{ width: `${inputShare}%` }}
          />
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-700"
            style={{ width: `${outputShare}%` }}
          />
        </div>
        <p className="mt-1.5 text-[9px] text-slate-400 font-medium">
          Output tokens cost {(model.outputCostPer1M / model.inputCostPer1M).toFixed(0)}× more than input
        </p>
      </div>
    </motion.div>
  )
}

function UnderstandingTokens({ open }: { open: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/60 px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200/70">
                  <Info size={11} className="text-slate-500" />
                </div>
                <p className="text-xs font-bold text-slate-700">What is a token?</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A token is a unit of text processed by an AI model — roughly 3–4 characters or
                ¾ of a word. The AI reads input tokens and generates output tokens.
              </p>
            </div>

            <div className="rounded-xl bg-cyan-50/60 border border-cyan-100/60 px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-100">
                  <ArrowDownToLine size={11} className="text-cyan-600" />
                </div>
                <p className="text-xs font-bold text-slate-700">Input tokens</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Everything sent <em>to</em> the model — your prompts, document content, and
                system instructions. Typically cheaper to process.
              </p>
              <p className="mt-2 text-[10px] font-semibold text-cyan-700 bg-cyan-100/60 rounded-lg px-2 py-1">
                1,000 words ≈ 1,300 input tokens
              </p>
            </div>

            <div className="rounded-xl bg-violet-50/60 border border-violet-100/60 px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100">
                  <ArrowUpFromLine size={11} className="text-violet-600" />
                </div>
                <p className="text-xs font-bold text-slate-700">Output tokens</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Everything the model <em>generates</em> — course content, assessments, and
                structured responses. Costs more because generation is computationally intensive.
              </p>
              <p className="mt-2 text-[10px] font-semibold text-violet-700 bg-violet-100/60 rounded-lg px-2 py-1">
                Output is typically 4–10× more expensive than input
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function ModelPricingReference() {
  const [tokensExpanded, setTokensExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-white via-white to-indigo-50/30 shadow-[0_1px_8px_0_rgba(99,102,241,0.06)] overflow-hidden"
    >
      {/* ── Header band ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-slate-100/80">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_3px_12px_rgba(99,102,241,0.35)]">
            <Info size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-none">
              AI Model Pricing Reference
            </h3>
            <p className="mt-1 text-[12px] text-slate-500 leading-relaxed max-w-2xl">
              AI processing costs are calculated based on the number of input and output tokens consumed
              by each model. Different models have different pricing rates, which directly influence
              document generation and processing costs.
            </p>
          </div>
        </div>
        <span className="shrink-0 mt-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
          Reference
        </span>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* ── Cost formula ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            How total cost is calculated
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FormulaChip label="Total Cost" color="indigo" sub="per document" />
            <FormulaOperator symbol="=" />
            <FormulaChip label="Input Tokens" color="cyan" sub="consumed" />
            <FormulaOperator symbol="×" />
            <FormulaChip label="Input Rate" color="cyan" sub="per 1M" />
            <FormulaOperator symbol="+" />
            <FormulaChip label="Output Tokens" color="violet" sub="generated" />
            <FormulaOperator symbol="×" />
            <FormulaChip label="Output Rate" color="violet" sub="per 1M" />
          </div>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Costs are measured per million tokens. Because output generation is computationally
            more intensive, output rates are consistently higher than input rates across all models.
          </p>
        </div>

        {/* ── Pricing cards grid ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Pricing by model
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <div className="h-2 w-2 rounded-sm bg-cyan-400" />
                Input rate
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <div className="h-2 w-2 rounded-sm bg-violet-400" />
                Output rate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {MODEL_PRICING.map((model, i) => (
              <PricingCard key={model.modelId} model={model} index={i} />
            ))}
          </div>
        </div>

        {/* ── Comparative rate table ────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-slate-200/60">
          <div className="grid grid-cols-4 gap-4 bg-slate-50/80 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-1">Model</div>
            <div className="text-center">Input / 1M tokens</div>
            <div className="text-center">Output / 1M tokens</div>
            <div className="text-center">Output / Input ratio</div>
          </div>
          {MODEL_PRICING.map((model, i) => (
            <div
              key={model.modelId}
              className={cn(
                'grid grid-cols-4 gap-4 px-5 py-3 text-xs items-center border-t border-slate-100/80 hover:bg-slate-50/50 transition-colors',
                i === 0 && 'border-t-0',
              )}
            >
              <div className="flex items-center gap-2 col-span-1">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: model.color }}
                />
                <span className="font-semibold text-slate-800">{model.modelName}</span>
                {model.approximate && (
                  <span className="text-[9px] text-slate-400 font-medium">approx.</span>
                )}
              </div>
              <div className="text-center">
                <span className="font-semibold text-cyan-700 tabular-nums bg-cyan-50 rounded-md px-2 py-0.5">
                  ${model.approximate ? '~' : ''}{model.inputCostPer1M.toFixed(2)}
                </span>
              </div>
              <div className="text-center">
                <span className="font-semibold text-violet-700 tabular-nums bg-violet-50 rounded-md px-2 py-0.5">
                  ${model.approximate ? '~' : ''}{model.outputCostPer1M.toFixed(2)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-600 font-medium tabular-nums">
                  {(model.outputCostPer1M / model.inputCostPer1M).toFixed(1)}×
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Understanding Tokens expander ─────────────────────────────────── */}
        <div className="border-t border-slate-100/80 pt-4">
          <button
            type="button"
            onClick={() => setTokensExpanded((v) => !v)}
            className="group flex w-full items-center justify-between rounded-xl px-4 py-3 border border-slate-200/60 bg-slate-50/60 hover:bg-slate-100/60 hover:border-slate-300/60 transition-all duration-150"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={13} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">
                Understanding Tokens — for non-technical stakeholders
              </span>
            </div>
            <ChevronDown
              size={14}
              className={cn(
                'text-slate-400 transition-transform duration-200',
                tokensExpanded && 'rotate-180',
              )}
            />
          </button>

          <UnderstandingTokens open={tokensExpanded} />
        </div>

        {/* ── Footnote ─────────────────────────────────────────────────────── */}
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Prices shown reflect published Azure OpenAI rates where available. GPT-5.4 Mini rates
          match tracer.py billing config. O3, O4 Mini, GPT-4o, and GPT-4o Mini rates are based on
          published OpenAI pricing. Actual billing is determined by the Azure OpenAI platform based on
          metered token consumption and may differ from values shown here.
        </p>

      </div>
    </motion.div>
  )
}
