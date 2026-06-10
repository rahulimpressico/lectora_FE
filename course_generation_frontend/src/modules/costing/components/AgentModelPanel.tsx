import { motion } from 'framer-motion'
import { Bot, Cpu, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import type { AgentModelSummary } from '../types'
import { getStageColor } from './charts/chartTheme'
import { StageTooltipLabel } from './StageTooltipLabel'

interface Props {
  agents: AgentModelSummary[]
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`
}

export function AgentModelPanel({ agents }: Props) {
  if (!agents.length) return null

  const activeCount = agents.filter((a) => a.totalRequests > 0).length
  const overriddenCount = agents.filter((a) => a.isOverridden).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 size={12} />
          {agents.length} pipeline agents configured
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
          <Sparkles size={12} />
          {activeCount} with trace activity
        </span>
        {overriddenCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            <AlertCircle size={12} />
            {overriddenCount} model override{overriddenCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_8px_0_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)_repeat(3,minmax(72px,0.7fr))] gap-3 bg-slate-50/80 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <div>Agent</div>
          <div>Role</div>
          <div>Model (configured)</div>
          <div className="text-right">Requests</div>
          <div className="text-right">Tokens</div>
          <div className="text-right">Cost</div>
        </div>

        {agents.map((agent, i) => {
          const stageColor = getStageColor(agent.stageKey)
          const hasActivity = agent.totalRequests > 0
          const deploymentMismatch =
            hasActivity &&
            agent.observedDeployments.length > 0 &&
            !agent.observedDeployments.includes(agent.configuredDeployment.toLowerCase())

          return (
            <motion.div
              key={agent.agentId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)_repeat(3,minmax(72px,0.7fr))] gap-3 border-t border-slate-100/80 px-5 py-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 bg-white"
                    style={{ boxShadow: `inset 0 0 0 1px ${stageColor}22` }}
                  >
                    <Bot size={13} style={{ color: stageColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{agent.agentName}</p>
                    <p className="text-[10px] font-medium text-slate-400">{agent.agentId}</p>
                  </div>
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
                  <span>Stage:</span>
                  <StageTooltipLabel
                    stageKey={agent.stageKey}
                    stageName={agent.stageName}
                    labelClassName="font-medium text-[10px]"
                    labelStyle={{ color: stageColor }}
                  />
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] leading-5 text-slate-600">{agent.role}</p>
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2.5 py-1.5">
                  <Cpu size={11} className="text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-indigo-800">
                    {agent.configuredDeploymentLabel}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400 font-mono">
                  {agent.configuredDeployment}
                </p>
                {agent.isOverridden && (
                  <p className="mt-1 text-[10px] font-medium text-amber-600">
                    Override (default: {agent.defaultDeployment})
                  </p>
                )}
                {deploymentMismatch && (
                  <p className="mt-1 text-[10px] font-medium text-amber-600">
                    Observed: {agent.observedDeployments.join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end text-xs font-semibold text-slate-800 tabular-nums">
                {hasActivity ? agent.totalRequests.toLocaleString() : '—'}
              </div>
              <div className="flex items-center justify-end text-[11px] text-slate-500 tabular-nums">
                {hasActivity ? (
                  <span>
                    {fmtTokens(agent.inputTokens + agent.outputTokens)}
                  </span>
                ) : (
                  '—'
                )}
              </div>
              <div className="flex items-center justify-end text-xs font-semibold text-slate-800 tabular-nums">
                {hasActivity ? fmtCost(agent.cost) : '—'}
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        Model assignments come from the backend model registry (<code className="text-[10px]">GET /settings</code>).
        Request and cost columns reflect actual <code className="text-[10px]">tracer.py</code> JSONL logs per agent.
      </p>
    </div>
  )
}
