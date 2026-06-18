import { RulesEditorPanel } from './RulesEditorPanel'

interface RulesPanelProps {
  loading?: boolean
  loadError?: string | null
}

export function RulesPanel({ loading = false, loadError = null }: RulesPanelProps) {
  return <RulesEditorPanel loading={loading} loadError={loadError} />
}
