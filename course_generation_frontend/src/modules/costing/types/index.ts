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

export interface ServiceCostBreakdown {
  serviceName: string
  cost: number
  sharePercent: number
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
  serviceBreakdown?: ServiceCostBreakdown[]
  agentModelSummary?: AgentModelSummary[]
  traceTotalCost?: number
  azureTotalCost?: number
  /** Omitted when the backend cannot compare against a prior period */
  costChangePercent?: number | null
  documentsChangePercent?: number | null
  /** "azure_cost_management" | "llm_traces" | "empty" — indicates which backend source was used */
  dataSource?: string
  /** Billing currency for cost totals (Azure CostUSD aggregation → USD). */
  currency?: string
  azureBillingConfigured?: boolean
  /** Populated when Azure Cost Management is configured but the query failed (e.g. missing RBAC). */
  azureBillingError?: string | null
  azureBillingSource?: string | null
  azureBillingStale?: boolean
  azureFetchedAt?: string | null
}
