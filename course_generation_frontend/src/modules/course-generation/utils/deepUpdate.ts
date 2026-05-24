import type { JsonObject, JsonValue } from '../types'

/**
 * Immutably sets `value` at `path` inside `obj`.
 *
 * Handles arrays in the middle of the path: when the current child is an
 * array the next path segment is treated as a numeric index and a new array
 * is returned (no more spreading arrays into plain objects).
 */
export function deepSet(obj: JsonObject, path: string[], value: JsonValue): JsonObject {
  if (path.length === 0) return obj
  const [head, ...rest] = path

  // Base case — set leaf directly on this object
  if (rest.length === 0) {
    return { ...obj, [head]: value }
  }

  const child = obj[head]

  // Child is an array → consume the next segment as a numeric index so the
  // array type is preserved in the returned data.
  if (Array.isArray(child)) {
    const idx = Number(rest[0])
    const newArr = [...child] as JsonValue[]
    if (rest.length === 1) {
      // The index IS the final target
      newArr[idx] = value
    } else {
      // Keep traversing deeper into the array element
      newArr[idx] = deepSet(
        ((child[idx] as JsonObject | undefined) ?? {}) as JsonObject,
        rest.slice(1),
        value,
      )
    }
    return { ...obj, [head]: newArr }
  }

  // Regular object traversal
  return { ...obj, [head]: deepSet((child ?? {}) as JsonObject, rest, value) }
}

/**
 * Reads the value at `path` inside `obj`.
 * Correctly traverses through arrays using numeric indices.
 */
export function deepGet(obj: JsonObject, path: string[]): JsonValue | undefined {
  let current: JsonValue = obj
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    if (Array.isArray(current)) {
      current = current[Number(key)]
    } else {
      current = (current as JsonObject)[key]
    }
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
