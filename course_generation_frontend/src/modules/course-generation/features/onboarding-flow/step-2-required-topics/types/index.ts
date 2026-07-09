export interface RegeneratePromptModalProps {
  open: boolean
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface RegeneratePromptModalFormProps {
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface TopicChipProps {
  topic: string
  onRemove: () => void
  onEdit: (newValue: string) => void
}
