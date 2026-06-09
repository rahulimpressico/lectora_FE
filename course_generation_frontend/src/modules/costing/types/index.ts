export interface ModelUsage {
  modelId: string
  modelName: string
  inputTokens: number
  outputTokens: number
  totalRequests: number
  cost: number
}

export type StageKey =
  | 'a0_classification'
  | 'to_generation'
  | 'outline_interpretation'
  | 'structure_review'
  | 'section_mapping'
  | 'kc_planning'
  | 'content_generation'
  | 'quality_assurance'
  | 'course_editor'
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
  runSummary: string
  status: 'completed' | 'in-progress' | 'failed'
  totalCost: number
  inputTokens: number
  outputTokens: number
  totalRequests: number
  modelsUsed: string[]
  agentsUsed?: string[]
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

export interface AgentModelSummary {
  agentId: string
  agentName: string
  role: string
  pipelineStep: number
  stageKey: StageKey
  stageName: string
  configuredDeployment: string
  configuredDeploymentLabel: string
  defaultDeployment: string
  isOverridden: boolean
  totalRequests: number
  inputTokens: number
  outputTokens: number
  cost: number
  observedDeployments: string[]
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
  stageSummary?: StageBreakdown[]
  agentModelSummary?: AgentModelSummary[]
  traceTotalCost?: number
  /** Omitted when the backend cannot compare against a prior period */
  costChangePercent?: number | null
  documentsChangePercent?: number | null
  /** "llm_traces" | "empty" — indicates which backend source was used */
  dataSource?: string
  currency?: string
}
