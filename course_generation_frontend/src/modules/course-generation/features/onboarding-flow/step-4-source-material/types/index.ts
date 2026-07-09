import type { SourceRole } from '../../../../types'

export interface AnalyzableDoc {
  blobPath: string
  sourceRole?: SourceRole
  extractHint?: string
}
