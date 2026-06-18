import { FIELD_BASE_CLS } from '../constants'
import type { JsonValue } from '../../../../../../types'

interface Props {
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
}

export const StringEditor = ({ value, path, onUpdate }: Props) => {
  const str    = typeof value === 'string' ? value : ''
  const isLong = str.length > 70 || str.includes('\n')

  if (isLong) {
    return (
      <textarea
        rows={3}
        value={str}
        onChange={(e) => onUpdate(path, e.target.value)}
        className={`${FIELD_BASE_CLS} resize-none`}
      />
    )
  }

  return (
    <input
      type="text"
      value={str}
      onChange={(e) => onUpdate(path, e.target.value)}
      className={FIELD_BASE_CLS}
    />
  )
}
