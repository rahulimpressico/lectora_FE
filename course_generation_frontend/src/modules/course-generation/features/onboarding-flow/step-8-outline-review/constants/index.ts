export const SECTIONS_KEYS = ['sections', 'modules'] as const

export const badgeVariant = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
}
