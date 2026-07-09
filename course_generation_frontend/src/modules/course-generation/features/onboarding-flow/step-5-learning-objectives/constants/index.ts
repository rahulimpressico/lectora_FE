export const modeCardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

export const objectiveRowVariant = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit: { opacity: 0, x: -16, height: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
}

export const AI_CONTEXT_BULLETS = [
  'Course title & description',
  'Duration & difficulty',
  'Target audience',
  'Source materials',
]
