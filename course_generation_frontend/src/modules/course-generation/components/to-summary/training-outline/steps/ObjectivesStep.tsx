import { useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getObjectivesKey, getObjectives } from '../helpers'
import type { JsonObject } from '../helpers'

interface ObjectivesStepProps {
  localTO: JsonObject
  onUpdate: (key: string, objectives: string[]) => void
}

export const ObjectivesStep = ({ localTO, onUpdate }: ObjectivesStepProps) => {
  const key        = getObjectivesKey(localTO)
  const objectives = getObjectives(localTO)

  const handleChange = useCallback(
    (idx: number, value: string) => {
      const updated = [...objectives]
      updated[idx] = value
      onUpdate(key, updated)
    },
    [objectives, key, onUpdate],
  )

  const handleAdd = useCallback(
    () => onUpdate(key, [...objectives, '']),
    [objectives, key, onUpdate],
  )

  const handleRemove = useCallback(
    (idx: number) => onUpdate(key, objectives.filter((_, i) => i !== idx)),
    [objectives, key, onUpdate],
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
        <p className="text-xs text-indigo-700 leading-relaxed">
          Learning objectives describe what participants will be able to do after completing the
          course. Write each objective starting with a verb like{' '}
          <strong>Understand</strong>, <strong>Apply</strong>, or <strong>Identify</strong>.
        </p>
      </div>

      {objectives.length === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-4">
          No learning objectives found. Add some below.
        </p>
      )}

      <div className="space-y-3">
        {objectives.map((obj, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold mt-2">
              {i + 1}
            </div>
            <textarea
              rows={2}
              value={obj}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder={`Learning objective ${i + 1}…`}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors mt-1.5"
              title="Remove objective"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <Plus size={14} />
        Add Objective
      </button>
    </div>
  )
}
