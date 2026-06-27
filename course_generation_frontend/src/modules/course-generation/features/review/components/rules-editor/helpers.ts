import { RULE_PACK_TOOLTIPS } from '../../../../utils/rulePackTooltips'

export { isStringArray, isNumberPair } from '@/shared/form/PrimitiveFieldEditors'

export const getTooltip = (key: string): string => RULE_PACK_TOOLTIPS[key] ?? ''
