/**
 * Prompt Studio Types
 * Types for stage-based prompt management and testing system
 */

import type { Tables, Json } from './database'

// Re-export database types
export type StagePrompt = Tables<'stage_prompts'>
export type PromptTestRun = Tables<'prompt_test_runs'>
export type StageTestInput = Tables<'stage_test_inputs'>

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
}

// ============================================================================
// Constants
// ============================================================================

export const PROMPT_STAGES: PromptStage[] = [
  'description',
  'usp',
  'faq',
  'chapters',
  'case_studies',
  'keywords',
  'hashtags',
]

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
  },
}

export const DEFAULT_LLM_PARAMETERS = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  model: 'gemini-3-flash-preview',
}

export const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
]
