import type { CostingSummary, DocumentCost, ModelUsage, StageBreakdown } from '../types'

// ─── Model definitions (platform-wide aggregates) ─────────────────────────────

const MODEL_O3: ModelUsage = {
  modelId: 'o3',
  modelName: 'O3',
  inputTokens: 285_000,
  outputTokens: 72_000,
  totalRequests: 30,
  cost: 2.163,
}

const MODEL_GPT54: ModelUsage = {
  modelId: 'gpt-5.4',
  modelName: 'GPT-5.4',
  inputTokens: 1_784_000,
  outputTokens: 536_000,
  totalRequests: 85,
  cost: 16.96,
}

const MODEL_GPT54_MINI: ModelUsage = {
  modelId: 'gpt-5.4-mini',
  modelName: 'GPT-5.4 Mini',
  inputTokens: 3_565_000,
  outputTokens: 1_132_000,
  totalRequests: 185,
  cost: 1.214,
}

// ─── Document: Flood Insurance Course ────────────────────────────────────────

const floodInsuranceStages: StageBreakdown[] = [
  {
    stageKey: 'to_generation',
    stageName: 'TO Generation',
    inputTokens: 85_000,
    outputTokens: 12_000,
    cost: 0.605,
    requests: 4,
  },
  {
    stageKey: 'content_generation',
    stageName: 'Content Generation',
    inputTokens: 680_000,
    outputTokens: 220_000,
    cost: 6.70,
    requests: 32,
  },
  {
    stageKey: 'assessment_generation',
    stageName: 'Assessment Generation',
    inputTokens: 1_200_000,
    outputTokens: 380_000,
    cost: 0.408,
    requests: 48,
  },
  {
    stageKey: 'image_generation',
    stageName: 'Image Generation',
    inputTokens: 45_000,
    outputTokens: 8_000,
    cost: 0.345,
    requests: 12,
  },
  {
    stageKey: 'metadata_generation',
    stageName: 'Metadata Generation',
    inputTokens: 280_000,
    outputTokens: 95_000,
    cost: 0.099,
    requests: 18,
  },
  {
    stageKey: 'other',
    stageName: 'Other Processing',
    inputTokens: 120_000,
    outputTokens: 45_000,
    cost: 0.045,
    requests: 8,
  },
]

const floodInsuranceModels: ModelUsage[] = [
  {
    modelId: 'o3',
    modelName: 'O3',
    inputTokens: 38_000,
    outputTokens: 10_000,
    totalRequests: 4,
    cost: 0.285,
  },
  {
    modelId: 'gpt-5.4',
    modelName: 'GPT-5.4',
    inputTokens: 772_000,
    outputTokens: 230_000,
    totalRequests: 31,
    cost: 7.365,
  },
  {
    modelId: 'gpt-5.4-mini',
    modelName: 'GPT-5.4 Mini',
    inputTokens: 1_600_000,
    outputTokens: 520_000,
    totalRequests: 75,
    cost: 0.552,
  },
]

const floodInsuranceDoc: DocumentCost = {
  documentId: 'doc-001',
  documentName: 'Flood Insurance Course',
  documentType: 'Insurance CE',
  status: 'completed',
  totalCost: 8.202,
  inputTokens: 2_410_000,
  outputTokens: 760_000,
  totalRequests: 110,
  modelsUsed: ['O3', 'GPT-5.4', 'GPT-5.4 Mini'],
  lastUpdated: '2026-05-04T14:32:00Z',
  modelBreakdown: floodInsuranceModels,
  stageBreakdown: floodInsuranceStages,
}

// ─── Document: Commercial Auto Training ──────────────────────────────────────

const commercialAutoStages: StageBreakdown[] = [
  {
    stageKey: 'to_generation',
    stageName: 'TO Generation',
    inputTokens: 72_000,
    outputTokens: 10_000,
    cost: 0.51,
    requests: 3,
  },
  {
    stageKey: 'content_generation',
    stageName: 'Content Generation',
    inputTokens: 520_000,
    outputTokens: 175_000,
    cost: 5.225,
    requests: 28,
  },
  {
    stageKey: 'assessment_generation',
    stageName: 'Assessment Generation',
    inputTokens: 950_000,
    outputTokens: 290_000,
    cost: 0.3165,
    requests: 38,
  },
  {
    stageKey: 'image_generation',
    stageName: 'Image Generation',
    inputTokens: 38_000,
    outputTokens: 7_000,
    cost: 0.295,
    requests: 10,
  },
  {
    stageKey: 'metadata_generation',
    stageName: 'Metadata Generation',
    inputTokens: 220_000,
    outputTokens: 72_000,
    cost: 0.0762,
    requests: 14,
  },
  {
    stageKey: 'other',
    stageName: 'Other Processing',
    inputTokens: 95_000,
    outputTokens: 35_000,
    cost: 0.0353,
    requests: 6,
  },
]

const commercialAutoModels: ModelUsage[] = [
  {
    modelId: 'o3',
    modelName: 'O3',
    inputTokens: 30_000,
    outputTokens: 8_000,
    totalRequests: 3,
    cost: 0.225,
  },
  {
    modelId: 'gpt-5.4',
    modelName: 'GPT-5.4',
    inputTokens: 600_000,
    outputTokens: 184_000,
    totalRequests: 27,
    cost: 5.805,
  },
  {
    modelId: 'gpt-5.4-mini',
    modelName: 'GPT-5.4 Mini',
    inputTokens: 1_265_000,
    outputTokens: 397_000,
    totalRequests: 62,
    cost: 0.428,
  },
]

const commercialAutoDoc: DocumentCost = {
  documentId: 'doc-002',
  documentName: 'Commercial Auto Training',
  documentType: 'IARCE',
  status: 'completed',
  totalCost: 6.458,
  inputTokens: 1_895_000,
  outputTokens: 589_000,
  totalRequests: 92,
  modelsUsed: ['O3', 'GPT-5.4', 'GPT-5.4 Mini'],
  lastUpdated: '2026-05-10T09:15:00Z',
  modelBreakdown: commercialAutoModels,
  stageBreakdown: commercialAutoStages,
}

// ─── Document: Compliance Certification ──────────────────────────────────────

const complianceStages: StageBreakdown[] = [
  {
    stageKey: 'to_generation',
    stageName: 'TO Generation',
    inputTokens: 42_000,
    outputTokens: 7_500,
    cost: 0.3225,
    requests: 3,
  },
  {
    stageKey: 'content_generation',
    stageName: 'Content Generation',
    inputTokens: 280_000,
    outputTokens: 92_000,
    cost: 2.78,
    requests: 18,
  },
  {
    stageKey: 'assessment_generation',
    stageName: 'Assessment Generation',
    inputTokens: 520_000,
    outputTokens: 155_000,
    cost: 0.171,
    requests: 24,
  },
  {
    stageKey: 'image_generation',
    stageName: 'Image Generation',
    inputTokens: 22_000,
    outputTokens: 4_500,
    cost: 0.1775,
    requests: 8,
  },
  {
    stageKey: 'metadata_generation',
    stageName: 'Metadata Generation',
    inputTokens: 125_000,
    outputTokens: 42_000,
    cost: 0.044,
    requests: 10,
  },
  {
    stageKey: 'other',
    stageName: 'Other Processing',
    inputTokens: 55_000,
    outputTokens: 18_000,
    cost: 0.019,
    requests: 5,
  },
]

const complianceModels: ModelUsage[] = [
  {
    modelId: 'o3',
    modelName: 'O3',
    inputTokens: 18_000,
    outputTokens: 5_000,
    totalRequests: 3,
    cost: 0.135,
  },
  {
    modelId: 'gpt-5.4',
    modelName: 'GPT-5.4',
    inputTokens: 326_000,
    outputTokens: 99_000,
    totalRequests: 17,
    cost: 3.145,
  },
  {
    modelId: 'gpt-5.4-mini',
    modelName: 'GPT-5.4 Mini',
    inputTokens: 700_000,
    outputTokens: 215_000,
    totalRequests: 48,
    cost: 0.234,
  },
]

const complianceCertDoc: DocumentCost = {
  documentId: 'doc-003',
  documentName: 'Compliance Certification',
  documentType: 'Firm Element',
  status: 'completed',
  totalCost: 3.514,
  inputTokens: 1_044_000,
  outputTokens: 319_000,
  totalRequests: 68,
  modelsUsed: ['O3', 'GPT-5.4', 'GPT-5.4 Mini'],
  lastUpdated: '2026-05-29T16:45:00Z',
  modelBreakdown: complianceModels,
  stageBreakdown: complianceStages,
}

// ─── Trend data (May 2026) ────────────────────────────────────────────────────

const TREND_DATA: Array<{ date: string; cost: number; inputTokens: number; outputTokens: number }> = [
  { date: '2026-05-01', cost: 0.12,  inputTokens: 62_000,    outputTokens: 11_000  },
  { date: '2026-05-02', cost: 3.50,  inputTokens: 1_820_000, outputTokens: 325_000 },
  { date: '2026-05-03', cost: 2.80,  inputTokens: 1_455_000, outputTokens: 260_000 },
  { date: '2026-05-04', cost: 1.84,  inputTokens: 985_000,   outputTokens: 175_000 },
  { date: '2026-05-05', cost: 0.18,  inputTokens: 93_000,    outputTokens: 16_000  },
  { date: '2026-05-06', cost: 0.09,  inputTokens: 47_000,    outputTokens: 8_000   },
  { date: '2026-05-07', cost: 0.15,  inputTokens: 78_000,    outputTokens: 14_000  },
  { date: '2026-05-08', cost: 2.95,  inputTokens: 1_532_000, outputTokens: 270_000 },
  { date: '2026-05-09', cost: 2.30,  inputTokens: 1_195_000, outputTokens: 212_000 },
  { date: '2026-05-10', cost: 1.24,  inputTokens: 644_000,   outputTokens: 107_000 },
  { date: '2026-05-11', cost: 0.08,  inputTokens: 41_500,    outputTokens: 7_000   },
  { date: '2026-05-12', cost: 0.11,  inputTokens: 57_000,    outputTokens: 10_000  },
  { date: '2026-05-13', cost: 0.07,  inputTokens: 36_000,    outputTokens: 6_000   },
  { date: '2026-05-14', cost: 0.09,  inputTokens: 47_000,    outputTokens: 8_000   },
  { date: '2026-05-15', cost: 0.06,  inputTokens: 31_000,    outputTokens: 5_500   },
  { date: '2026-05-16', cost: 0.13,  inputTokens: 67_000,    outputTokens: 12_000  },
  { date: '2026-05-17', cost: 0.08,  inputTokens: 41_500,    outputTokens: 7_000   },
  { date: '2026-05-18', cost: 0.05,  inputTokens: 26_000,    outputTokens: 4_500   },
  { date: '2026-05-19', cost: 0.09,  inputTokens: 47_000,    outputTokens: 8_000   },
  { date: '2026-05-20', cost: 0.07,  inputTokens: 36_000,    outputTokens: 6_000   },
  { date: '2026-05-21', cost: 0.12,  inputTokens: 62_000,    outputTokens: 11_000  },
  { date: '2026-05-22', cost: 0.08,  inputTokens: 41_500,    outputTokens: 7_000   },
  { date: '2026-05-23', cost: 0.06,  inputTokens: 31_000,    outputTokens: 5_500   },
  { date: '2026-05-24', cost: 0.05,  inputTokens: 26_000,    outputTokens: 4_500   },
  { date: '2026-05-25', cost: 0.07,  inputTokens: 36_000,    outputTokens: 6_000   },
  { date: '2026-05-26', cost: 0.08,  inputTokens: 41_500,    outputTokens: 7_000   },
  { date: '2026-05-27', cost: 1.60,  inputTokens: 831_000,   outputTokens: 147_000 },
  { date: '2026-05-28', cost: 1.72,  inputTokens: 893_000,   outputTokens: 158_000 },
  { date: '2026-05-29', cost: 0.20,  inputTokens: 104_000,   outputTokens: 18_500  },
  { date: '2026-05-30', cost: 0.08,  inputTokens: 41_500,    outputTokens: 7_000   },
  { date: '2026-05-31', cost: 0.05,  inputTokens: 26_000,    outputTokens: 4_500   },
]

// ─── Generated document builder ──────────────────────────────────────────────
// Produces a realistic DocumentCost from a minimal spec, distributing cost
// across pipeline stages and the three active models (O3, GPT-5.4, GPT-5.4 Mini).

interface DocSpec {
  documentId: string
  documentName: string
  documentType: string
  status: DocumentCost['status']
  totalCost: number
  lastUpdated: string
}

function buildMockDocument(spec: DocSpec): DocumentCost {
  const c = spec.totalCost

  // Stage cost splits — reflect actual pipeline agent roles
  const stgTO      = c * 0.08   // A0 + A0_TO: O3 classification + GPT-5.4 outline extraction
  const stgContent = c * 0.60   // A2: GPT-5.4 content generation
  const stgAssess  = c * 0.18   // A1 + S1/S2 checks: GPT-5.4 Mini
  const stgImage   = c * 0.06   // A2 image handling: GPT-5.4
  const stgMeta    = c * 0.04   // Metadata enrichment: GPT-5.4 Mini
  const stgOther   = c - stgTO - stgContent - stgAssess - stgImage - stgMeta

  // Token helpers (tokens per dollar of stage cost, based on tracer.py rates)
  // O3: $2.00/1M input, $8.00/1M output
  const o3In  = (stageCost: number) => Math.round(stageCost * 350_000)
  const o3Out = (stageCost: number) => Math.round(stageCost *  88_000)
  // GPT-5.4: $2.50/1M input, $15.00/1M output
  const g54In  = (stageCost: number) => Math.round(stageCost * 280_000)
  const g54Out = (stageCost: number) => Math.round(stageCost *  47_000)
  // GPT-5.4 Mini: $0.75/1M input, $4.50/1M output
  const mnIn  = (stageCost: number) => Math.round(stageCost * 950_000)
  const mnOut = (stageCost: number) => Math.round(stageCost * 158_000)

  const req = (stageCost: number, rate: number, min: number) =>
    Math.max(min, Math.round(stageCost * rate))

  // O3 handles A0 classification — a slice of the TO generation stage
  const stgTOo3  = stgTO * 0.45
  const stgTOg54 = stgTO * 0.55

  const stageBreakdown: StageBreakdown[] = [
    {
      stageKey: 'to_generation',
      stageName: 'TO Generation',
      inputTokens:  o3In(stgTOo3) + g54In(stgTOg54),
      outputTokens: o3Out(stgTOo3) + g54Out(stgTOg54),
      cost: stgTO,
      requests: req(stgTO, 4, 2),
    },
    {
      stageKey: 'content_generation',
      stageName: 'Content Generation',
      inputTokens:  g54In(stgContent),
      outputTokens: g54Out(stgContent),
      cost: stgContent,
      requests: req(stgContent, 6, 5),
    },
    {
      stageKey: 'assessment_generation',
      stageName: 'Assessment Generation',
      inputTokens:  mnIn(stgAssess),
      outputTokens: mnOut(stgAssess),
      cost: stgAssess,
      requests: req(stgAssess, 50, 8),
    },
    {
      stageKey: 'image_generation',
      stageName: 'Image Generation',
      inputTokens:  g54In(stgImage),
      outputTokens: g54Out(stgImage),
      cost: stgImage,
      requests: req(stgImage, 6, 4),
    },
    {
      stageKey: 'metadata_generation',
      stageName: 'Metadata Generation',
      inputTokens:  mnIn(stgMeta),
      outputTokens: mnOut(stgMeta),
      cost: stgMeta,
      requests: req(stgMeta, 15, 4),
    },
    {
      stageKey: 'other',
      stageName: 'Other Processing',
      inputTokens:  mnIn(stgOther),
      outputTokens: mnOut(stgOther),
      cost: stgOther,
      requests: req(stgOther, 10, 2),
    },
  ]

  // Model aggregates — matches actual pipeline agent assignments:
  // O3 → A0 classification (slice of TO stage)
  // GPT-5.4 → A0_TO outline extraction + A2 content + image handling
  // GPT-5.4 Mini → A1 outline interpretation + assessment + metadata + other
  const o3Cost    = stgTOo3
  const gpt54Cost = stgTOg54 + stgContent + stgImage
  const miniCost  = stgAssess + stgMeta + stgOther

  const modelBreakdown: ModelUsage[] = [
    {
      modelId: 'o3',
      modelName: 'O3',
      inputTokens:   o3In(o3Cost),
      outputTokens:  o3Out(o3Cost),
      totalRequests: req(o3Cost, 8, 1),
      cost: o3Cost,
    },
    {
      modelId: 'gpt-5.4',
      modelName: 'GPT-5.4',
      inputTokens:   g54In(gpt54Cost),
      outputTokens:  g54Out(gpt54Cost),
      totalRequests: req(gpt54Cost, 6, 5),
      cost: gpt54Cost,
    },
    {
      modelId: 'gpt-5.4-mini',
      modelName: 'GPT-5.4 Mini',
      inputTokens:   mnIn(miniCost),
      outputTokens:  mnOut(miniCost),
      totalRequests: req(miniCost, 50, 8),
      cost: miniCost,
    },
  ]

  const totalInputTokens  = stageBreakdown.reduce((s, x) => s + x.inputTokens,  0)
  const totalOutputTokens = stageBreakdown.reduce((s, x) => s + x.outputTokens, 0)
  const totalRequests     = stageBreakdown.reduce((s, x) => s + x.requests,     0)

  return {
    documentId:   spec.documentId,
    documentName: spec.documentName,
    documentType: spec.documentType,
    status:       spec.status,
    totalCost:    spec.totalCost,
    inputTokens:  totalInputTokens,
    outputTokens: totalOutputTokens,
    totalRequests,
    modelsUsed: ['O3', 'GPT-5.4', 'GPT-5.4 Mini'],
    lastUpdated: spec.lastUpdated,
    modelBreakdown,
    stageBreakdown,
  }
}

// ─── 27 additional generated documents ───────────────────────────────────────

const GENERATED_DOCS: DocumentCost[] = ([
  { documentId: 'doc-004', documentName: 'Life Insurance Fundamentals',     documentType: 'Insurance CE',  status: 'completed',   totalCost:  7.82, lastUpdated: '2026-04-12T10:20:00Z' },
  { documentId: 'doc-005', documentName: 'Property & Casualty Basics',      documentType: 'IARCE',         status: 'completed',   totalCost:  5.34, lastUpdated: '2026-04-18T14:05:00Z' },
  { documentId: 'doc-006', documentName: 'Health Insurance Essentials',     documentType: 'Firm Element',  status: 'completed',   totalCost:  4.15, lastUpdated: '2026-04-22T09:30:00Z' },
  { documentId: 'doc-007', documentName: 'Marine Insurance Principles',     documentType: 'Insurance CE',  status: 'completed',   totalCost:  9.12, lastUpdated: '2026-04-25T16:45:00Z' },
  { documentId: 'doc-008', documentName: 'Workers Compensation Training',   documentType: 'IARCE',         status: 'completed',   totalCost:  6.78, lastUpdated: '2026-04-28T11:15:00Z' },
  { documentId: 'doc-009', documentName: 'Cyber Liability Certification',   documentType: 'Firm Element',  status: 'completed',   totalCost:  3.45, lastUpdated: '2026-05-01T08:50:00Z' },
  { documentId: 'doc-010', documentName: 'Directors & Officers Coverage',   documentType: 'Insurance CE',  status: 'completed',   totalCost: 11.23, lastUpdated: '2026-05-06T13:40:00Z' },
  { documentId: 'doc-011', documentName: 'Employment Practices Liability',  documentType: 'IARCE',         status: 'completed',   totalCost:  5.89, lastUpdated: '2026-05-09T10:00:00Z' },
  { documentId: 'doc-012', documentName: 'Umbrella Insurance Guide',        documentType: 'Firm Element',  status: 'completed',   totalCost:  2.67, lastUpdated: '2026-05-11T15:20:00Z' },
  { documentId: 'doc-013', documentName: 'Earthquake Coverage Module',      documentType: 'Insurance CE',  status: 'completed',   totalCost:  4.91, lastUpdated: '2026-05-12T09:10:00Z' },
  { documentId: 'doc-014', documentName: 'Commercial Property Essentials',  documentType: 'IARCE',         status: 'completed',   totalCost:  7.15, lastUpdated: '2026-05-14T11:55:00Z' },
  { documentId: 'doc-015', documentName: 'Business Interruption Insurance', documentType: 'Firm Element',  status: 'completed',   totalCost:  8.44, lastUpdated: '2026-05-15T14:30:00Z' },
  { documentId: 'doc-016', documentName: 'Inland Marine Fundamentals',      documentType: 'Insurance CE',  status: 'completed',   totalCost:  3.28, lastUpdated: '2026-05-16T10:45:00Z' },
  { documentId: 'doc-017', documentName: 'Surety Bond Overview',            documentType: 'IARCE',         status: 'completed',   totalCost:  2.11, lastUpdated: '2026-05-17T09:00:00Z' },
  { documentId: 'doc-018', documentName: 'Aviation Insurance Basics',       documentType: 'Firm Element',  status: 'completed',   totalCost: 10.55, lastUpdated: '2026-05-18T16:15:00Z' },
  { documentId: 'doc-019', documentName: 'Specialty Lines Certification',   documentType: 'Insurance CE',  status: 'completed',   totalCost:  6.33, lastUpdated: '2026-05-19T13:00:00Z' },
  { documentId: 'doc-020', documentName: 'Reinsurance Fundamentals',        documentType: 'IARCE',         status: 'completed',   totalCost:  4.72, lastUpdated: '2026-05-20T10:30:00Z' },
  { documentId: 'doc-021', documentName: 'Title Insurance Essentials',      documentType: 'Firm Element',  status: 'completed',   totalCost:  1.89, lastUpdated: '2026-05-20T14:00:00Z' },
  { documentId: 'doc-022', documentName: 'Long-Term Care Insurance',        documentType: 'Insurance CE',  status: 'completed',   totalCost:  5.56, lastUpdated: '2026-05-21T09:45:00Z' },
  { documentId: 'doc-023', documentName: 'Disability Income Training',      documentType: 'IARCE',         status: 'completed',   totalCost:  3.94, lastUpdated: '2026-05-21T15:30:00Z' },
  { documentId: 'doc-024', documentName: 'Group Benefits Overview',         documentType: 'Firm Element',  status: 'completed',   totalCost:  7.67, lastUpdated: '2026-05-22T11:20:00Z' },
  { documentId: 'doc-025', documentName: 'Ethics in Insurance',             documentType: 'Insurance CE',  status: 'completed',   totalCost:  1.45, lastUpdated: '2026-05-24T08:30:00Z' },
  { documentId: 'doc-026', documentName: 'Flood Mitigation Strategies',     documentType: 'IARCE',         status: 'in-progress', totalCost:  2.34, lastUpdated: '2026-05-25T13:00:00Z' },
  { documentId: 'doc-027', documentName: 'Professional Liability Training', documentType: 'Firm Element',  status: 'in-progress', totalCost:  5.78, lastUpdated: '2026-05-27T10:10:00Z' },
  { documentId: 'doc-028', documentName: 'Farm & Ranch Insurance',          documentType: 'Insurance CE',  status: 'in-progress', totalCost:  3.91, lastUpdated: '2026-05-30T14:50:00Z' },
  { documentId: 'doc-029', documentName: 'Homeowners Insurance Deep Dive',  documentType: 'IARCE',         status: 'failed',      totalCost:  0.87, lastUpdated: '2026-05-29T09:20:00Z' },
  { documentId: 'doc-030', documentName: 'Aviation Risk Assessment',        documentType: 'Firm Element',  status: 'failed',      totalCost:  1.23, lastUpdated: '2026-05-30T11:00:00Z' },
] as DocSpec[]).map(buildMockDocument)

const ALL_DOCUMENTS: DocumentCost[] = [
  floodInsuranceDoc,
  commercialAutoDoc,
  complianceCertDoc,
  ...GENERATED_DOCS,
]

// ─── Master summary ───────────────────────────────────────────────────────────

export const MOCK_COSTING_SUMMARY: CostingSummary = {
  totalCost: 18.174,
  totalInputTokens: 5_349_000,
  totalOutputTokens: 1_668_000,
  totalDocumentsProcessed: ALL_DOCUMENTS.length,
  averageCostPerDocument: 6.058,
  estimatedMonthlyCost: 36.35,
  costTrend: TREND_DATA,
  modelSummary: [MODEL_O3, MODEL_GPT54, MODEL_GPT54_MINI],
  documents: ALL_DOCUMENTS,
  costChangePercent: 23.4,
  documentsChangePercent: 50,
}

export function findDocumentById(id: string): DocumentCost | undefined {
  return MOCK_COSTING_SUMMARY.documents.find((d) => d.documentId === id)
}
