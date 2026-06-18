import { FIELD_BASE_CLS } from '../constants'
import type { JsonValue } from '../../../../../../types'

interface Props {
  value: JsonValue
  path: string[]
  onUpdate: (path: string[], value: JsonValue) => void
}

export const NumberEditor = ({ value, path, onUpdate }: Props) => (
  <input
    type="number"
    value={typeof value === 'number' ? value : 0}
    onChange={(e) => onUpdate(path, Number(e.target.value))}
    className={FIELD_BASE_CLS}
  />
)
