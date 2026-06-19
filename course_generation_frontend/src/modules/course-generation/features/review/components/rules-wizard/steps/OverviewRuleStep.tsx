import { Shield } from 'lucide-react'
import { formatKeyLabel } from '../../../../../utils/deepUpdate'
import { FieldEditor, isNumberPair } from '../FieldEditors'
import { INPUT_CLS } from '../constants'
import type { JsonObject, JsonValue } from '../../../../../types'
import { RULE_FAMILY_LABELS } from '../../../../../utils/rulePackTooltips'

// Keys that belong to named sections — excluded from overview
const SECTION_KEY_SETS: string[][] = [
  ['assessment_rules', 'assessment', 'exam_rules'],
  ['style_constants', 'style', 'writing_style', 'writing_standards'],
  ['compliance_elements', 'compliance', 'regulatory_elements'],
  ['content_rules', 'content', 'structural_rules', 'course_content_rules'],
  ['kc_placement_rules', 'kc_placement', 'knowledge_check_rules', 'kc_rules'],
  ['lectora_constraints', 'lms_constraints', 'authoring_constraints', 'tool_constraints'],
  ['error_tolerance', 'validation', 'retry_settings'],
]

function isSectionKey(key: string): boolean {
  return SECTION_KEY_SETS.some((candidates) => candidates.includes(key))
}

interface OverviewRuleStepProps {
  localRules: JsonObject
  onChange: (path: string[], value: JsonValue) => void
}

export function OverviewRuleStep({ localRules, onChange }: OverviewRuleStepProps) {
  // Collect top-level entries that are NOT section objects
  const overviewEntries = Object.entries(localRules).filter(([key, val]) => {
    if (isSectionKey(key)) return false
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) return false
    return true
  })

  const familyKey = ['rule_family', 'ruleFamily', 'family'].find((k) => k in localRules) ?? 'rule_family'
  const familyRaw = typeof localRules[familyKey] === 'string' ? (localRules[familyKey] as string) : ''
  const familyLabel = RULE_FAMILY_LABELS[familyRaw] ?? familyRaw

  // Separate word-count fields so we can render them as a pair
  const wcMinKey = ['min_word_count', 'minWordCount'].find((k) => typeof localRules[k] === 'number')
  const wcMaxKey = ['max_word_count', 'maxWordCount'].find((k) => typeof localRules[k] === 'number')

  // Remaining fields (excluding family and word-count keys we handle specially)
  const specialKeys = new Set([familyKey, wcMinKey, wcMaxKey].filter(Boolean) as string[])
  const remainingEntries = overviewEntries.filter(([k]) => !specialKeys.has(k))

  return (
    <div className="space-y-5">
      {/* Rule family */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Rule Family</label>
        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
          The governing compliance standard that controls all downstream rules.
        </p>
        <div className="relative">
          <input
            type="text"
            value={familyRaw}
            onChange={(e) => onChange([familyKey], e.target.value)}
            placeholder="e.g. insurance_ce, iarce, firm_element…"
            className={INPUT_CLS}
          />
          {familyLabel && familyLabel !== familyRaw && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1">
              <Shield size={11} className="text-violet-500 shrink-0" />
              <span className="text-[11px] font-semibold text-violet-600">{familyLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Word count range */}
      {(wcMinKey || wcMaxKey) && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Word Count Target</label>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            The acceptable word-count range for generated course content.
          </p>
          {wcMinKey && wcMaxKey ? (
            <FieldEditor
              value={[localRules[wcMinKey] as number, localRules[wcMaxKey] as number]}
              path={[wcMinKey]}
              onChange={(_path, val) => {
                if (isNumberPair(val)) {
                  onChange([wcMinKey], val[0])
                  onChange([wcMaxKey], val[1])
                }
              }}
            />
          ) : wcMinKey ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Min Words</p>
              <FieldEditor value={localRules[wcMinKey]} path={[wcMinKey]} onChange={onChange} />
            </div>
          ) : wcMaxKey ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Max Words</p>
              <FieldEditor value={localRules[wcMaxKey]} path={[wcMaxKey]} onChange={onChange} />
            </div>
          ) : null}
        </div>
      )}

      {/* All other top-level primitive fields */}
      {remainingEntries.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Additional Settings
          </p>
          {remainingEntries.map(([key, val]) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {formatKeyLabel(key)}
              </label>
              <FieldEditor value={val} path={[key]} onChange={onChange} />
            </div>
          ))}
        </div>
      )}

      {overviewEntries.length === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-8">
          No overview fields found in this rule pack.
        </p>
      )}
    </div>
  )
}
