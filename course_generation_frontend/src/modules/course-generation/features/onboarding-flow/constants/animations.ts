/**
 * Shared Framer Motion variants reused across onboarding-flow steps.
 * Extracted verbatim from the step files that previously duplicated them.
 */

export const EASE_ENTRY: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_ENTRY } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE_ENTRY } },
}

export const cardEnter = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_ENTRY } },
}

export const miniCardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.0 } },
}
