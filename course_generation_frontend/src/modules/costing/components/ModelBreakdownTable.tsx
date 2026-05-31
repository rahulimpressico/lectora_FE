import { motion } from 'framer-motion'
import type { ModelUsage } from '../types'
import { getModelColor } from './charts/chartTheme'

interface Props {
  models: ModelUsage[]
  totalCost: number
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`
}

export function ModelBreakdownTable({ models, totalCost }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70">
      {/* Table header */}
      <div className="grid grid-cols-6 gap-4 bg-slate-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <div className="col-span-2">Model</div>
        <div className="text-right">Cost</div>
        <div className="text-right">Input Tokens</div>
        <div className="text-right">Output Tokens</div>
        <div className="text-right">Requests</div>
      </div>

      {/* Rows */}
      {models.map((model, i) => {
        const color = getModelColor(model.modelId)
        const share = totalCost > 0 ? (model.cost / totalCost) * 100 : 0

        return (
          <motion.div
            key={model.modelId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="grid grid-cols-6 gap-4 border-t border-slate-100/80 px-5 py-3.5 text-sm hover:bg-slate-50/60 transition-colors"
          >
            {/* Model name + share bar */}
            <div className="col-span-2 flex items-center gap-3">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-xs truncate">{model.modelName}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-1 w-20 rounded-full bg-slate-100 overflow-hidden">
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
              <span className="font-semibold text-slate-800 tabular-nums text-xs">
                {fmtCost(model.cost)}
              </span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-slate-500 tabular-nums text-xs">{fmtTokens(model.inputTokens)}</span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-slate-500 tabular-nums text-xs">{fmtTokens(model.outputTokens)}</span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-slate-500 tabular-nums text-xs">{model.totalRequests.toLocaleString()}</span>
            </div>
          </motion.div>
        )
      })}

      {/* Totals row */}
      <div className="grid grid-cols-6 gap-4 border-t border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-bold text-slate-700">
        <div className="col-span-2">Total</div>
        <div className="text-right">{fmtCost(models.reduce((s, m) => s + m.cost, 0))}</div>
        <div className="text-right">
          {fmtTokens(models.reduce((s, m) => s + m.inputTokens, 0))}
        </div>
        <div className="text-right">
          {fmtTokens(models.reduce((s, m) => s + m.outputTokens, 0))}
        </div>
        <div className="text-right">
          {models.reduce((s, m) => s + m.totalRequests, 0).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
