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

// Prompt test request/response
export interface PromptTestRequest {
  system_prompt: string
  engine: Engine
  variables: Record<string, string>
  user_message?: string
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
}

// Weight labels for display
export const WEIGHT_LABELS: Record<keyof WeightValues, { label: string; description: string }> = {
  usp_coverage: { label: 'USP Coverage', description: 'How well key selling points are covered' },
  grounding_score: { label: 'Grounding Score', description: 'Factual accuracy and citation quality' },
  semantic_similarity: { label: 'Semantic Similarity', description: 'Content relevance to brief' },
  anti_fabrication: { label: 'Anti-Fabrication', description: 'Prevention of hallucinated content' },
  keyword_density: { label: 'Keyword Density', description: 'Target keyword presence' },
  structure_quality: { label: 'Structure Quality', description: 'Content organization and format' },
}

// Default weight values
export const DEFAULT_WEIGHTS: WeightValues = {
  usp_coverage: 0.25,
  grounding_score: 0.2,
  semantic_similarity: 0.15,
  anti_fabrication: 0.15,
  keyword_density: 0.15,
  structure_quality: 0.1,
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
