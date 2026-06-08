import { Shield } from 'lucide-react'
import { JsonEditorPanel } from './JsonEditorPanel'
import { useCourseStore } from '../../store/courseStore'
import type { JsonValue } from '../../types'

interface RulesPanelProps {
  loading?: boolean
  loadError?: string | null
}

export function RulesPanel({ loading = false, loadError = null }: RulesPanelProps) {
  const {
    rulesData,
    rulesOriginal,
    modifiedRulesPaths,
    updateRulesField,
    resetRulesField,
    setRulesData,
  } = useCourseStore()

  const handleResetAll = () => {
    if (rulesOriginal) setRulesData(rulesOriginal, rulesOriginal)
  }

  return (
    <JsonEditorPanel
      title="Rule Pack"
      subtitle="Content, assessment &amp; compliance constraints"
      icon={<Shield size={13} className="text-violet-600" />}
      iconBgClass="bg-violet-50"
      data={rulesData}
      originalData={rulesOriginal}
      modifiedPaths={modifiedRulesPaths}
      onUpdate={(path: string[], value: JsonValue) => updateRulesField(path, value)}
      onReset={(path: string[]) => resetRulesField(path)}
      onResetAll={handleResetAll}
      loading={loading}
      loadError={loadError}
      emptyMessage="Rule pack loads with the Training Outline."
    />
  )
}
