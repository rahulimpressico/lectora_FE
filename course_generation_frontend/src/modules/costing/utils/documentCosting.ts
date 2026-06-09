import type { DocumentCost, StageBreakdown } from '../types'
import { getStageColor } from '../components/charts/chartTheme'

export function getTopStages(doc: DocumentCost, limit = 3): StageBreakdown[] {
  return [...doc.stageBreakdown]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit)
    .filter((s) => s.cost > 0 || s.inputTokens > 0 || s.outputTokens > 0)
}

export function getDocumentTypeBadgeClass(documentType: string): string {
  switch (documentType) {
    case 'Course Generation':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100'
    case 'TO Generation':
      return 'bg-sky-50 text-sky-700 border-sky-100'
    case 'Outline Processing':
      return 'bg-cyan-50 text-cyan-700 border-cyan-100'
    case 'Course Editor':
      return 'bg-violet-50 text-violet-700 border-violet-100'
    case 'Pipeline Run':
      return 'bg-amber-50 text-amber-700 border-amber-100'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

export function formatStageShare(stage: StageBreakdown, totalCost: number): string {
  if (totalCost <= 0) return '0%'
  return `${((stage.cost / totalCost) * 100).toFixed(1)}%`
}

export { getStageColor }
