import type { JsonObject, JsonValue } from '../types'

export function deepSet(obj: JsonObject, path: string[], value: JsonValue): JsonObject {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  if (rest.length === 0) {
    return { ...obj, [head]: value }
  }
  const child = (obj[head] ?? {}) as JsonObject
  return { ...obj, [head]: deepSet(child, rest, value) }
}

export function deepGet(obj: JsonObject, path: string[]): JsonValue | undefined {
  let current: JsonValue = obj
  for (const key of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }
    current = (current as JsonObject)[key]
  }
  return current
}

export function formatKeyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isJsonObject(val: JsonValue): val is JsonObject {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

export function isJsonArray(val: JsonValue): val is JsonValue[] {
  return Array.isArray(val)
}

export function isPrimitive(val: JsonValue): val is string | number | boolean | null {
  return !isJsonObject(val) && !isJsonArray(val)
}
