export interface RegeneratePromptModalProps {
  open: boolean
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface RegeneratePromptModalFormProps {
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface EditableObjectivesListProps {
  objectives: string[]
  onChange: (objectives: string[]) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}
