/**
 * ValidationService
 * Manages AI vs human score comparison and validation workflows
 * Tracks scoring accuracy across prompt/weight versions for tuning optimization
 */

import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables, Json } from '@/types/database'
import type { WeightValues, DEFAULT_WEIGHTS, WEIGHT_LABELS } from '@/types/tuning'
import {
  loadActiveWeights,
  calculateScoreBreakdown,
  getDefaultWeights,
  type ScoreBreakdown,
} from './weights-loader'

// ==========================================
// TYPES
// ==========================================

export type ValidationResult = Tables<'validation_results'>
export type ValidationStatus = 'pending' | 'approved' | 'rejected'

export interface ValidationScores {
  usp_coverage?: number
  grounding_score?: number
  semantic_similarity?: number
  anti_fabrication?: number
  keyword_density?: number
  structure_quality?: number
}

export interface CreateValidationParams {
  generationId: string | null
  promptVersionId?: string | null
  weightsVersionId?: string | null
  aiScores: ValidationScores
}

export interface SubmitHumanScoresParams {
  validationId: string
  humanScores: ValidationScores
  validatedBy: string
  notes?: string
  status?: ValidationStatus
}

export interface ValidationAnalysis {
  validationId: string
  generationId: string | null
  aiScores: ValidationScores
  humanScores: ValidationScores | null
  scoreDifferences: Partial<Record<keyof WeightValues, number>> | null
  overallDifference: number | null
  status: ValidationStatus
  breakdown: {
    ai: ScoreBreakdown[]
    human: ScoreBreakdown[] | null
  }
}

export interface ValidationStats {
  total: number
  pending: number
  approved: number
  rejected: number
  averageScoreDiff: number
  metricAccuracy: Record<keyof WeightValues, {
    avgDiff: number
    stdDev: number
    correlation: number
  }>
  byPromptVersion: Record<string, {
    count: number
    avgDiff: number
    approvalRate: number
  }>
  byWeightsVersion: Record<string, {
    count: number
    avgDiff: number
    approvalRate: number
  }>
}

export interface ValidationTrend {
  date: string
  count: number
  avgDiff: number
  approvalRate: number
}

// ==========================================
// VALIDATION CRUD OPERATIONS
// ==========================================

/**
 * Create a validation record when AI generates scores
 * Called automatically by generate-v2 pipeline
 */
export async function createValidationRecord(
  params: CreateValidationParams
): Promise<{ id: string | null; error?: string }> {
  try {
    const supabase = await createClient()

    const validationData: InsertTables<'validation_results'> = {
      generation_id: params.generationId,
      prompt_version_id: params.promptVersionId || null,
      weights_version_id: params.weightsVersionId || null,
      ai_scores: params.aiScores as unknown as Json,
      validation_status: 'pending',
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('validation_results')
      .insert(validationData)
      .select('id')
      .single()

    if (error) throw error

    console.log(`[ValidationService] Created validation record ${data?.id}`)

    return { id: data?.id || null }
  } catch (error) {
    console.error('[ValidationService] Error creating validation record:', error)
    return {
      id: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a validation record by ID
 */
export async function getValidationRecord(
  validationId: string
): Promise<{ validation: ValidationResult | null; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('validation_results')
      .select('*')
      .eq('id', validationId)
      .single()

    if (error) throw error

    return { validation: data }
  } catch (error) {
    console.error(`[ValidationService] Error getting validation ${validationId}:`, error)
    return {
      validation: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get validation record by generation ID
 */
export async function getValidationByGenerationId(
  generationId: string
): Promise<{ validation: ValidationResult | null; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('validation_results')
      .select('*')
      .eq('generation_id', generationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { validation: data || null }
  } catch (error) {
    console.error(`[ValidationService] Error getting validation for generation ${generationId}:`, error)
    return {
      validation: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Submit human scores for a validation record
 * Calculates score difference and updates validation status
 */
export async function submitHumanScores(
  params: SubmitHumanScoresParams
): Promise<{ success: boolean; scoreDiff: number | null; error?: string }> {
  try {
    const supabase = await createClient()

    // Get the existing validation record
    const { validation, error: fetchError } = await getValidationRecord(params.validationId)

    if (fetchError || !validation) {
      throw new Error(fetchError || 'Validation record not found')
    }

    // Calculate score difference
    const aiScores = validation.ai_scores as unknown as ValidationScores
    const scoreDiff = calculateOverallScoreDifference(aiScores, params.humanScores)

    // Determine status based on scores if not provided
    const status = params.status || determineValidationStatus(scoreDiff)

    const updates: UpdateTables<'validation_results'> = {
      human_scores: params.humanScores as unknown as Json,
      score_diff: scoreDiff,
      validation_status: status,
      validated_by: params.validatedBy,
      validated_at: new Date().toISOString(),
      notes: params.notes || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('validation_results')
      .update(updates)
      .eq('id', params.validationId)

    if (error) throw error

    console.log(
      `[ValidationService] Human scores submitted for ${params.validationId}, diff: ${scoreDiff}`
    )

    return { success: true, scoreDiff }
  } catch (error) {
    console.error('[ValidationService] Error submitting human scores:', error)
    return {
      success: false,
      scoreDiff: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update validation status (approve/reject without scores)
 */
export async function updateValidationStatus(
  validationId: string,
  status: ValidationStatus,
  validatedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const updates: UpdateTables<'validation_results'> = {
      validation_status: status,
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
      notes: notes || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('validation_results')
      .update(updates)
      .eq('id', validationId)

    if (error) throw error

    console.log(`[ValidationService] Status updated for ${validationId}: ${status}`)

    return { success: true }
  } catch (error) {
    console.error(`[ValidationService] Error updating status for ${validationId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==========================================
// VALIDATION QUERIES
// ==========================================

/**
 * List validation records with filtering and pagination
 */
export async function listValidationRecords(options?: {
  status?: ValidationStatus
  promptVersionId?: string
  weightsVersionId?: string
  generationId?: string
  limit?: number
  offset?: number
}): Promise<{ validations: ValidationResult[]; total: number; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('validation_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('validation_status', options.status)
    }

    if (options?.promptVersionId) {
      query = query.eq('prompt_version_id', options.promptVersionId)
    }

    if (options?.weightsVersionId) {
      query = query.eq('weights_version_id', options.weightsVersionId)
    }

    if (options?.generationId) {
      query = query.eq('generation_id', options.generationId)
    }

    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) throw error

    return { validations: data || [], total: count || 0 }
  } catch (error) {
    console.error('[ValidationService] Error listing validations:', error)
    return {
      validations: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending validations for human review
 */
export async function getPendingValidations(
  limit: number = 20
): Promise<{ validations: ValidationResult[]; total: number; error?: string }> {
  return listValidationRecords({ status: 'pending', limit })
}

// ==========================================
// VALIDATION ANALYSIS
// ==========================================

/**
 * Analyze a validation record with detailed breakdown
 */
export async function analyzeValidation(
  validationId: string
): Promise<{ analysis: ValidationAnalysis | null; error?: string }> {
  try {
    const { validation, error } = await getValidationRecord(validationId)

    if (error || !validation) {
      return { analysis: null, error: error || 'Validation not found' }
    }

    const aiScores = validation.ai_scores as unknown as ValidationScores
    const humanScores = validation.human_scores as unknown as ValidationScores | null

    // Load weights for breakdown calculation
    const weightsResult = await loadActiveWeights()
    const weights = weightsResult.weights?.weights || getDefaultWeights()

    // Calculate AI breakdown
    const aiBreakdown = calculateScoreBreakdown(
      normalizeScoresToWeightKeys(aiScores),
      weights
    ).breakdown

    // Calculate human breakdown if available
    let humanBreakdown: ScoreBreakdown[] | null = null
    let scoreDifferences: Partial<Record<keyof WeightValues, number>> | null = null

    if (humanScores) {
      humanBreakdown = calculateScoreBreakdown(
        normalizeScoresToWeightKeys(humanScores),
        weights
      ).breakdown

      scoreDifferences = calculateMetricDifferences(aiScores, humanScores)
    }

    const analysis: ValidationAnalysis = {
      validationId,
      generationId: validation.generation_id,
      aiScores,
      humanScores,
      scoreDifferences,
      overallDifference: validation.score_diff,
      status: validation.validation_status,
      breakdown: {
        ai: aiBreakdown,
        human: humanBreakdown,
      },
    }

    return { analysis }
  } catch (error) {
    console.error(`[ValidationService] Error analyzing validation ${validationId}:`, error)
    return {
      analysis: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get comprehensive validation statistics
 */
export async function getValidationStats(): Promise<{
  stats: ValidationStats | null
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get all validation records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: validations, error } = await (supabase as any)
      .from('validation_results')
      .select('*')

    if (error) throw error

    if (!validations || validations.length === 0) {
      return {
        stats: createEmptyStats(),
      }
    }

    // Calculate basic counts
    const total = validations.length
    const pending = validations.filter((v: { validation_status: string }) => v.validation_status === 'pending').length
    const approved = validations.filter((v: { validation_status: string }) => v.validation_status === 'approved').length
    const rejected = validations.filter((v: { validation_status: string }) => v.validation_status === 'rejected').length

    // Calculate average score difference (only from validated records)
    const validatedRecords = validations.filter((v: { score_diff: number | null }) => v.score_diff !== null)
    const averageScoreDiff =
      validatedRecords.length > 0
        ? validatedRecords.reduce((sum: number, v: { score_diff: number | null }) => sum + (v.score_diff || 0), 0) / validatedRecords.length
        : 0

    // Calculate metric-level accuracy
    const metricAccuracy = calculateMetricAccuracy(validations)

    // Calculate stats by prompt version
    const byPromptVersion = calculateVersionStats(validations, 'prompt_version_id')

    // Calculate stats by weights version
    const byWeightsVersion = calculateVersionStats(validations, 'weights_version_id')

    const stats: ValidationStats = {
      total,
      pending,
      approved,
      rejected,
      averageScoreDiff: Math.round(averageScoreDiff * 1000) / 1000,
      metricAccuracy,
      byPromptVersion,
      byWeightsVersion,
    }

    return { stats }
  } catch (error) {
    console.error('[ValidationService] Error getting validation stats:', error)
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get validation trends over time
 */
export async function getValidationTrends(
  days: number = 30
): Promise<{ trends: ValidationTrend[]; error?: string }> {
  try {
    const supabase = await createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: validations, error } = await (supabase as any)
      .from('validation_results')
      .select('created_at, score_diff, validation_status')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by date
    const dailyData: Record<
      string,
      { count: number; diffs: number[]; approved: number }
    > = {}

    for (const v of validations || []) {
      const date = v.created_at.split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, diffs: [], approved: 0 }
      }
      dailyData[date].count++
      if (v.score_diff !== null) {
        dailyData[date].diffs.push(v.score_diff)
      }
      if (v.validation_status === 'approved') {
        dailyData[date].approved++
      }
    }

    // Convert to trend array
    const trends: ValidationTrend[] = Object.entries(dailyData).map(([date, data]) => ({
      date,
      count: data.count,
      avgDiff:
        data.diffs.length > 0
          ? Math.round(
              (data.diffs.reduce((a, b) => a + b, 0) / data.diffs.length) * 1000
            ) / 1000
          : 0,
      approvalRate:
        data.count > 0 ? Math.round((data.approved / data.count) * 100) : 0,
    }))

    return { trends }
  } catch (error) {
    console.error('[ValidationService] Error getting validation trends:', error)
    return {
      trends: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==========================================
// VERSION COMPARISON
// ==========================================

/**
 * Compare validation accuracy between two prompt versions
 */
export async function comparePromptVersions(
  versionIdA: string,
  versionIdB: string
): Promise<{
  comparison: {
    versionA: { id: string; avgDiff: number; approvalRate: number; count: number }
    versionB: { id: string; avgDiff: number; approvalRate: number; count: number }
    winner: 'A' | 'B' | 'tie'
    improvement: number
  } | null
  error?: string
}> {
  try {
    const [resultA, resultB] = await Promise.all([
      listValidationRecords({ promptVersionId: versionIdA }),
      listValidationRecords({ promptVersionId: versionIdB }),
    ])

    if (resultA.error || resultB.error) {
      throw new Error(resultA.error || resultB.error)
    }

    const statsA = calculateGroupStats(resultA.validations)
    const statsB = calculateGroupStats(resultB.validations)

    // Determine winner based on lower score difference (better accuracy)
    const winner =
      statsA.avgDiff < statsB.avgDiff
        ? 'A'
        : statsB.avgDiff < statsA.avgDiff
          ? 'B'
          : 'tie'

    const improvement =
      winner === 'A'
        ? statsB.avgDiff > 0
          ? ((statsB.avgDiff - statsA.avgDiff) / statsB.avgDiff) * 100
          : 0
        : winner === 'B'
          ? statsA.avgDiff > 0
            ? ((statsA.avgDiff - statsB.avgDiff) / statsA.avgDiff) * 100
            : 0
          : 0

    return {
      comparison: {
        versionA: { id: versionIdA, ...statsA },
        versionB: { id: versionIdB, ...statsB },
        winner,
        improvement: Math.round(improvement * 10) / 10,
      },
    }
  } catch (error) {
    console.error('[ValidationService] Error comparing prompt versions:', error)
    return {
      comparison: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Compare validation accuracy between two weight configurations
 */
export async function compareWeightVersions(
  versionIdA: string,
  versionIdB: string
): Promise<{
  comparison: {
    versionA: { id: string; avgDiff: number; approvalRate: number; count: number }
    versionB: { id: string; avgDiff: number; approvalRate: number; count: number }
    winner: 'A' | 'B' | 'tie'
    improvement: number
  } | null
  error?: string
}> {
  try {
    const [resultA, resultB] = await Promise.all([
      listValidationRecords({ weightsVersionId: versionIdA }),
      listValidationRecords({ weightsVersionId: versionIdB }),
    ])

    if (resultA.error || resultB.error) {
      throw new Error(resultA.error || resultB.error)
    }

    const statsA = calculateGroupStats(resultA.validations)
    const statsB = calculateGroupStats(resultB.validations)

    const winner =
      statsA.avgDiff < statsB.avgDiff
        ? 'A'
        : statsB.avgDiff < statsA.avgDiff
          ? 'B'
          : 'tie'

    const improvement =
      winner === 'A'
        ? statsB.avgDiff > 0
          ? ((statsB.avgDiff - statsA.avgDiff) / statsB.avgDiff) * 100
          : 0
        : winner === 'B'
          ? statsA.avgDiff > 0
            ? ((statsA.avgDiff - statsB.avgDiff) / statsA.avgDiff) * 100
            : 0
          : 0

    return {
      comparison: {
        versionA: { id: versionIdA, ...statsA },
        versionB: { id: versionIdB, ...statsB },
        winner,
        improvement: Math.round(improvement * 10) / 10,
      },
    }
  } catch (error) {
    console.error('[ValidationService] Error comparing weight versions:', error)
    return {
      comparison: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==========================================
// CALIBRATION SUGGESTIONS
// ==========================================

/**
 * Get suggestions for improving AI scoring accuracy
 * Based on patterns in validation data
 */
export async function getCalibrationSuggestions(): Promise<{
  suggestions: Array<{
    metric: keyof WeightValues
    currentBias: number
    suggestedAdjustment: string
    confidence: 'high' | 'medium' | 'low'
    sampleSize: number
  }>
  error?: string
}> {
  try {
    const { stats, error } = await getValidationStats()

    if (error || !stats) {
      throw new Error(error || 'Failed to get validation stats')
    }

    const suggestions: Array<{
      metric: keyof WeightValues
      currentBias: number
      suggestedAdjustment: string
      confidence: 'high' | 'medium' | 'low'
      sampleSize: number
    }> = []

    // Analyze each metric
    const metrics = Object.keys(stats.metricAccuracy) as (keyof WeightValues)[]

    for (const metric of metrics) {
      const accuracy = stats.metricAccuracy[metric]

      // Skip metrics with insufficient data
      if (accuracy.avgDiff === 0 && accuracy.stdDev === 0) continue

      // Determine confidence based on correlation and standard deviation
      const confidence =
        Math.abs(accuracy.correlation) > 0.7 && accuracy.stdDev < 0.1
          ? 'high'
          : Math.abs(accuracy.correlation) > 0.5 || accuracy.stdDev < 0.2
            ? 'medium'
            : 'low'

      // Generate suggestion based on bias
      let suggestedAdjustment = ''
      if (accuracy.avgDiff > 0.1) {
        suggestedAdjustment = `AI tends to score ${metric.replace('_', ' ')} higher than humans. Consider lowering AI threshold.`
      } else if (accuracy.avgDiff < -0.1) {
        suggestedAdjustment = `AI tends to score ${metric.replace('_', ' ')} lower than humans. Consider raising AI threshold.`
      } else {
        suggestedAdjustment = `${metric.replace('_', ' ')} scoring is well-calibrated.`
      }

      suggestions.push({
        metric,
        currentBias: Math.round(accuracy.avgDiff * 1000) / 1000,
        suggestedAdjustment,
        confidence,
        sampleSize: stats.total,
      })
    }

    // Sort by absolute bias (highest first)
    suggestions.sort((a, b) => Math.abs(b.currentBias) - Math.abs(a.currentBias))

    return { suggestions }
  } catch (error) {
    console.error('[ValidationService] Error getting calibration suggestions:', error)
    return {
      suggestions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate overall score difference between AI and human scores
 */
function calculateOverallScoreDifference(
  aiScores: ValidationScores,
  humanScores: ValidationScores
): number {
  const metrics = [
    'usp_coverage',
    'grounding_score',
    'semantic_similarity',
    'anti_fabrication',
    'keyword_density',
    'structure_quality',
  ] as const

  let totalDiff = 0
  let count = 0

  for (const metric of metrics) {
    const aiValue = aiScores[metric]
    const humanValue = humanScores[metric]

    if (aiValue !== undefined && humanValue !== undefined) {
      totalDiff += Math.abs(aiValue - humanValue)
      count++
    }
  }

  return count > 0 ? Math.round((totalDiff / count) * 1000) / 1000 : 0
}

/**
 * Calculate per-metric differences
 */
function calculateMetricDifferences(
  aiScores: ValidationScores,
  humanScores: ValidationScores
): Partial<Record<keyof WeightValues, number>> {
  const differences: Partial<Record<keyof WeightValues, number>> = {}

  const metrics = [
    'usp_coverage',
    'grounding_score',
    'semantic_similarity',
    'anti_fabrication',
    'keyword_density',
    'structure_quality',
  ] as const

  for (const metric of metrics) {
    const aiValue = aiScores[metric]
    const humanValue = humanScores[metric]

    if (aiValue !== undefined && humanValue !== undefined) {
      differences[metric] = Math.round((aiValue - humanValue) * 1000) / 1000
    }
  }

  return differences
}

/**
 * Determine validation status based on score difference
 */
function determineValidationStatus(scoreDiff: number): ValidationStatus {
  // Threshold: if difference is small enough, auto-approve
  if (scoreDiff < 0.1) {
    return 'approved'
  } else if (scoreDiff > 0.3) {
    return 'rejected'
  }
  return 'pending' // Requires manual review
}

/**
 * Normalize ValidationScores to WeightValues keys
 */
function normalizeScoresToWeightKeys(
  scores: ValidationScores
): Partial<Record<keyof WeightValues, number>> {
  return {
    usp_coverage: scores.usp_coverage,
    grounding_score: scores.grounding_score,
    semantic_similarity: scores.semantic_similarity,
    anti_fabrication: scores.anti_fabrication,
    keyword_density: scores.keyword_density,
    structure_quality: scores.structure_quality,
  }
}

/**
 * Calculate metric-level accuracy statistics
 */
function calculateMetricAccuracy(
  validations: ValidationResult[]
): Record<keyof WeightValues, { avgDiff: number; stdDev: number; correlation: number }> {
  const metrics = [
    'usp_coverage',
    'grounding_score',
    'semantic_similarity',
    'anti_fabrication',
    'keyword_density',
    'structure_quality',
  ] as const

  const result: Record<
    keyof WeightValues,
    { avgDiff: number; stdDev: number; correlation: number }
  > = {} as Record<keyof WeightValues, { avgDiff: number; stdDev: number; correlation: number }>

  for (const metric of metrics) {
    const pairs: Array<{ ai: number; human: number }> = []

    for (const v of validations) {
      if (v.human_scores !== null) {
        const aiScores = v.ai_scores as unknown as ValidationScores
        const humanScores = v.human_scores as unknown as ValidationScores

        if (
          aiScores[metric] !== undefined &&
          humanScores[metric] !== undefined
        ) {
          pairs.push({
            ai: aiScores[metric]!,
            human: humanScores[metric]!,
          })
        }
      }
    }

    if (pairs.length > 0) {
      // Calculate average difference
      const diffs = pairs.map((p) => p.ai - p.human)
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length

      // Calculate standard deviation
      const squaredDiffs = diffs.map((d) => Math.pow(d - avgDiff, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / diffs.length
      const stdDev = Math.sqrt(variance)

      // Calculate correlation
      const aiMean = pairs.reduce((sum, p) => sum + p.ai, 0) / pairs.length
      const humanMean = pairs.reduce((sum, p) => sum + p.human, 0) / pairs.length

      let numerator = 0
      let aiDenominator = 0
      let humanDenominator = 0

      for (const pair of pairs) {
        const aiDiff = pair.ai - aiMean
        const humanDiff = pair.human - humanMean
        numerator += aiDiff * humanDiff
        aiDenominator += aiDiff * aiDiff
        humanDenominator += humanDiff * humanDiff
      }

      const correlation =
        aiDenominator > 0 && humanDenominator > 0
          ? numerator / Math.sqrt(aiDenominator * humanDenominator)
          : 0

      result[metric] = {
        avgDiff: Math.round(avgDiff * 1000) / 1000,
        stdDev: Math.round(stdDev * 1000) / 1000,
        correlation: Math.round(correlation * 1000) / 1000,
      }
    } else {
      result[metric] = { avgDiff: 0, stdDev: 0, correlation: 0 }
    }
  }

  return result
}

/**
 * Calculate stats grouped by version ID
 */
function calculateVersionStats(
  validations: ValidationResult[],
  versionField: 'prompt_version_id' | 'weights_version_id'
): Record<string, { count: number; avgDiff: number; approvalRate: number }> {
  const grouped: Record<string, ValidationResult[]> = {}

  for (const v of validations) {
    const versionId = v[versionField]
    if (versionId) {
      if (!grouped[versionId]) {
        grouped[versionId] = []
      }
      grouped[versionId].push(v)
    }
  }

  const result: Record<
    string,
    { count: number; avgDiff: number; approvalRate: number }
  > = {}

  for (const [versionId, group] of Object.entries(grouped)) {
    const stats = calculateGroupStats(group)
    result[versionId] = stats
  }

  return result
}

/**
 * Calculate stats for a group of validations
 */
function calculateGroupStats(validations: ValidationResult[]): {
  count: number
  avgDiff: number
  approvalRate: number
} {
  const count = validations.length
  if (count === 0) {
    return { count: 0, avgDiff: 0, approvalRate: 0 }
  }

  const withDiffs = validations.filter((v) => v.score_diff !== null)
  const avgDiff =
    withDiffs.length > 0
      ? withDiffs.reduce((sum, v) => sum + (v.score_diff || 0), 0) / withDiffs.length
      : 0

  const approved = validations.filter(
    (v) => v.validation_status === 'approved'
  ).length
  const approvalRate = Math.round((approved / count) * 100)

  return {
    count,
    avgDiff: Math.round(avgDiff * 1000) / 1000,
    approvalRate,
  }
}

/**
 * Create empty stats object
 */
function createEmptyStats(): ValidationStats {
  const emptyMetrics = {
    avgDiff: 0,
    stdDev: 0,
    correlation: 0,
  }

  return {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    averageScoreDiff: 0,
    metricAccuracy: {
      usp_coverage: emptyMetrics,
      grounding_score: emptyMetrics,
      semantic_similarity: emptyMetrics,
      anti_fabrication: emptyMetrics,
      keyword_density: emptyMetrics,
      structure_quality: emptyMetrics,
    },
    byPromptVersion: {},
    byWeightsVersion: {},
  }
}
