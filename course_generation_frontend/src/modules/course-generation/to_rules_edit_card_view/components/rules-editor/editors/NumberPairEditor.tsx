import { isNumberPair } from '../helpers'
import type { JsonValue } from '../../../../../../types'

interface Props {
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
}

const pairCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all'

export const NumberPairEditor = ({ value, path, onUpdate }: Props) => {
  const pair = isNumberPair(value) ? value : ([0, 0] as [number, number])

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Min</p>
        <input
          type="number"
          value={pair[0]}
          onChange={(e) => onUpdate(path, [Number(e.target.value), pair[1]])}
          className={pairCls}
        />
      </div>
      <span className="text-slate-400 text-sm font-semibold pt-5">–</span>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Max</p>
        <input
          type="number"
          value={pair[1]}
          onChange={(e) => onUpdate(path, [pair[0], Number(e.target.value)])}
          className={pairCls}
        />
      </div>
    </div>
  )
}
