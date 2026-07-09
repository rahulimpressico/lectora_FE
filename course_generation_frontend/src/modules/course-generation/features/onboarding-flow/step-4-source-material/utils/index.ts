import type { AnalyzableDoc } from '../types'

/** Build a deterministic cache key from the current set of analyzable docs. */
export function buildAnalysisCacheKey(docs: AnalyzableDoc[]): string {
  return JSON.stringify(
    [...docs]
      .sort((a, b) => a.blobPath.localeCompare(b.blobPath))
      .map((d) => ({
        blobPath: d.blobPath,
        sourceRole: d.sourceRole ?? 'primary_source',
        extractHint: d.extractHint ?? '',
      })),
  )
}
