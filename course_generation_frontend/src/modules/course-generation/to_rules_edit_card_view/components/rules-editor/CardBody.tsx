import { formatKeyLabel } from '../../../utils/deepUpdate'
import { FieldRow } from './FieldRow'
import type { JsonValue } from '../../../../../types'

type JsonObject = Record<string, JsonValue>

interface CardBodyProps {
  data: JsonObject
  basePath: string[]
  modifiedPaths: Set<string>
  onUpdate: (path: string[], value: JsonValue) => void
  onReset: (path: string[]) => void
}

const isPlainObject = (v: JsonValue): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const CardBody = ({ data, basePath, modifiedPaths, onUpdate, onReset }: CardBodyProps) => (
  <div className="space-y-2.5">
    {Object.entries(data).map(([key, value]) => {
      const path = [...basePath, key]
      const pathKey = path.join('.')
      const modified = modifiedPaths.has(pathKey)

      if (isPlainObject(value)) {
        return (
          <div key={key} className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {formatKeyLabel(key)}
              </span>
            </div>
            <div className="p-3 space-y-2.5">
              {Object.entries(value).map(([subKey, subValue]) => {
                const subPath = [...path, subKey]
                const subPathKey = subPath.join('.')
                return (
                  <FieldRow
                    key={subKey}
                    fieldKey={subKey}
                    value={subValue}
                    path={subPath}
                    modified={modifiedPaths.has(subPathKey)}
                    onUpdate={onUpdate}
                    onReset={onReset}
                  />
                )
              })}
            </div>
          </div>
        )
      }

      return (
        <FieldRow
          key={key}
          fieldKey={key}
          value={value}
          path={path}
          modified={modified}
          onUpdate={onUpdate}
          onReset={onReset}
        />
      )
    })}
  </div>
)
