import type { JsonPrimitive } from '../types';

/**
 * Parses a raw string input into a typed JsonPrimitive.
 * Converts "true"/"false" → boolean, numeric strings → number,
 * and everything else → string.
 */
export function parseInput(raw: string, originalType: string): JsonPrimitive {
  if (originalType === 'number') {
    const n = Number(raw);
    return isNaN(n) ? raw : n;
  }
  if (originalType === 'boolean') {
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;
    return raw;
  }
  return raw;
}
