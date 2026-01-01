/**
 * Samsung GEO Tool v2 Types
 * USP-Centric Architecture with Google Grounding Integration
 */

// ==========================================
// USP (Unique Selling Point) Types
// ==========================================

export type USPCategory =
  | 'Camera'
  | 'Display'
  | 'Performance'
  | 'AI'
  | 'Design'
  | 'Battery'
  | 'Security'
  | 'Audio'
  | 'Connectivity'
  | 'Software'
  | 'Other'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface USPEvidence {
  sources: string[]
  quotes: string[]
  searchQueries?: string[]
}

export interface UniqueSellingPoint {
  feature: string
  category: USPCategory
  differentiation: string
  userBenefit: string
  evidence: USPEvidence
  confidence: ConfidenceLevel
}

export interface USPExtractionResult {
  usps: UniqueSellingPoint[]
  competitiveContext: string
  extractionMethod: 'grounded' | 'generative'
  groundingQuality: number // 0-100
}

// ==========================================
// Grounding Quality Scoring (10pt)
// ==========================================

export interface GroundingQualityScore {
  citationDensity: number    // 0-3pts: % of content with grounding support
  sourceAuthority: number    // 0-4pts: Quality of sources (samsung.com = Tier 1)
  coverage: number           // 0-3pts: How well grounding covers all sections
  total: number              // 0-10pts
  breakdown: {
    citationPercentage: number
    tier1Sources: number
    tier2Sources: number
    tier3Sources: number
    sectionsWithGrounding: number
    totalSections: number
  }
}

// Source authority tiers
export const SOURCE_AUTHORITY_TIERS = {
  tier1: ['samsung.com', 'news.samsung.com', 'samsung.co.kr'],
  tier2: ['gsmarena.com', 'theverge.com', 'techcrunch.com', 'cnet.com', 'techradar.com', 'tomsguide.com', 'androidauthority.com'],
  tier3: ['reddit.com', 'youtube.com', 'twitter.com', 'medium.com'],
} as const

// ==========================================
// Grounding Metadata Aggregation
// ==========================================

export interface GroundingSource {
  uri: string
  title: string
  usedIn: string[]  // Which sections used this source
  accessCount?: number
  tier: 1 | 2 | 3 | 4
}

export interface GroundingMetadata {
  webSearchQueries: string[]
  sources: GroundingSource[]
  citationDensity: number
  totalCitations: number
  uniqueSources: number
}

// ==========================================
// Anti-Fabrication Guardrails
// ==========================================

export const SAFE_LANGUAGE_PATTERNS = {
  // Safe language for low-confidence/new products
  safe: [
    'Designed for',
    'Enables professionals to',
    'Potential improvement in',
    'Built to support',
    'Optimized for',
    'Created for users who',
    'Engineered to deliver',
    'Crafted for',
  ],
  // Forbidden fabrications (never use without evidence)
  forbidden: [
    /\d+%\s+(faster|better|improved|increase|improvement)/i,
    /studies\s+show/i,
    /research\s+indicates/i,
    /proven\s+to/i,
    /scientifically\s+verified/i,
    /experts\s+agree/i,
    /users\s+report\s+\d+%/i,
  ],
} as const

export interface FabricationCheck {
  hasFabrication: boolean
  violations: string[]
  suggestions: string[]
}

// ==========================================
// Case Study Types
// ==========================================

export interface CaseStudy {
  title: string
  scenario: string
  solution: string
  linkedUSPs: string[]  // USP features this case connects to
  evidence: {
    sources: string[]
    confidence: ConfidenceLevel
  }
}

export interface CaseStudyResult {
  caseStudies: CaseStudy[]
  extractionMethod: 'grounded' | 'generative'
}

// ==========================================
// FAQ with USP Connection
// ==========================================

export interface FAQItem {
  question: string
  answer: string
  linkedUSPs: string[]  // USP features this FAQ addresses
  confidence: ConfidenceLevel
}

export interface FAQResult {
  faqs: FAQItem[]
  queryPatternOptimization: boolean  // Optimized for Query Fan-Out
}

// ==========================================
// Pipeline Stage Types
// ==========================================

export type PipelineStage =
  | 'description'      // Stage 1: Description with grounding
  | 'usp_extraction'   // Stage 1.5: USP Extraction with grounding
  | 'chapters'         // Stage 2: Chapters (no grounding)
  | 'faq'              // Stage 3: FAQ with grounding, USP-connected
  | 'step_by_step'     // Stage 4: Step-by-step (no grounding)
  | 'case_studies'     // Stage 5: Case studies with grounding
  | 'keywords'         // Stage 6: Keywords (no grounding)
  | 'grounding_aggregation' // Stage 7: Aggregate grounding metadata

export interface StageConfig {
  name: PipelineStage
  requiresGrounding: boolean
  dependsOn: PipelineStage[]
  canParallelize: boolean
}

export const PIPELINE_STAGES: StageConfig[] = [
  { name: 'description', requiresGrounding: true, dependsOn: [], canParallelize: false },
  { name: 'usp_extraction', requiresGrounding: true, dependsOn: ['description'], canParallelize: false },
  { name: 'chapters', requiresGrounding: false, dependsOn: ['usp_extraction'], canParallelize: true },
  { name: 'faq', requiresGrounding: true, dependsOn: ['usp_extraction'], canParallelize: true },
  { name: 'step_by_step', requiresGrounding: false, dependsOn: ['faq'], canParallelize: true },
  { name: 'case_studies', requiresGrounding: true, dependsOn: ['usp_extraction'], canParallelize: true },
  { name: 'keywords', requiresGrounding: false, dependsOn: ['description'], canParallelize: false },
  { name: 'grounding_aggregation', requiresGrounding: false, dependsOn: ['faq', 'case_studies'], canParallelize: false },
]

// ==========================================
// Progress Tracking
// ==========================================

export interface PipelineProgress {
  stage: PipelineStage
  percentage: number
  message: string
  startedAt?: string
  completedAt?: string
}

export const STAGE_PROGRESS_MAP: Record<PipelineStage, { percentage: number; message: string }> = {
  description: { percentage: 15, message: 'Description generation with Google Search' },
  usp_extraction: { percentage: 30, message: 'USP extraction with evidence' },
  chapters: { percentage: 50, message: 'Generating chapters (parallel)' },
  faq: { percentage: 50, message: 'Generating FAQ with grounding (parallel)' },
  step_by_step: { percentage: 70, message: 'Step-by-step guide (parallel)' },
  case_studies: { percentage: 70, message: 'Case studies with evidence (parallel)' },
  keywords: { percentage: 85, message: 'Keywords and grounding aggregation' },
  grounding_aggregation: { percentage: 95, message: 'Finalizing grounding metadata' },
}

// ==========================================
// Enhanced Generation Response
// ==========================================

export interface GEOv2GenerateResponse {
  description: {
    preview: string        // First 130 characters
    full: string           // Full description
    vanityLinks: string[]  // Suggested vanity links
  }
  uspResult: USPExtractionResult
  chapters: {
    timestamps: string
    autoGenerated: boolean
  }
  faq: FAQResult
  stepByStep?: {
    steps: string[]
    isTutorialContent: boolean
  }
  caseStudies?: CaseStudyResult
  keywords: {
    product: string[]
    generic: string[]
    densityScore: number
    questionScore?: number
    structureScore?: number
    lengthScore?: number
    preliminaryTotal?: number
  }
  hashtags: string[]
  hashtagCategories?: {
    brand: string[]
    features: string[]
    industry: string[]
  }
  finalScore: GEOv2Score
  groundingMetadata?: GroundingMetadata
  progress?: PipelineProgress[]
  tuningMetadata?: {
    configSource: 'database' | 'default' | 'mixed'
    promptVersionId: string | null
    weightsVersionId: string | null
    weightsName: string
    loadedAt: string
    scoreBreakdown?: Array<{
      metric: string
      label: string
      score: number
      weight: number
      weightedScore: number
      contribution: number
    }>
  }
}

export interface GEOv2Score {
  keywordDensity: number       // 15pts (was 20 in v1)
  aiExposure: number           // 25pts (was 30 in v1)
  questionPatterns: number     // 20pts
  sentenceStructure: number    // 15pts
  lengthCompliance: number     // 15pts
  groundingQuality: GroundingQualityScore  // 10pts NEW
  total: number                // 100pts
}

// ==========================================
// Export Types
// ==========================================

export interface ExportOptions {
  format: 'json' | 'text'
  includeSources: boolean
  includeScores: boolean
  includeUSPs: boolean
}

export interface TextExportSections {
  description: boolean
  usps: boolean
  faq: boolean
  chapters: boolean
  caseStudies: boolean
  groundingSources: boolean
  scores: boolean
}

// ==========================================
// Analytics Types
// ==========================================

export interface SourceClickEvent {
  sourceUri: string
  sourceTitle: string
  section: string
  timestamp: string
  sessionId: string
}

export interface AnalyticsData {
  sourceClicks: SourceClickEvent[]
  totalClicks: number
  clicksBySource: Record<string, number>
  clicksBySection: Record<string, number>
}
