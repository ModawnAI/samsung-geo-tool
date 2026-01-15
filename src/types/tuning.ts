/**
 * Shared types for tuning components
 * These types align with database schema and are used across components
 */

import type { Tables, Json } from './database'

// Re-export database types for convenience
export type PromptVersion = Tables<'prompt_versions'>
export type ScoringWeight = Tables<'scoring_weights'>
export type BatchJob = Tables<'batch_jobs'>
export type BatchJobItem = Tables<'batch_job_items'>

// Engine types
export type Engine = 'gemini' | 'perplexity' | 'cohere'

// Prompt form data for create/edit operations
export interface PromptFormData {
  name: string
  version: string
  engine: Engine
  system_prompt: string
  description?: string
}

// Weight configuration (the actual weight values stored in scoring_weights.weights)
export interface WeightValues {
  usp_coverage: number
  grounding_score: number
  semantic_similarity: number
  anti_fabrication: number
  keyword_density: number
  structure_quality: number
}

// Weight form data for create/edit operations
export interface WeightFormData {
  name: string
  version: string
  weights: WeightValues
}

// Batch job status (matches database enum)
export type BatchJobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'

// Batch job item status (matches database enum)
export type BatchJobItemStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Batch job form data
export interface BatchJobFormData {
  name: string
  type: string
  total_items: number
  config?: Json
  estimated_cost?: number
}

// Upload types
export type UploadType = 'products' | 'briefs' | 'keywords'
export type UploadFormat = 'csv' | 'json'

// Upload result from API
export interface UploadResult {
  success: boolean
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

// Upload progress for tracking
export interface UploadProgress {
  total: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  currentItem?: string
  errors: Array<{ item: string; error: string }>
}

// Stage types for generation pipeline
export type Stage = 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'

// Test modes
export type TestMode = 'llm' | 'grounding'

// Grounding source from search APIs
export interface GroundingSource {
  title?: string
  snippet?: string
  url?: string
  date?: string
  source?: 'google' | 'perplexity'
  tier?: 1 | 2 | 3 | 4
}

// Grounding test result
export interface GroundingTestResult {
  sources: GroundingSource[]
  totalResults: number
  googleResults: number
  perplexityResults: number
  queriesUsed: string[]
  tierBreakdown: Record<1 | 2 | 3 | 4, number>
}

// Prompt test request/response
export interface PromptTestRequest {
  system_prompt: string
  engine: Engine
  variables: Record<string, string>
  user_message?: string
  stage?: Stage  // Optional stage for stage-specific prompt composition
  language?: 'en' | 'ko'
  live?: boolean  // Whether to make actual LLM calls
  testMode?: TestMode  // 'llm' for LLM test, 'grounding' for grounding test
}

export interface PromptTestResponse {
  output: string
  tokens: {
    input: number
    output: number
    total: number
  }
  latency: number
  error?: string
  composedPrompt?: string  // The full composed prompt used
  source?: 'mock' | 'live'  // Whether response is mock or from real LLM
  groundingResult?: GroundingTestResult  // Grounding test results when testMode is 'grounding'
}

// Weight labels for display
export const WEIGHT_LABELS: Record<keyof WeightValues, { label: string; description: string }> = {
  usp_coverage: { label: 'USP 커버리지', description: '핵심 셀링 포인트가 얼마나 잘 다뤄지는지' },
  grounding_score: { label: '그라운딩 점수', description: '사실 정확성과 인용 품질' },
  semantic_similarity: { label: '의미적 유사성', description: '브리프에 대한 콘텐츠 관련성' },
  anti_fabrication: { label: '허위 정보 방지', description: '허위 콘텐츠 생성 방지' },
  keyword_density: { label: '키워드 밀도', description: '타겟 키워드 존재 여부' },
  structure_quality: { label: '구조 품질', description: '콘텐츠 구성 및 형식' },
}

// Default weight values
// Updated 2026-01-08: Increased USP coverage (30%), decreased grounding (15%)
// Rationale: Brand USP should take priority over external grounding data
export const DEFAULT_WEIGHTS: WeightValues = {
  usp_coverage: 0.30,           // USP 우선순위 증가 (25% → 30%)
  grounding_score: 0.15,        // 그라운딩 점수 감소 (20% → 15%)
  semantic_similarity: 0.15,    // 유지
  anti_fabrication: 0.15,       // 유지
  keyword_density: 0.15,        // 유지
  structure_quality: 0.10,      // 유지
}

// Engine labels and colors for display
export const ENGINE_CONFIG: Record<Engine, { label: string; color: string }> = {
  gemini: { label: 'Gemini', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  perplexity: { label: 'Perplexity', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  cohere: { label: 'Cohere', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
}

// Template variables for prompt interpolation
export const TEMPLATE_VARIABLES = [
  { name: '{{product_name}}', description: 'Product name' },
  { name: '{{category}}', description: 'Product category' },
  { name: '{{usps}}', description: 'Unique selling points (comma-separated)' },
  { name: '{{keywords}}', description: 'Target keywords (comma-separated)' },
  { name: '{{competitor}}', description: 'Competitor name for comparison' },
  { name: '{{language}}', description: 'Target language (e.g., English, Korean)' },
  { name: '{{tone}}', description: 'Desired tone (professional, casual, etc.)' },
  { name: '{{audience}}', description: 'Target audience description' },
] as const

// Utility function to cast Json weights to WeightValues
export function parseWeightValues(weights: Json): WeightValues {
  const parsed = weights as Record<string, number>
  return {
    usp_coverage: parsed.usp_coverage ?? DEFAULT_WEIGHTS.usp_coverage,
    grounding_score: parsed.grounding_score ?? DEFAULT_WEIGHTS.grounding_score,
    semantic_similarity: parsed.semantic_similarity ?? DEFAULT_WEIGHTS.semantic_similarity,
    anti_fabrication: parsed.anti_fabrication ?? DEFAULT_WEIGHTS.anti_fabrication,
    keyword_density: parsed.keyword_density ?? DEFAULT_WEIGHTS.keyword_density,
    structure_quality: parsed.structure_quality ?? DEFAULT_WEIGHTS.structure_quality,
  }
}

// Utility function to validate weight values sum to ~1.0
export function validateWeightTotal(weights: WeightValues): { valid: boolean; total: number } {
  const total = Object.values(weights).reduce((sum, val) => sum + val, 0)
  return {
    valid: Math.abs(total - 1) < 0.01,
    total,
  }
}

// Utility function to normalize weights to sum to 1.0
export function normalizeWeights(weights: WeightValues): WeightValues {
  const total = Object.values(weights).reduce((sum, val) => sum + val, 0)
  if (total === 0) return { ...DEFAULT_WEIGHTS }

  return {
    usp_coverage: weights.usp_coverage / total,
    grounding_score: weights.grounding_score / total,
    semantic_similarity: weights.semantic_similarity / total,
    anti_fabrication: weights.anti_fabrication / total,
    keyword_density: weights.keyword_density / total,
    structure_quality: weights.structure_quality / total,
  }
}

// ============================================================================
// Domain Blacklist Types
// ============================================================================

// Individual domain entry in a blacklist
export interface BlacklistDomain {
  domain: string
  reason?: string
  added_at: string  // ISO date string
}

// Database row type for domain_blacklist table
export interface DomainBlacklistRow {
  id: string
  name: string
  version: string
  domains: BlacklistDomain[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// Form data for creating/editing blacklist configs
export interface BlacklistFormData {
  name: string
  version: string
  domains: BlacklistDomain[]
}

// Loaded blacklist from cache/API
export interface LoadedBlacklist {
  id: string
  name: string
  version: string
  domains: Set<string>  // Set for O(1) lookup
  domainDetails: Map<string, BlacklistDomain>  // Full details by domain
  loadedAt: number  // Timestamp for cache invalidation
}

// Result from blacklist loader
export interface BlacklistLoaderResult {
  blacklist: LoadedBlacklist | null
  source: 'cache' | 'database' | 'none'
  error?: string
}

// Result of domain blacklist check
export interface BlacklistCheckResult {
  isBlacklisted: boolean
  reason?: string
  matchedDomain?: string  // The domain that matched (could be parent domain)
}
