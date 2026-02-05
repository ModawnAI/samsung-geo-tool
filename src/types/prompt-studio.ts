/**
 * Prompt Studio Types
 * Types for stage-based prompt management and testing system
 */

import type { Tables, Json } from './database'

// Re-export database types
export type StagePrompt = Tables<'stage_prompts'>
export type PromptTestRun = Tables<'prompt_test_runs'>
export type StageTestInput = Tables<'stage_test_inputs'>
export type PromptRefineSession = Tables<'prompt_refine_sessions'>

// Evolution system types
export type PromptStudioExecution = Tables<'prompt_studio_executions'>
export type PromptStudioFeedback = Tables<'prompt_studio_feedback'>
export type PromptStudioEvolutionConfig = Tables<'prompt_studio_evolution_config'>
export type PromptStudioEvolutionCycle = Tables<'prompt_studio_evolution_cycles'>
export type PromptStudioEvolutionCandidate = Tables<'prompt_studio_evolution_candidates'>

// Alias for store compatibility
export type StageTestRun = PromptTestRun

// LLM Parameters interface
export interface LLMParameters {
  temperature: number
  maxTokens: number
  topP: number
  model: string
}

// Stage type (matches database enum)
export type PromptStage =
  | 'grounding'
  | 'description'
  | 'usp'
  | 'faq'
  | 'chapters'
  | 'case_studies'
  | 'keywords'
  | 'hashtags'

// Workflow status type (matches database enum)
export type WorkflowStatus =
  | 'draft'
  | 'testing'
  | 'pending_approval'
  | 'active'
  | 'archived'

// Test run status type
export type TestRunStatus = 'pending' | 'running' | 'completed' | 'failed'

// ============================================================================
// Stage Configuration
// ============================================================================

export interface TemplateVariable {
  name: string
  description: string
  descriptionKo: string
}

export interface StageConfig {
  id: PromptStage
  label: string
  labelKo: string
  description: string
  descriptionKo: string
  icon: string
  color: string
  inputSchema: StageInputSchema
  outputSchema: StageOutputSchema
  /** Template variables that can be used in prompts for this stage */
  templateVariables: TemplateVariable[]
}

export interface StageInputSchema {
  fields: StageInputField[]
  requiredFields: string[]
}

export interface StageInputField {
  name: string
  type: 'text' | 'textarea' | 'select' | 'keywords' | 'json'
  label: string
  labelKo: string
  placeholder?: string
  placeholderKo?: string
  description?: string
  descriptionKo?: string
  options?: { value: string; label: string }[]
  defaultValue?: string | string[]
}

export interface StageOutputSchema {
  fields: StageOutputField[]
}

export interface StageOutputField {
  name: string
  type: 'text' | 'number' | 'json' | 'array'
  label: string
  labelKo: string
}

// ============================================================================
// Stage Prompt Form Data
// ============================================================================

export interface StagePromptFormData {
  stage: PromptStage
  stageSystemPrompt?: string
  temperature: number
  maxTokens: number
  topP: number
  model: string
  promptVersionId?: string
}

export interface StagePromptUpdateData {
  stageSystemPrompt?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  model?: string
  workflowStatus?: WorkflowStatus
}

// ============================================================================
// Test Execution
// ============================================================================

export interface StageTestRequest {
  stagePromptId?: string
  stage: PromptStage
  systemPrompt: string
  parameters: {
    temperature: number
    maxTokens: number
    topP: number
    model: string
  }
  testInput: StageTestInputData
  language: 'ko' | 'en'
}

export interface StageTestInputData {
  productName?: string
  category?: string
  keywords?: string[]
  videoDescription?: string
  srtContent?: string
  usps?: string[]
  groundingData?: Json
  previousStageResult?: Json
  launchDate?: string  // For grounding stage
}

export interface StageTestResponse {
  id: string
  output: StageOutput
  metrics: TestMetrics
  qualityScore: QualityScore
  rawResponse: string
  status: TestRunStatus
  errorMessage?: string
}

export interface StageOutput {
  // Common fields
  content?: string
  parsed?: Json

  // Stage-specific fields
  // Grounding stage
  grounding_keywords?: GroundingKeyword[]
  grounding_sources?: GroundingSource[]

  // Description stage
  first_130?: string
  full_description?: string
  vanity_link?: string

  // USP stage
  usps?: USPOutput[]
  competitive_context?: string

  // FAQ stage
  faqs?: FAQOutput[]

  // Chapters stage
  chapters?: ChapterOutput[]

  // Case studies stage
  case_studies?: CaseStudyOutput[]

  // Keywords stage
  product_keywords?: KeywordOutput[]
  generic_keywords?: KeywordOutput[]
  scoring?: KeywordScoring

  // Hashtags stage
  hashtags?: string[]
}

export interface GroundingKeyword {
  term: string
  score: number
  sources: Array<{
    uri: string
    title: string
    tier: 1 | 2 | 3 | 4
  }>
}

export interface GroundingSource {
  uri: string
  title: string
  tier: 1 | 2 | 3 | 4
}

export interface USPOutput {
  feature: string
  category: string
  differentiation: string
  user_benefit: string
  evidence: {
    sources: string[]
    quotes: string[]
  }
  confidence: 'high'
}

export interface FAQOutput {
  question: string
  answer: string
}

export interface ChapterOutput {
  time: string
  title: string
}

export interface CaseStudyOutput {
  persona: string
  challenge: string
  solution: string
  outcome: string
  usp_reference: string
  query_targets: string[]
}

export interface KeywordOutput {
  keyword: string
  frequency: number
  first_position?: number
  search_volume?: 'high' | 'medium' | 'low'
}

export interface KeywordScoring {
  density_score: ScoreBreakdown
  question_score: ScoreBreakdown
  structure_score: ScoreBreakdown
  length_score: ScoreBreakdown
  ai_exposure_score: ScoreBreakdown
}

export interface ScoreBreakdown {
  points: number
  max: number
  breakdown: Record<string, number>
}

export interface TestMetrics {
  latencyMs: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface QualityScore {
  total: number
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: {
    keywordDensity: number
    questionPatterns: number
    sentenceStructure: number
    lengthCompliance: number
    aiExposure: number
  }
  suggestions: string[]
}

// ============================================================================
// Stage Dependencies
// ============================================================================

export interface StageDependency {
  dependsOn: PromptStage[]
  requiredFields: string[]
  fieldMapping: Record<string, string>
}

export interface PreviousStageResult {
  id: string
  outputParsed: Record<string, unknown> | null
  productName: string | null
  createdAt: string
  qualityScore: number | null
}

export interface PreviousResultsResponse {
  hasDependencies: boolean
  previousResults: Record<PromptStage, PreviousStageResult | null>
  missingStages: PromptStage[]
  availableStages: PromptStage[]
  mergedInput: Record<string, unknown>
  requiredFields?: string[]
}

// ============================================================================
// Test History
// ============================================================================

export interface TestRunSummary {
  id: string
  stagePromptId: string
  productName: string | null
  language: 'en' | 'ko'
  status: TestRunStatus
  qualityScore: number | null
  latencyMs: number | null
  createdAt: string
}

// ============================================================================
// Stage Status Summary
// ============================================================================

export interface StageStatusSummary {
  stage: PromptStage
  hasActivePrompt: boolean
  activePromptId?: string
  workflowStatus: WorkflowStatus
  avgQualityScore: number | null
  testCount: number
  lastTestedAt: string | null
  updatedAt: string
  // Version info
  currentVersion?: number
  totalVersions?: number
  // Engine info (for pipeline display)
  engine?: 'gemini' | 'perplexity' | 'cohere'
  model?: string
  temperature?: number
}

// ============================================================================
// Constants
// ============================================================================

export const PROMPT_STAGES: PromptStage[] = [
  'grounding',
  'description',
  'usp',
  'faq',
  'chapters',
  'case_studies',
  'keywords',
  'hashtags',
]

// Stage to Engine mapping
export type AIEngine = 'gemini' | 'perplexity' | 'cohere'

export const STAGE_ENGINE_MAP: Record<PromptStage, AIEngine> = {
  grounding: 'gemini',        // Gemini with Google Search grounding
  description: 'gemini',      // Content generation
  usp: 'perplexity',          // USP analysis with web context
  faq: 'gemini',              // FAQ generation
  chapters: 'gemini',         // Chapter generation
  case_studies: 'gemini',     // Case study generation
  keywords: 'gemini',         // Keyword analysis
  hashtags: 'gemini',         // Hashtag generation
}

export const ENGINE_CONFIG: Record<AIEngine, {
  label: string
  labelKo: string
  color: string
  bgColor: string
  defaultModel: string
}> = {
  gemini: {
    label: 'Gemini',
    labelKo: 'Gemini',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    defaultModel: 'gemini-3-flash-preview',
  },
  perplexity: {
    label: 'Perplexity',
    labelKo: 'Perplexity',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    defaultModel: 'sonar-pro',
  },
  cohere: {
    label: 'Cohere',
    labelKo: 'Cohere',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    defaultModel: 'command-r-plus',
  },
}

export const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, {
  label: string
  labelKo: string
  color: string
  bgColor: string
}> = {
  draft: {
    label: 'Draft',
    labelKo: '초안',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  testing: {
    label: 'Testing',
    labelKo: '테스트 중',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  pending_approval: {
    label: 'Pending Approval',
    labelKo: '승인 대기',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  active: {
    label: 'Active',
    labelKo: '활성',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  archived: {
    label: 'Archived',
    labelKo: '보관됨',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
}

export const STAGE_CONFIG: Record<PromptStage, StageConfig> = {
  grounding: {
    id: 'grounding',
    label: 'Grounding',
    labelKo: '그라운딩',
    description: 'Web search for user intent signals and product context',
    descriptionKo: '사용자 의도 신호 및 제품 컨텍스트를 위한 웹 검색',
    icon: 'MagnifyingGlass',
    color: 'bg-cyan-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'launchDate', type: 'text', label: 'Launch Date (optional)', labelKo: '출시일 (선택)', placeholder: 'YYYY-MM-DD' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'grounding_keywords', type: 'array', label: 'Keywords', labelKo: '키워드' },
        { name: 'grounding_sources', type: 'array', label: 'Sources', labelKo: '소스' },
      ],
    },
    templateVariables: [], // Grounding uses Gemini with Google Search
  },
  description: {
    id: 'description',
    label: 'Description',
    labelKo: '설명',
    description: 'YouTube description optimized for GEO/AEO',
    descriptionKo: 'GEO/AEO 최적화된 YouTube 설명',
    icon: 'FileText',
    color: 'bg-blue-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'category', type: 'select', label: 'Category', labelKo: '카테고리', options: [] },
        { name: 'keywords', type: 'keywords', label: 'Keywords', labelKo: '키워드' },
        { name: 'videoDescription', type: 'textarea', label: 'Video Description', labelKo: '영상 설명' },
        { name: 'srtContent', type: 'textarea', label: 'SRT Content', labelKo: 'SRT 내용' },
        { name: 'groundingData', type: 'json', label: 'Grounding Data', labelKo: '그라운딩 데이터' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'first_130', type: 'text', label: 'First 130 Characters', labelKo: '처음 130자' },
        { name: 'full_description', type: 'text', label: 'Full Description', labelKo: '전체 설명' },
        { name: 'vanity_link', type: 'text', label: 'Vanity Link', labelKo: '배너 링크' },
      ],
    },
    templateVariables: [
      { name: '{{product_name}}', description: 'Product name', descriptionKo: '제품명' },
      { name: '{{category}}', description: 'Product category', descriptionKo: '제품 카테고리' },
      { name: '{{keywords}}', description: 'Target keywords (comma-separated)', descriptionKo: '타겟 키워드 (쉼표 구분)' },
    ],
  },
  usp: {
    id: 'usp',
    label: 'USP',
    labelKo: 'USP',
    description: 'Unique selling points extraction',
    descriptionKo: '고유 판매 포인트 추출',
    icon: 'Star',
    color: 'bg-purple-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'category', type: 'select', label: 'Category', labelKo: '카테고리', options: [] },
        { name: 'keywords', type: 'keywords', label: 'Keywords', labelKo: '키워드' },
        { name: 'previousStageResult', type: 'json', label: 'Description Result', labelKo: '설명 결과' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'usps', type: 'array', label: 'USPs', labelKo: 'USP 목록' },
        { name: 'competitive_context', type: 'text', label: 'Competitive Context', labelKo: '경쟁 맥락' },
      ],
    },
    templateVariables: [
      { name: '{{product_name}}', description: 'Product name', descriptionKo: '제품명' },
      { name: '{{category}}', description: 'Product category', descriptionKo: '제품 카테고리' },
      { name: '{{keywords}}', description: 'Target keywords (comma-separated)', descriptionKo: '타겟 키워드 (쉼표 구분)' },
    ],
  },
  faq: {
    id: 'faq',
    label: 'FAQ',
    labelKo: 'FAQ',
    description: 'Q&A pairs for AEO optimization',
    descriptionKo: 'AEO 최적화를 위한 Q&A',
    icon: 'ChatCircle',
    color: 'bg-green-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'category', type: 'select', label: 'Category', labelKo: '카테고리', options: [] },
        { name: 'groundingData', type: 'json', label: 'Grounding Data', labelKo: '그라운딩 데이터' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'faqs', type: 'array', label: 'FAQs', labelKo: 'FAQ 목록' },
      ],
    },
    templateVariables: [
      { name: '{{product_name}}', description: 'Product name', descriptionKo: '제품명' },
      { name: '{{category}}', description: 'Product category', descriptionKo: '제품 카테고리' },
    ],
  },
  chapters: {
    id: 'chapters',
    label: 'Chapters',
    labelKo: '챕터',
    description: 'Timestamp chapters for video navigation',
    descriptionKo: '영상 탐색을 위한 타임스탬프 챕터',
    icon: 'ListNumbers',
    color: 'bg-orange-500',
    inputSchema: {
      fields: [
        { name: 'videoDescription', type: 'textarea', label: 'Video Description', labelKo: '영상 설명' },
        { name: 'keywords', type: 'keywords', label: 'Keywords', labelKo: '키워드' },
        { name: 'srtContent', type: 'textarea', label: 'SRT Content', labelKo: 'SRT 내용' },
      ],
      requiredFields: [],
    },
    outputSchema: {
      fields: [
        { name: 'chapters', type: 'array', label: 'Chapters', labelKo: '챕터 목록' },
      ],
    },
    templateVariables: [
      { name: '{{keywords}}', description: 'Target keywords (comma-separated)', descriptionKo: '타겟 키워드 (쉼표 구분)' },
    ],
  },
  case_studies: {
    id: 'case_studies',
    label: 'Case Studies',
    labelKo: '사용 사례',
    description: 'Real-world use case scenarios',
    descriptionKo: '실제 사용 사례 시나리오',
    icon: 'Briefcase',
    color: 'bg-teal-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'keywords', type: 'keywords', label: 'Keywords', labelKo: '키워드' },
        { name: 'groundingData', type: 'json', label: 'Grounding Data', labelKo: '그라운딩 데이터' },
        { name: 'usps', type: 'json', label: 'USPs', labelKo: 'USP 데이터' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'case_studies', type: 'array', label: 'Case Studies', labelKo: '사용 사례 목록' },
      ],
    },
    templateVariables: [
      { name: '{{product_name}}', description: 'Product name', descriptionKo: '제품명' },
      { name: '{{keywords}}', description: 'Target keywords (comma-separated)', descriptionKo: '타겟 키워드 (쉼표 구분)' },
    ],
  },
  keywords: {
    id: 'keywords',
    label: 'Keywords',
    labelKo: '키워드',
    description: 'Keyword extraction and scoring',
    descriptionKo: '키워드 추출 및 점수 산정',
    icon: 'Tag',
    color: 'bg-pink-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'category', type: 'select', label: 'Category', labelKo: '카테고리', options: [] },
        { name: 'previousStageResult', type: 'json', label: 'USP Result', labelKo: 'USP 결과' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'product_keywords', type: 'array', label: 'Product Keywords', labelKo: '제품 키워드' },
        { name: 'generic_keywords', type: 'array', label: 'Generic Keywords', labelKo: '일반 키워드' },
        { name: 'scoring', type: 'json', label: 'Scoring', labelKo: '점수' },
      ],
    },
    templateVariables: [
      { name: '{{product_name}}', description: 'Product name', descriptionKo: '제품명' },
      { name: '{{category}}', description: 'Product category', descriptionKo: '제품 카테고리' },
    ],
  },
  hashtags: {
    id: 'hashtags',
    label: 'Hashtags',
    labelKo: '해시태그',
    description: 'Strategic hashtags following Samsung standards',
    descriptionKo: '삼성 표준에 따른 전략적 해시태그',
    icon: 'Hash',
    color: 'bg-indigo-500',
    inputSchema: {
      fields: [
        { name: 'productName', type: 'text', label: 'Product Name', labelKo: '제품명' },
        { name: 'previousStageResult', type: 'json', label: 'Keywords Result', labelKo: '키워드 결과' },
      ],
      requiredFields: ['productName'],
    },
    outputSchema: {
      fields: [
        { name: 'hashtags', type: 'array', label: 'Hashtags', labelKo: '해시태그 목록' },
      ],
    },
    templateVariables: [
      { name: '{{product_name}}', description: 'Product name', descriptionKo: '제품명' },
    ],
  },
}

export const DEFAULT_LLM_PARAMETERS = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  model: 'gemini-3-flash-preview',
}

export const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Latest)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Latest)' },
  { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
]

// ============================================================================
// Prompt Refiner Chat Types
// ============================================================================

/**
 * Actions available in the refiner chat
 * - analyze: Analyze current prompt strengths, weaknesses, and improvement areas
 * - improve: Generate improved prompt version (returned in code block)
 * - test: Compare current vs improved prompt with sample input
 * - chat: Free-form conversation for specific modifications
 */
export type RefinerAction = 'analyze' | 'improve' | 'test' | 'chat'

/**
 * A single message in the refiner chat
 */
export interface RefinerMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** The action that triggered this message (for user messages) */
  action?: RefinerAction
  /** Extracted code blocks containing prompts (for assistant messages) */
  codeBlocks?: string[]
  /** ISO timestamp */
  timestamp: string
}

/**
 * A refiner chat session
 */
export interface RefineSession {
  id: string
  stage: PromptStage
  title: string | null
  messages: RefinerMessage[]
  currentPrompt: string | null
  improvedPrompt: string | null
  isFavorite: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Request body for refine chat API
 */
export interface RefineRequest {
  sessionId?: string
  stage: PromptStage
  action: RefinerAction
  userMessage?: string
  currentPrompt: string
  testInput?: StageTestInputData
}

/**
 * Response from refine chat API
 */
export interface RefineResponse {
  sessionId: string
  message: RefinerMessage
  codeBlocks: string[]
}

/**
 * Session list item (summary)
 */
export interface RefineSessionSummary {
  id: string
  stage: PromptStage
  title: string | null
  messageCount: number
  isFavorite: boolean
  updatedAt: string
}

// ============================================================================
// LLM-as-Judge Evaluation Types
// ============================================================================

/**
 * Evaluation scores (1-5 scale)
 */
export interface EvaluationScores {
  overall: number
  relevance: number
  quality: number
  creativity: number
}

/**
 * Detailed evaluation feedback
 */
export interface EvaluationFeedback {
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  summary: string
}

/**
 * Full LLM-as-Judge evaluation result
 */
export interface LLMJudgeEvaluation {
  scores: EvaluationScores
  feedback: EvaluationFeedback
  judgeModel: string
  rawResponse: string
}

/**
 * Request for evaluating a test execution
 */
export interface EvaluateRequest {
  executionId: string
  stage: PromptStage
  input: StageTestInputData
  output: StageOutput
  prompt: string
}

/**
 * Response from evaluation API
 */
export interface EvaluateResponse {
  feedbackId: string
  evaluation: LLMJudgeEvaluation
}

// ============================================================================
// Feedback Analysis Types
// ============================================================================

/**
 * Aggregated feedback statistics
 */
export interface FeedbackStats {
  totalFeedback: number
  averageScores: EvaluationScores
  scoreDistribution: {
    overall: Record<string, number>
    relevance: Record<string, number>
    quality: Record<string, number>
    creativity: Record<string, number>
  }
  recentTrend: 'improving' | 'stable' | 'declining'
  weakestDimension: keyof EvaluationScores
}

/**
 * Common weakness pattern
 */
export interface WeaknessPattern {
  pattern: string
  frequency: number
  affectedDimensions: (keyof EvaluationScores)[]
  suggestedFix: string
}

/**
 * Feedback analysis result
 */
export interface FeedbackAnalysis {
  stats: FeedbackStats
  weaknessPatterns: WeaknessPattern[]
  improvementPriorities: {
    dimension: keyof EvaluationScores
    currentScore: number
    targetScore: number
    suggestions: string[]
  }[]
  timeSeriesData: {
    date: string
    avgScore: number
  }[]
}

// ============================================================================
// Evolution System Types
// ============================================================================

/**
 * Evolution cycle status
 */
export type EvolutionCycleStatus = 'pending' | 'analyzing' | 'generating' | 'testing' | 'completed' | 'failed'

/**
 * Evolution candidate status
 */
export type EvolutionCandidateStatus = 'pending' | 'testing' | 'completed' | 'approved' | 'rejected'

/**
 * Feedback summary for evolution cycle
 */
export interface EvolutionFeedbackSummary {
  feedbackCount: number
  averageScores: EvaluationScores
  commonWeaknesses: string[]
  suggestedImprovements: string[]
}

/**
 * A/B test comparison result
 */
export interface ABTestResult {
  baselineScore: number
  candidateScore: number
  improvementDelta: number
  isStatisticallySignificant: boolean
  sampleSize: number
  detailedComparison: {
    dimension: keyof EvaluationScores
    baseline: number
    candidate: number
    delta: number
  }[]
}

/**
 * Evolution candidate with test results
 */
export interface EvolutionCandidateWithResults {
  id: string
  candidateVersion: number
  systemPrompt: string
  generationRationale: string
  status: EvolutionCandidateStatus
  abTestResult?: ABTestResult
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
}
