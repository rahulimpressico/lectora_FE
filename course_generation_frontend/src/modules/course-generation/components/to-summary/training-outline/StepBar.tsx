import { Check } from 'lucide-react'
import { STEPS } from './constants'

interface StepBarProps {
  current: number
}

export const StepBar = ({ current }: StepBarProps) => (
  <div className="flex items-center px-6 py-4 border-b border-slate-100">
    {STEPS.map((label, i) => (
      <div key={label} className="flex items-center flex-1 last:flex-none">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
              i < current
                ? 'bg-emerald-500 text-white shadow-[0_0_0_3px_rgb(16,185,129,0.15)]'
                : i === current
                  ? 'bg-indigo-600 text-white shadow-[0_0_0_3px_rgb(99,102,241,0.2)]'
                  : 'bg-slate-100 text-slate-400',
            ].join(' ')}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <span
            className={[
              'text-[11px] font-semibold whitespace-nowrap',
              i < current
                ? 'text-emerald-600'
                : i === current
                  ? 'text-indigo-600'
                  : 'text-slate-400',
            ].join(' ')}
          >
            {label}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className={[
              'flex-1 h-0.5 mx-2 mt-[-14px] rounded-full transition-all',
              i < current ? 'bg-emerald-400' : 'bg-slate-200',
            ].join(' ')}
          />
        )}
      </div>
    ))}
  </div>
)
