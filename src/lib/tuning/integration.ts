/**
 * Tuning Integration Service
 * Bridges tuning console configuration with generate-v2 pipeline
 * Connects prompts, weights, and tracking across the system
 */

import { createClient } from '@/lib/supabase/server'
import {
  loadActivePrompt,
  loadActivePrompts,
  interpolatePrompt,
  composeStagePrompt,
  getDefaultPrompt,
  type LoadedPrompt,
  type PromptLoaderResult,
  type StagePromptConfig,
} from './prompt-loader'
import {
  loadActiveWeights,
  calculateWeightedScore,
  calculateScoreBreakdown,
  getDefaultWeights,
  type LoadedWeights,
  type WeightsLoaderResult,
  type ScoreBreakdown,
} from './weights-loader'
import type { Engine, WeightValues } from '@/types/tuning'
import type { PromptStage } from '@/types/prompt-studio'
import { GEO_SCORE_CONFIG } from '@/lib/scoring/scoring-config'

// ==========================================
// STAGE PROMPT TYPES (Prompt Studio Integration)
// ==========================================

/**
 * Stage prompt record from stage_prompts table
 * Used when Prompt Studio prompts are active for production
 */
export interface StagePromptRecord {
  id: string
  stage: PromptStage
  stage_system_prompt: string | null
  temperature: number
  max_tokens: number
  top_p: number
  model: string
  workflow_status: 'draft' | 'testing' | 'pending_approval' | 'active' | 'archived'
  prompt_version_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * All pipeline stages that can have custom prompts
 */
export const PIPELINE_STAGES: PromptStage[] = [
  'grounding',
  'description',
  'usp',
  'faq',
  'chapters',
  'case_studies',
  'keywords',
  'hashtags',
]

// ==========================================
// CONFIGURATION TYPES
// ==========================================

export interface TuningConfig {
  prompts: Record<Engine, PromptLoaderResult>
  weights: WeightsLoaderResult
  /** Stage-specific prompts from Prompt Studio (active workflow_status) */
  stagePrompts: Partial<Record<PromptStage, StagePromptRecord>>
  loadedAt: string
  source: 'database' | 'default' | 'mixed'
}

export interface GenerationContext {
  config: TuningConfig
  generationId?: string
  trackPromptVersion: boolean
}

export interface StageResult {
  stage: string
  promptVersionId: string | null
  weightsVersionId: string | null
  executionTimeMs: number
  success: boolean
  error?: string
}

export interface GEOScoreResult {
  scores: Partial<Record<keyof WeightValues, number>>
  breakdown: ScoreBreakdown[]
  finalScore: number
  weightsVersionId: string | null
  weightsSource: 'database' | 'default'
}

// ==========================================
// CONFIGURATION LOADING
// ==========================================

/**
 * Load active stage prompts from Prompt Studio
 * Returns prompts with workflow_status='active' for each stage
 */
export async function loadActiveStagePrompts(): Promise<Partial<Record<PromptStage, StagePromptRecord>>> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('stage_prompts')
      .select('*')
      .eq('workflow_status', 'active')

    if (error) {
      console.warn('[Integration] Failed to load stage prompts:', error.message)
      return {}
    }

    if (!data || data.length === 0) {
      console.log('[Integration] No active stage prompts found, using hardcoded defaults')
      return {}
    }

    // Map to stage -> record
    const stagePrompts: Partial<Record<PromptStage, StagePromptRecord>> = {}
    for (const row of data as StagePromptRecord[]) {
      stagePrompts[row.stage] = row
    }

    console.log(`[Integration] Loaded ${Object.keys(stagePrompts).length} active stage prompts`)
    return stagePrompts
  } catch (error) {
    console.error('[Integration] Error loading stage prompts:', error)
    return {}
  }
}

/**
 * Load complete tuning configuration for a generation run
 * Fetches active prompts for all engines, active weights, and active stage prompts
 */
export async function loadTuningConfig(): Promise<TuningConfig> {
  const [prompts, weights, stagePrompts] = await Promise.all([
    loadActivePrompts(['gemini', 'perplexity', 'cohere']),
    loadActiveWeights(),
    loadActiveStagePrompts(),
  ])

  // Determine overall source
  const promptSources = Object.values(prompts).map(p => p.source)
  const hasStagePrompts = Object.keys(stagePrompts).length > 0
  const allDatabase = promptSources.every(s => s === 'database') && weights.source === 'database'
  const allDefault = promptSources.every(s => s === 'default') && weights.source === 'default' && !hasStagePrompts
  const source = allDatabase ? 'database' : allDefault ? 'default' : 'mixed'

  return {
    prompts,
    weights,
    stagePrompts,
    loadedAt: new Date().toISOString(),
    source,
  }
}

/**
 * Load tuning configuration for specific engines only
 * Use when you only need a subset of engines
 */
export async function loadTuningConfigForEngines(
  engines: Engine[]
): Promise<TuningConfig> {
  const [prompts, weights, stagePrompts] = await Promise.all([
    loadActivePrompts(engines),
    loadActiveWeights(),
    loadActiveStagePrompts(),
  ])

  const promptSources = Object.values(prompts).map(p => p.source)
  const hasStagePrompts = Object.keys(stagePrompts).length > 0
  const allDatabase = promptSources.every(s => s === 'database') && weights.source === 'database'
  const allDefault = promptSources.every(s => s === 'default') && weights.source === 'default' && !hasStagePrompts

  return {
    prompts,
    weights,
    stagePrompts,
    loadedAt: new Date().toISOString(),
    source: allDatabase ? 'database' : allDefault ? 'default' : 'mixed',
  }
}

// ==========================================
// PROMPT COMPOSITION
// ==========================================

export type PipelineStage =
  | 'description'
  | 'usp'
  | 'faq'
  | 'chapters'
  | 'case_studies'
  | 'keywords'
  | 'hashtags'

interface StagePromptOptions {
  stage: PipelineStage
  engine: Engine
  language: 'ko' | 'en'
  antiFabricationLevel?: 'low' | 'medium' | 'high'
  variables?: Record<string, string | string[]>
  // Samsung Standard Fields (Part 5.4)
  contentType?: 'intro' | 'unboxing' | 'how_to' | 'shorts' | 'teaser' | 'brand' | 'esg' | 'documentary' | 'official_replay'
  videoFormat?: 'feed_16x9' | 'shorts_9x16'
  vanityLinkCode?: string
}

/**
 * Result of getStagePrompt including tracking IDs
 */
export interface StagePromptResult {
  prompt: string
  /** ID of the engine prompt_versions record */
  promptVersionId: string | null
  /** ID of the stage_prompts record (from Prompt Studio) */
  stagePromptId: string | null
  /** Source of the stage instructions */
  stagePromptSource: 'database' | 'default'
  source: 'database' | 'default'
}

/**
 * Get composed prompt for a specific pipeline stage
 * Combines base prompt from database with stage-specific instructions
 *
 * Priority for stage instructions:
 * 1. Active stage prompt from Prompt Studio (config.stagePrompts)
 * 2. Hardcoded stage instructions (fallback)
 */
export function getStagePrompt(
  config: TuningConfig,
  options: StagePromptOptions
): StagePromptResult {
  const {
    stage,
    engine,
    language,
    antiFabricationLevel = 'medium',
    variables,
    // Samsung Standard Fields (Part 5.4)
    contentType,
    videoFormat,
    vanityLinkCode,
  } = options

  const promptResult = config.prompts[engine]
  const basePrompt = promptResult.prompt?.systemPrompt || getDefaultPrompt(engine)

  // Get stage-specific prompt from Prompt Studio if available
  const stagePromptRecord = config.stagePrompts[stage as PromptStage]
  const databaseStagePrompt = stagePromptRecord?.stage_system_prompt || null

  // Compose with stage-specific instructions (including Samsung fields)
  // Pass database stage prompt to override hardcoded instructions if available
  const composed = composeStagePrompt({
    stage,
    basePrompt,
    antiFabricationLevel,
    language,
    // Samsung Standard Fields (Part 5.4)
    contentType,
    videoFormat,
    vanityLinkCode,
    // Prompt Studio integration
    databaseStagePrompt,
  })

  // Interpolate variables if provided
  const finalPrompt = variables
    ? interpolatePrompt(composed, variables)
    : composed

  return {
    prompt: finalPrompt,
    promptVersionId: promptResult.source === 'database' ? promptResult.prompt?.id || null : null,
    stagePromptId: stagePromptRecord?.id || null,
    stagePromptSource: databaseStagePrompt ? 'database' : 'default',
    source: promptResult.source,
  }
}

/**
 * Get base prompt for an engine without stage composition
 * Use for custom stage logic
 */
export function getBasePrompt(
  config: TuningConfig,
  engine: Engine
): {
  prompt: string
  promptVersionId: string | null
  source: 'database' | 'default'
} {
  const promptResult = config.prompts[engine]

  return {
    prompt: promptResult.prompt?.systemPrompt || getDefaultPrompt(engine),
    promptVersionId: promptResult.source === 'database' ? promptResult.prompt?.id || null : null,
    source: promptResult.source,
  }
}

// ==========================================
// SCORE CALCULATION
// ==========================================

/**
 * Map generate-v2 scores to weight metric names
 * Bridges the scoring system with tuning weights
 */
export interface RawGenerationScores {
  keywordDensity: number        // maps to keyword_density
  aiExposure: number            // maps to grounding_score
  questionPatterns: number      // contributes to structure_quality
  sentenceStructure: number     // contributes to structure_quality
  lengthCompliance: number      // contributes to structure_quality
  groundingQuality: number      // maps to grounding_score
  uspCoverage?: number          // maps to usp_coverage
  semanticSimilarity?: number   // maps to semantic_similarity
  antiFabrication?: number      // maps to anti_fabrication
}

/**
 * Calculate final GEO score using loaded weights
 * Normalizes raw generation scores to weight metrics
 *
 * Updated 2026-01-08: Use centralized GEO_SCORE_CONFIG for normalization
 */
export function calculateGEOScore(
  rawScores: RawGenerationScores,
  config: TuningConfig
): GEOScoreResult {
  const weights = config.weights.weights?.weights || getDefaultWeights()
  const { NORMALIZATION, DEFAULT_ESTIMATES, OUTPUT_SCALE } = GEO_SCORE_CONFIG

  // Normalize raw scores to 0-1 scale and map to weight metrics
  // Using centralized configuration for normalization denominators
  const normalizedScores: Partial<Record<keyof WeightValues, number>> = {
    // Keyword density: 0-20 points -> 0-1
    keyword_density: Math.min(1, (rawScores.keywordDensity || 0) / NORMALIZATION.keywordDensity),

    // Grounding: combine aiExposure (0-30) and groundingQuality (0-20)
    grounding_score: Math.min(1,
      ((rawScores.aiExposure || 0) / NORMALIZATION.aiExposure +
       (rawScores.groundingQuality || 0) / NORMALIZATION.groundingQuality) / 2
    ),

    // Structure quality: combine question, sentence, length (each 0-15/20)
    structure_quality: Math.min(1,
      ((rawScores.questionPatterns || 0) / NORMALIZATION.questionPatterns +
       (rawScores.sentenceStructure || 0) / NORMALIZATION.sentenceStructure +
       (rawScores.lengthCompliance || 0) / NORMALIZATION.lengthCompliance) / 3
    ),

    // USP coverage: direct if available, use configurable default estimate otherwise
    usp_coverage: rawScores.uspCoverage !== undefined
      ? Math.min(1, rawScores.uspCoverage)
      : DEFAULT_ESTIMATES.uspCoverage,

    // Semantic similarity: direct if available
    semantic_similarity: rawScores.semanticSimilarity !== undefined
      ? Math.min(1, rawScores.semanticSimilarity)
      : DEFAULT_ESTIMATES.semanticSimilarity,

    // Anti-fabrication: direct if available
    anti_fabrication: rawScores.antiFabrication !== undefined
      ? Math.min(1, rawScores.antiFabrication)
      : DEFAULT_ESTIMATES.antiFabrication,
  }

  const { breakdown, finalScore } = calculateScoreBreakdown(normalizedScores, weights)

  return {
    scores: normalizedScores,
    breakdown,
    finalScore: Math.round(finalScore * OUTPUT_SCALE), // Convert to 0-100 scale
    weightsVersionId: config.weights.weights?.id || null,
    weightsSource: config.weights.source,
  }
}

/**
 * Calculate enhanced GEO score with all metrics
 * Use when you have complete scoring data
 */
export function calculateEnhancedGEOScore(
  scores: Partial<Record<keyof WeightValues, number>>,
  config: TuningConfig
): GEOScoreResult {
  const weights = config.weights.weights?.weights || getDefaultWeights()
  const { breakdown, finalScore } = calculateScoreBreakdown(scores, weights)

  return {
    scores,
    breakdown,
    finalScore: Math.round(finalScore * 100),
    weightsVersionId: config.weights.weights?.id || null,
    weightsSource: config.weights.source,
  }
}

// ==========================================
// GENERATION TRACKING
// ==========================================

/**
 * Record which prompt version was used for a generation
 * Creates audit trail for A/B testing and analysis
 */
export async function recordGenerationPromptVersion(
  generationId: string,
  promptVersionId: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!promptVersionId) {
    return { success: true } // No tracking needed for default prompts
  }

  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('generations')
      .update({ created_with_prompt_version: promptVersionId })
      .eq('id', generationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('[Integration] Failed to record prompt version:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create validation result record for comparing AI vs human scores
 * Used by ValidationService for quality analysis
 */
export async function createValidationRecord(params: {
  generationId: string
  promptVersionId: string | null
  weightsVersionId: string | null
  aiScores: Record<string, number>
}): Promise<{ id: string | null; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('validation_results')
      .insert({
        generation_id: params.generationId,
        prompt_version_id: params.promptVersionId,
        weights_version_id: params.weightsVersionId,
        ai_scores: params.aiScores,
        validation_status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    const row = data as { id: string } | null
    return { id: row?.id || null }
  } catch (error) {
    console.error('[Integration] Failed to create validation record:', error)
    return {
      id: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==========================================
// CONFIGURATION SUMMARY
// ==========================================

/**
 * Get summary of current tuning configuration
 * Useful for debugging and status display
 */
export function getTuningConfigSummary(config: TuningConfig): {
  promptsLoaded: number
  promptsSources: Record<Engine, 'database' | 'default'>
  weightsSource: 'database' | 'default'
  weightsName: string
  loadedAt: string
} {
  const promptsSources = {} as Record<Engine, 'database' | 'default'>
  let promptsLoaded = 0

  for (const [engine, result] of Object.entries(config.prompts) as [Engine, PromptLoaderResult][]) {
    promptsSources[engine] = result.source
    if (result.source === 'database') promptsLoaded++
  }

  return {
    promptsLoaded,
    promptsSources,
    weightsSource: config.weights.source,
    weightsName: config.weights.weights?.name || 'Default Weights',
    loadedAt: config.loadedAt,
  }
}

/**
 * Check if configuration is fully from database (production ready)
 */
export function isProductionConfig(config: TuningConfig): boolean {
  return config.source === 'database'
}

/**
 * Check if any configuration failed to load
 */
export function hasConfigErrors(config: TuningConfig): {
  hasErrors: boolean
  errors: string[]
} {
  const errors: string[] = []

  for (const [engine, result] of Object.entries(config.prompts)) {
    if (result.error) {
      errors.push(`${engine} prompt: ${result.error}`)
    }
  }

  if (config.weights.error) {
    errors.push(`weights: ${config.weights.error}`)
  }

  return {
    hasErrors: errors.length > 0,
    errors,
  }
}

// ==========================================
// RE-EXPORTS FOR GENERATE-V2
// ==========================================

// Re-export from prompt-loader
export {
  loadActivePrompt,
  loadActivePrompts,
  interpolatePrompt,
  getDefaultPrompt,
  type LoadedPrompt,
} from './prompt-loader'

// Re-export from weights-loader
export {
  loadActiveWeights,
  getDefaultWeights,
  type LoadedWeights,
} from './weights-loader'

// Re-export from types
export type { WeightValues, Engine } from '@/types/tuning'
