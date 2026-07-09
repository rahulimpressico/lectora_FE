export const chipVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 4 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.15, ease: [0.55, 0, 1, 0.45] as const },
  },
}
