import type { CostingTrendPoint, ModelUsage, StageBreakdown } from '../../types'

/** Short axis labels for pipeline stages (full name stays in tooltips/tables). */
export const STAGE_CHART_LABELS: Record<string, string> = {
  a0_classification: 'Rule Classify',
  to_generation: 'TO Generation',
  outline_interpretation: 'Outline',
  structure_review: 'S1 Review',
  section_mapping: 'Sections',
  kc_planning: 'KC Planning',
  content_generation: 'Content',
  quality_assurance: 'S2 QA',
  course_editor: 'Editor',
  other: 'Other',
}

export function getStageChartLabel(stageKey: string, stageName: string): string {
  return STAGE_CHART_LABELS[stageKey] ?? stageName
}

export function sortStagesByCost(stages: StageBreakdown[]): StageBreakdown[] {
  return [...stages].sort((a, b) => b.cost - a.cost)
}

export function sortModelsByCost(models: ModelUsage[]): ModelUsage[] {
  return [...models].sort((a, b) => b.cost - a.cost)
}

/** Adaptive X-axis step so trend charts stay readable with few or many points. */
export function getTrendTickStep(pointCount: number): number {
  if (pointCount <= 1) return 1
  if (pointCount <= 7) return 1
  if (pointCount <= 14) return 2
  if (pointCount <= 31) return 5
  return Math.max(1, Math.ceil(pointCount / 6))
}

export function formatTrendDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTrendDateFull(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function hasTrendData(points: CostingTrendPoint[]): boolean {
  return points.some((p) => p.cost > 0 || p.inputTokens > 0 || p.outputTokens > 0)
}

export function stageChartHeight(stageCount: number, min = 180): number {
  return Math.max(min, stageCount * 40 + 24)
}
