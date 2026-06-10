/**
 * Shared course-configuration constants and derived-value helpers.
 *
 * Single source of truth for difficulty multipliers and word-count calculation
 * so courseStore and UI components stay in sync automatically.
 */

/** NAIC CE base words per credit hour (9 000 words = 1 CE hour). */
export const WORDS_PER_CREDIT_HOUR = 9_000

/**
 * Difficulty multipliers for the NAIC CE word-count formula.
 * Basic: no adjustment.  Intermediate: 25 % more depth.  Advanced: 50 % more.
 */
export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  basic:        1.0,
  intermediate: 1.25,
  advanced:     1.5,
}

/**
 * Calculate the target word count for a course given its duration and difficulty.
 *
 * Formula: `(durationHours × WORDS_PER_CREDIT_HOUR) / difficultyMultiplier`
 *
 * Returns `null` when either argument is missing/null so callers can
 * distinguish "not set" from "zero".
 */
export function calcWordCount(
  durationHours: number | null | undefined,
  difficultyLevel: string | null | undefined,
): number | null {
  if (durationHours == null || !difficultyLevel) return null
  const multiplier = DIFFICULTY_MULTIPLIERS[difficultyLevel.toLowerCase()] ?? 1.25
  return Math.round((durationHours * WORDS_PER_CREDIT_HOUR) / multiplier)
}
