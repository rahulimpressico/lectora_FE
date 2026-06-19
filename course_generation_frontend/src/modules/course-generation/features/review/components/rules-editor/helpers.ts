import { RULE_PACK_TOOLTIPS } from '../../../../utils/rulePackTooltips'
import type { JsonValue } from '../../../../types'

export const getTooltip = (key: string): string => RULE_PACK_TOOLTIPS[key] ?? ''

export const isStringArray = (v: JsonValue): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

export const isNumberPair = (v: JsonValue): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number')
