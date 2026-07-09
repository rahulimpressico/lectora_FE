import { Shield, RotateCcw } from 'lucide-react'
import { Spinner } from '@/shared/components/Spinner'
import { useCourseStore } from '../../onboarding-flow/store'
import { selectEffectiveRulePack } from '../../onboarding-flow/store/selectors'
import { formatKeyLabel } from '../../../utils/deepUpdate'
import { CARD_DEFS } from './rules-editor/constants'
import { getTooltip } from './rules-editor/helpers'
import { OverviewCard } from './rules-editor/OverviewCard'
import { RuleCard } from './rules-editor/RuleCard'
import type { JsonValue } from '../../../types'

type JsonObject = Record<string, JsonValue>

interface RulesEditorPanelProps {
  loading?: boolean
  loadError?: string | null
}

export const RulesEditorPanel = ({ loading = false, loadError = null }: RulesEditorPanelProps) => {
  const {
    rulesData,
    updatedRulesData,
    modifiedRulesPaths,
    updateRulesField,
    resetRulesField,
    resetAllRulesEdits,
  } = useCourseStore()

  const effectiveRules = selectEffectiveRulePack({ rulesData, updatedRulesData })

  const handleResetAll = () => resetAllRulesEdits()

  const dirtyCount = modifiedRulesPaths.size

  // Resolve which card defs have a matching top-level key in the effective rule pack
  const matchedCards: Array<{ def: typeof CARD_DEFS[number]; sectionKey: string; sectionData: JsonObject }> = []
  const knownObjectKeys = new Set<string>()

  if (effectiveRules) {
    for (const def of CARD_DEFS) {
      if (def.candidateKeys === null) continue
      for (const candidate of def.candidateKeys) {
        if (candidate in effectiveRules) {
          const val = effectiveRules[candidate]
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            matchedCards.push({ def, sectionKey: candidate, sectionData: val as JsonObject })
            knownObjectKeys.add(candidate)
            break
          }
        }
      }
    }
  }

  // Top-level primitive / array fields for the Overview card
  const primitiveFields: [string, JsonValue][] = effectiveRules
    ? Object.entries(effectiveRules).filter(([key, val]) => {
        if (knownObjectKeys.has(key)) return false
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) return false
        return true
      })
    : []

  // Top-level object keys not matched by any card def (catch-all)
  const unmatchedObjectEntries: [string, JsonObject][] = effectiveRules
    ? (Object.entries(effectiveRules).filter(
        ([key, val]) =>
          !knownObjectKeys.has(key) &&
          typeof val === 'object' &&
          val !== null &&
          !Array.isArray(val),
      ) as [string, JsonObject][])
    : []

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f4f6f9]">
      {/* Sticky panel header */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-5 py-3.5 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50">
              <Shield size={13} className="text-violet-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Rule Pack</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Content, assessment &amp; compliance constraints
              </p>
            </div>
          </div>

          {dirtyCount > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                <span className="h-1.5 w-1.5 inline-block rounded-full bg-amber-400" />
                {dirtyCount} unsaved
              </span>
              <button
                type="button"
                onClick={handleResetAll}
                title="Reset all changes"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm"
              >
                <RotateCcw size={11} />
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        ) : !effectiveRules ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-slate-500">Rule pack loads with the Training Outline.</p>
          </div>
        ) : (
          <>
            <OverviewCard
              primitiveFields={primitiveFields}
              modifiedPaths={modifiedRulesPaths}
              onUpdate={updateRulesField}
              onReset={resetRulesField}
            />

            {matchedCards.map(({ def, sectionKey, sectionData }) => (
              <RuleCard
                key={def.id}
                def={def}
                sectionKey={sectionKey}
                sectionData={sectionData}
                modifiedPaths={modifiedRulesPaths}
                onUpdate={updateRulesField}
                onReset={resetRulesField}
              />
            ))}

            {unmatchedObjectEntries.map(([key, val]) => (
              <RuleCard
                key={key}
                def={{
                  id: key,
                  label: formatKeyLabel(key),
                  description:
                    getTooltip(key) || `Additional ${formatKeyLabel(key).toLowerCase()} settings.`,
                  Icon: Shield,
                  accent: 'slate',
                  candidateKeys: [key],
                }}
                sectionKey={key}
                sectionData={val}
                modifiedPaths={modifiedRulesPaths}
                onUpdate={updateRulesField}
                onReset={resetRulesField}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
