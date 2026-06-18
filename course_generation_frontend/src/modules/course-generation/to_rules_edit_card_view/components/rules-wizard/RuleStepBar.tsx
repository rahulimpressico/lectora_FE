import { Check } from 'lucide-react'
import type { StepDef } from './constants'

interface RuleStepBarProps {
  steps: StepDef[]
  current: number
}

export const RuleStepBar = ({ steps, current }: RuleStepBarProps) => (
  <div className="flex items-center px-6 py-4 border-b border-slate-100 overflow-x-auto">
    {steps.map((step, i) => (
      <div key={step.id} className="flex items-center flex-1 last:flex-none min-w-0">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className={[
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
              i < current
                ? 'bg-emerald-500 text-white shadow-[0_0_0_3px_rgb(16,185,129,0.15)]'
                : i === current
                  ? 'bg-violet-600 text-white shadow-[0_0_0_3px_rgb(139,92,246,0.2)]'
                  : 'bg-slate-100 text-slate-400',
            ].join(' ')}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </div>
          <span
            className={[
              'text-[9px] font-semibold whitespace-nowrap',
              i < current
                ? 'text-emerald-600'
                : i === current
                  ? 'text-violet-600'
                  : 'text-slate-400',
            ].join(' ')}
          >
            {step.label}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div
            className={[
              'flex-1 h-0.5 mx-1.5 mt-[-14px] rounded-full transition-all min-w-[8px]',
              i < current ? 'bg-emerald-400' : 'bg-slate-200',
            ].join(' ')}
          />
        )}
      </div>
    ))}
  </div>
)
