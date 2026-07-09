import type { JsonObject } from '../../../types'
import type { CourseState } from './types/index'

/**
 * Single source of truth for "which TO/Rule Pack should the app show or send
 * to the backend right now" — prefer the user's edit draft if one exists,
 * otherwise fall back to the original generated data. Every read site should
 * go through these selectors instead of reading `toData`/`rulesData` (the
 * originals) directly, so "prefer updated, else original" never gets
 * re-implemented ad hoc at each call site.
 */

export function selectEffectiveTO(
  state: Pick<CourseState, 'toData' | 'updatedToData'>,
): JsonObject | null {
  return state.updatedToData ?? state.toData
}

export function selectEffectiveRulePack(
  state: Pick<CourseState, 'rulesData' | 'updatedRulesData'>,
): JsonObject | null {
  return state.updatedRulesData ?? state.rulesData
}
