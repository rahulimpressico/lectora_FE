export interface ModelUsage {
  modelId: string
  modelName: string
  inputTokens: number
  outputTokens: number
  totalRequests: number
  cost: number
}

export type StageKey =
  | 'to_generation'
  | 'content_generation'
  | 'assessment_generation'
  | 'image_generation'
  | 'metadata_generation'
  | 'search_operations'
  | 'other'

export interface StageBreakdown {
  stageKey: StageKey
  stageName: string
  inputTokens: number
  outputTokens: number
  cost: number
  requests: number
}

export interface DocumentCost {
  documentId: string
  documentName: string
  documentType: string
  status: 'completed' | 'in-progress' | 'failed'
  totalCost: number
  inputTokens: number
  outputTokens: number
  totalRequests: number
  modelsUsed: string[]
  lastUpdated: string
  modelBreakdown: ModelUsage[]
  stageBreakdown: StageBreakdown[]
}

export interface CostingTrendPoint {
  date: string
  cost: number
  inputTokens: number
  outputTokens: number
}

export interface CostingSummary {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalDocumentsProcessed: number
  averageCostPerDocument: number
  estimatedMonthlyCost: number
  costTrend: CostingTrendPoint[]
  modelSummary: ModelUsage[]
  documents: DocumentCost[]
  costChangePercent: number
  documentsChangePercent: number
  /** "azure_cost_management" | "llm_traces" | "empty" — indicates which backend source was used */
  dataSource?: string
}
