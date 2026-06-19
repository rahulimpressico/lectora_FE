import { FieldRow } from '../FieldEditors'
import type { JsonObject, JsonValue } from '../../../../../types'

interface SectionRuleStepProps {
  sectionKey: string
  data: JsonObject
  onChange: (path: string[], value: JsonValue) => void
}

export function SectionRuleStep({ sectionKey, data, onChange }: SectionRuleStepProps) {
  const entries = Object.entries(data)

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic text-center py-8">
        No fields found in this section.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, val]) => (
        <FieldRow
          key={key}
          fieldKey={key}
          value={val}
          path={[sectionKey, key]}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
