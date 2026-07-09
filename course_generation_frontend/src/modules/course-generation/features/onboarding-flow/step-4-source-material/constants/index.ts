export const fileCardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, x: -20, scale: 0.96, transition: { duration: 0.18, ease: [0.55, 0, 1, 0.45] as const } },
}

export const hintVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.15, ease: [0.55, 0, 1, 0.45] as const } },
}

export const checkmarkSpring = {
  hidden: { scale: 0, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } },
}
