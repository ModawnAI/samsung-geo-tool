/**
 * WeightsLoader Service
 * Loads active scoring weights from scoring_weights table
 * Integrates tuning console weights with generate-v2 scoring pipeline
 */

import { createClient } from '@/lib/supabase/server'
import type { Tables, Json } from '@/types/database'
import {
  type WeightValues,
  DEFAULT_WEIGHTS,
  parseWeightValues,
  validateWeightTotal,
  normalizeWeights,
} from '@/types/tuning'

export type ScoringWeight = Tables<'scoring_weights'>

export interface LoadedWeights {
  id: string
  name: string
  version: string
  weights: WeightValues
  isActive: boolean
}

export interface WeightsLoaderResult {
  weights: LoadedWeights | null
  source: 'database' | 'default'
  error?: string
}

/**
 * Load active scoring weights from the database
 * Falls back to default weights if none configured or on error
 */
export async function loadActiveWeights(): Promise<WeightsLoaderResult> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('scoring_weights')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // PGRST116 = no rows returned (not a real error, just no active weights)
      if (error.code === 'PGRST116') {
        console.log('[WeightsLoader] No active weights configured, using defaults')
        return {
          weights: createDefaultWeights(),
          source: 'default',
        }
      }
      throw error
    }

    const row = data as ScoringWeight
    const parsedWeights = parseWeightValues(row.weights)
    const validation = validateWeightTotal(parsedWeights)

    // Auto-normalize if weights don't sum to 1.0
    const finalWeights = validation.valid ? parsedWeights : normalizeWeights(parsedWeights)

    if (!validation.valid) {
      console.warn(
        `[WeightsLoader] Weights sum to ${validation.total}, auto-normalizing to 1.0`
      )
    }

    return {
      weights: {
        id: row.id,
        name: row.name,
        version: row.version,
        weights: finalWeights,
        isActive: row.is_active,
      },
      source: 'database',
    }
  } catch (error) {
    console.error('[WeightsLoader] Error loading weights:', error)
    return {
      weights: createDefaultWeights(),
      source: 'default',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Load all weight configurations (active and inactive)
 * Useful for weight management UI
 */
export async function loadAllWeights(): Promise<{
  weights: ScoringWeight[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('scoring_weights')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { weights: (data as ScoringWeight[]) || [] }
  } catch (error) {
    console.error('[WeightsLoader] Error loading all weights:', error)
    return {
      weights: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Load a specific weight configuration by ID
 */
export async function loadWeightsById(id: string): Promise<WeightsLoaderResult> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('scoring_weights')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    const row = data as ScoringWeight
    const parsedWeights = parseWeightValues(row.weights)

    return {
      weights: {
        id: row.id,
        name: row.name,
        version: row.version,
        weights: parsedWeights,
        isActive: row.is_active,
      },
      source: 'database',
    }
  } catch (error) {
    console.error(`[WeightsLoader] Error loading weights ${id}:`, error)
    return {
      weights: null,
      source: 'default',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create default weights object for fallback
 */
function createDefaultWeights(): LoadedWeights {
  return {
    id: 'default',
    name: 'Default Scoring Weights',
    version: '1.0.0',
    weights: { ...DEFAULT_WEIGHTS },
    isActive: true,
  }
}

/**
 * Get default weights (for comparison or reset)
 */
export function getDefaultWeights(): WeightValues {
  return { ...DEFAULT_WEIGHTS }
}

/**
 * Calculate weighted score from individual component scores
 * Uses loaded weights to compute final GEO score
 */
export function calculateWeightedScore(
  scores: Partial<Record<keyof WeightValues, number>>,
  weights: WeightValues
): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const [key, weight] of Object.entries(weights) as [keyof WeightValues, number][]) {
    const score = scores[key]
    if (score !== undefined && score !== null) {
      weightedSum += score * weight
      totalWeight += weight
    }
  }

  // Normalize by actual weights used (in case some scores are missing)
  if (totalWeight === 0) return 0
  return Math.round((weightedSum / totalWeight) * 100) / 100
}

/**
 * Calculate component scores breakdown
 * Returns detailed scoring for each metric
 */
export interface ScoreBreakdown {
  metric: keyof WeightValues
  label: string
  score: number
  weight: number
  weightedScore: number
  contribution: number // percentage of final score
}

export function calculateScoreBreakdown(
  scores: Partial<Record<keyof WeightValues, number>>,
  weights: WeightValues
): {
  breakdown: ScoreBreakdown[]
  finalScore: number
} {
  const labels: Record<keyof WeightValues, string> = {
    usp_coverage: 'USP Coverage',
    grounding_score: 'Grounding Score',
    semantic_similarity: 'Semantic Similarity',
    anti_fabrication: 'Anti-Fabrication',
    keyword_density: 'Keyword Density',
    structure_quality: 'Structure Quality',
  }

  const breakdown: ScoreBreakdown[] = []
  let totalWeightedScore = 0

  for (const [key, weight] of Object.entries(weights) as [keyof WeightValues, number][]) {
    const score = scores[key] ?? 0
    const weightedScore = score * weight
    totalWeightedScore += weightedScore

    breakdown.push({
      metric: key,
      label: labels[key],
      score,
      weight,
      weightedScore,
      contribution: 0, // calculated after total is known
    })
  }

  // Calculate contribution percentages
  for (const item of breakdown) {
    item.contribution =
      totalWeightedScore > 0
        ? Math.round((item.weightedScore / totalWeightedScore) * 100)
        : 0
  }

  return {
    breakdown,
    finalScore: Math.round(totalWeightedScore * 100) / 100,
  }
}

/**
 * Compare two weight configurations
 * Useful for A/B testing or version comparison
 */
export function compareWeights(
  weightsA: WeightValues,
  weightsB: WeightValues
): {
  differences: Array<{
    metric: keyof WeightValues
    valueA: number
    valueB: number
    delta: number
    percentChange: number
  }>
  totalDelta: number
} {
  const differences: Array<{
    metric: keyof WeightValues
    valueA: number
    valueB: number
    delta: number
    percentChange: number
  }> = []

  let totalDelta = 0

  for (const key of Object.keys(weightsA) as (keyof WeightValues)[]) {
    const valueA = weightsA[key]
    const valueB = weightsB[key]
    const delta = valueB - valueA
    const percentChange = valueA > 0 ? (delta / valueA) * 100 : 0

    totalDelta += Math.abs(delta)

    differences.push({
      metric: key,
      valueA,
      valueB,
      delta,
      percentChange: Math.round(percentChange * 10) / 10,
    })
  }

  return {
    differences,
    totalDelta: Math.round(totalDelta * 1000) / 1000,
  }
}

/**
 * Validate scores are within expected range (0-1 or 0-100)
 */
export function validateScores(
  scores: Partial<Record<keyof WeightValues, number>>,
  scale: 'normalized' | 'percentage' = 'normalized'
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const maxValue = scale === 'normalized' ? 1 : 100

  for (const [key, value] of Object.entries(scores)) {
    if (value !== undefined && value !== null) {
      if (value < 0) {
        errors.push(`${key}: value ${value} is negative`)
      }
      if (value > maxValue) {
        errors.push(`${key}: value ${value} exceeds maximum ${maxValue}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
