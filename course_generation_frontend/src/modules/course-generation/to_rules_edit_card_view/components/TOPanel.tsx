import { BookOpen } from 'lucide-react'
import { JsonEditorPanel } from './JsonEditorPanel'
import { useCourseStore } from '../../store/courseStore'
import type { JsonValue } from '../../types'

interface TOPanelProps {
  loading?: boolean
  loadError?: string | null
}

export function TOPanel({ loading = false, loadError = null }: TOPanelProps) {
  const {
    toData,
    toOriginal,
    modifiedTOPaths,
    updateTOField,
    resetTOField,
    setTOData,
  } = useCourseStore()

  const handleResetAll = () => {
    if (toOriginal) setTOData(toOriginal, toOriginal)
  }

  return (
    <JsonEditorPanel
      title="Training Outline"
      subtitle="Review and adjust the AI-generated course structure"
      icon={<BookOpen size={13} className="text-indigo-600" />}
      iconBgClass="bg-indigo-50"
      data={toData}
      originalData={toOriginal}
      modifiedPaths={modifiedTOPaths}
      onUpdate={(path: string[], value: JsonValue) => updateTOField(path, value)}
      onReset={(path: string[]) => resetTOField(path)}
      onResetAll={handleResetAll}
      loading={loading}
      loadError={loadError}
      emptyMessage="Generate a Training Outline or open a saved course to review its outline."
    />
  )
}
