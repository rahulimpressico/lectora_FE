import { BarChart2 } from 'lucide-react'

interface Props {
  message?: string
  height?: number
}

export function ChartEmptyState({
  message = 'No data for this chart yet',
  height = 200,
}: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center px-6"
      style={{ minHeight: height }}
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200/80">
        <BarChart2 size={16} className="text-slate-400" />
      </div>
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  )
}
