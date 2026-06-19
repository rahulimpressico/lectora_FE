import type { JsonValue } from '../../../../../types'

interface Props {
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
}

export const BooleanEditor = ({ value, path, onUpdate }: Props) => {
  const on = value === true

  return (
    <div className="flex items-center gap-3 py-0.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onUpdate(path, !on)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          on ? 'bg-violet-500' : 'bg-slate-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
            on ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      <span className={`text-xs font-semibold ${on ? 'text-violet-600' : 'text-slate-400'}`}>
        {on ? 'Yes' : 'No'}
      </span>
    </div>
  )
}
