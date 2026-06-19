import { FIELD_BASE_CLS } from '../constants'
import type { JsonValue } from '../../../../../types'

interface Props {
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
}

export const JsonFallbackEditor = ({ value, path, onUpdate }: Props) => (
  <textarea
    rows={3}
    defaultValue={JSON.stringify(value, null, 2)}
    onBlur={(e) => {
      try { onUpdate(path, JSON.parse(e.target.value) as JsonValue) } catch { /* ignore invalid JSON */ }
    }}
    spellCheck={false}
    className={`${FIELD_BASE_CLS} resize-none font-mono text-xs`}
  />
)
