import type { JsonObject, JsonValue } from '../../../../types'

export interface OutlineSectionsEditorProps {
  toData: JsonObject
  isEditing: boolean
  expandedSections: Set<number>
  onToggleSection: (index: number) => void
  onUpdate: (path: string[], value: JsonValue) => void
}
