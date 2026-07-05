type TOTaskStatus = 'processing' | 'completed' | 'failed' | 'cancelled'

const GENERIC_TO_ERROR =
  'Training Outline generation could not be completed. Please try again.'

function normalize(message: string): string {
  return message.trim()
}

function hasTechnicalTOMessage(message: string): boolean {
  return /\ba0\b|\ba1\b|\bs1\b|pipeline|agent|validator|s1_refine/i.test(message)
}

export function toUserFacingTOErrorMessage(message: string): string {
  const trimmed = normalize(message)
  if (!trimmed) return GENERIC_TO_ERROR
  if (
    /^s1 failed/i.test(trimmed) ||
    /blockers?\s*=|warnings?\s*=/i.test(trimmed) ||
    (/section\s+\d+/i.test(trimmed) &&
      /(subtopic|objective|compressed|learning|outline)/i.test(trimmed))
  ) {
    return GENERIC_TO_ERROR
  }
  return hasTechnicalTOMessage(trimmed) ? GENERIC_TO_ERROR : trimmed
}

export function toUserFacingTOStatusMessage(message: string): string {
  const trimmed = normalize(message)
  if (!trimmed) return trimmed
  if (
    /^s1 failed/i.test(trimmed) ||
    /blockers?\s*=|warnings?\s*=/i.test(trimmed) ||
    /s1 requires refinement/i.test(trimmed)
  ) {
    return 'Checking outline quality…'
  }
  if (/s1_refine|polish|repair/i.test(trimmed)) {
    return 'Improving the outline…'
  }
  if (/\ba0\b|\bparse\b|\bextract\b|\bread(?:ing)?\b|\bdraft/i.test(trimmed)) {
    return 'Reading your files and drafting the outline…'
  }
  if (/\bs1\b|validat|review|quality/i.test(trimmed)) {
    return 'Reviewing the outline…'
  }
  if (/\ba1\b|finaliz|finalis|prepare|\bready\b/i.test(trimmed)) {
    return 'Preparing the final outline for your review…'
  }
  if (/pipeline|agent|validator/i.test(trimmed)) {
    return 'Working on your training outline…'
  }
  return trimmed
}

export function toUserFacingTOTaskMessage(
  message: string,
  status: TOTaskStatus,
): string {
  if (status === 'completed') {
    return 'Training Outline ready to review.'
  }
  if (status === 'failed') {
    return 'Training Outline could not be completed.'
  }
  if (status === 'cancelled') {
    return 'Training Outline generation was cancelled.'
  }

  const friendly = toUserFacingTOStatusMessage(message)
  return friendly || 'Working on your training outline…'
}

export function toUserFacingPipelineLogMessage(message: string): string {
  const trimmed = normalize(message)
  if (!trimmed) return trimmed

  if (/retry|recoverable|improving and retrying/i.test(trimmed)) {
    return 'Making improvements and trying again…'
  }
  if (/connecting to .*pipeline|generation pipeline|course generation pipeline/i.test(trimmed)) {
    return 'Connecting to course generation…'
  }
  if (/\ba1\b|reviewed training outline|enriched course structure|learning objectives/i.test(trimmed)) {
    return 'Preparing the course structure…'
  }
  if (/\bs1\b|section_mapper|kc_planner|mapping sections|lesson flow/i.test(trimmed)) {
    return 'Organizing sections and lesson flow…'
  }
  if (/\ba2\b|writing course content|lesson content|knowledge check/i.test(trimmed)) {
    return 'Writing course content…'
  }
  if (/\bs2\b|reviewing generated content|quality standards|compliance/i.test(trimmed)) {
    return 'Reviewing generated content…'
  }
  if (/\ba6\b|assembly|assembling|formatting|render|export|download/i.test(trimmed)) {
    return 'Assembling your course document…'
  }
  if (/agent|validator|pipeline/i.test(trimmed)) {
    return 'Working on your course…'
  }

  return trimmed
}
