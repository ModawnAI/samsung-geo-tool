/**
 * Feedback Analyzer
 *
 * Analyzes accumulated feedback to identify patterns, calculate statistics,
 * and provide improvement recommendations.
 */

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import type {
  PromptStage,
  EvaluationScores,
  FeedbackStats,
  WeaknessPattern,
  FeedbackAnalysis,
  PromptStudioFeedback,
} from '@/types/prompt-studio'

// ============================================================================
// Statistical Analysis
// ============================================================================

/**
 * Calculate average scores from feedback records
 */
function calculateAverageScores(feedbackRecords: PromptStudioFeedback[]): EvaluationScores {
  if (feedbackRecords.length === 0) {
    return { overall: 0, relevance: 0, quality: 0, creativity: 0 }
  }

  const sums = feedbackRecords.reduce(
    (acc, fb) => ({
      overall: acc.overall + (fb.overall_score || 0),
      relevance: acc.relevance + (fb.relevance_score || 0),
      quality: acc.quality + (fb.quality_score || 0),
      creativity: acc.creativity + (fb.creativity_score || 0),
    }),
    { overall: 0, relevance: 0, quality: 0, creativity: 0 }
  )

  const count = feedbackRecords.length

  return {
    overall: Math.round((sums.overall / count) * 10) / 10,
    relevance: Math.round((sums.relevance / count) * 10) / 10,
    quality: Math.round((sums.quality / count) * 10) / 10,
    creativity: Math.round((sums.creativity / count) * 10) / 10,
  }
}

/**
 * Calculate score distribution (how many scores in each range)
 */
function calculateScoreDistribution(
  feedbackRecords: PromptStudioFeedback[]
): FeedbackStats['scoreDistribution'] {
  const distribution: FeedbackStats['scoreDistribution'] = {
    overall: { '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0 },
    relevance: { '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0 },
    quality: { '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0 },
    creativity: { '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0 },
  }

  const getRange = (score: number | null): string => {
    if (score === null || score === undefined) return '3-4'
    if (score < 2) return '1-2'
    if (score < 3) return '2-3'
    if (score < 4) return '3-4'
    return '4-5'
  }

  feedbackRecords.forEach((fb) => {
    distribution.overall[getRange(fb.overall_score)]++
    distribution.relevance[getRange(fb.relevance_score)]++
    distribution.quality[getRange(fb.quality_score)]++
    distribution.creativity[getRange(fb.creativity_score)]++
  })

  return distribution
}

/**
 * Determine trend based on recent feedback compared to older feedback
 */
function calculateTrend(feedbackRecords: PromptStudioFeedback[]): FeedbackStats['recentTrend'] {
  if (feedbackRecords.length < 4) {
    return 'stable'
  }

  // Sort by date descending (most recent first)
  const sorted = [...feedbackRecords].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Compare recent half vs older half
  const midpoint = Math.floor(sorted.length / 2)
  const recentHalf = sorted.slice(0, midpoint)
  const olderHalf = sorted.slice(midpoint)

  const recentAvg = calculateAverageScores(recentHalf).overall
  const olderAvg = calculateAverageScores(olderHalf).overall

  const diff = recentAvg - olderAvg

  if (diff > 0.3) return 'improving'
  if (diff < -0.3) return 'declining'
  return 'stable'
}

/**
 * Find the weakest scoring dimension
 */
function findWeakestDimension(averages: EvaluationScores): keyof EvaluationScores {
  const dimensions: Array<keyof EvaluationScores> = ['relevance', 'quality', 'creativity']
  let weakest: keyof EvaluationScores = 'relevance'
  let lowestScore = averages.relevance

  dimensions.forEach((dim) => {
    if (averages[dim] < lowestScore) {
      lowestScore = averages[dim]
      weakest = dim
    }
  })

  return weakest
}

/**
 * Calculate time series data for charting
 */
function calculateTimeSeriesData(
  feedbackRecords: PromptStudioFeedback[]
): FeedbackAnalysis['timeSeriesData'] {
  if (feedbackRecords.length === 0) {
    return []
  }

  // Group by date
  const byDate = new Map<string, number[]>()

  feedbackRecords.forEach((fb) => {
    const date = new Date(fb.created_at).toISOString().split('T')[0]
    if (!byDate.has(date)) {
      byDate.set(date, [])
    }
    if (fb.overall_score !== null) {
      byDate.get(date)!.push(fb.overall_score)
    }
  })

  // Calculate daily averages
  const result: FeedbackAnalysis['timeSeriesData'] = []

  byDate.forEach((scores, date) => {
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      result.push({ date, avgScore: Math.round(avg * 10) / 10 })
    }
  })

  // Sort by date
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================================================
// LLM-Powered Pattern Detection
// ============================================================================

const PATTERN_DETECTION_PROMPT = `You are analyzing feedback patterns for a GEO/AEO content generation system.

Given the following feedback data, identify common patterns of weaknesses and provide actionable recommendations.

Feedback weaknesses (aggregated):
{weaknesses}

Feedback suggestions (aggregated):
{suggestions}

Scores summary:
- Overall average: {overall_avg}
- Relevance average: {relevance_avg}
- Quality average: {quality_avg}
- Creativity average: {creativity_avg}

Identify 3-5 common weakness patterns and provide:
1. A clear pattern description
2. Which dimensions it affects
3. A specific suggested fix

Respond in valid JSON format:
{
  "patterns": [
    {
      "pattern": "description of the pattern",
      "affectedDimensions": ["relevance", "quality"],
      "suggestedFix": "specific actionable fix"
    }
  ],
  "improvementPriorities": [
    {
      "dimension": "creativity",
      "currentScore": 2.8,
      "targetScore": 4.0,
      "suggestions": ["suggestion 1", "suggestion 2"]
    }
  ]
}
`

/**
 * Use LLM to detect patterns in feedback
 */
async function detectPatternsWithLLM(
  feedbackRecords: PromptStudioFeedback[],
  averageScores: EvaluationScores
): Promise<{ patterns: WeaknessPattern[]; improvementPriorities: FeedbackAnalysis['improvementPriorities'] }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey || feedbackRecords.length < 3) {
    // Return empty patterns if no API key or insufficient data
    return { patterns: [], improvementPriorities: [] }
  }

  // Aggregate weaknesses and suggestions
  const weaknesses: string[] = []
  const suggestions: string[] = []

  feedbackRecords.forEach((fb) => {
    if (fb.weaknesses) {
      weaknesses.push(...fb.weaknesses)
    }
    if (fb.suggestions) {
      suggestions.push(...fb.suggestions)
    }
  })

  // Deduplicate and limit
  const uniqueWeaknesses = [...new Set(weaknesses)].slice(0, 20)
  const uniqueSuggestions = [...new Set(suggestions)].slice(0, 20)

  const prompt = PATTERN_DETECTION_PROMPT
    .replace('{weaknesses}', uniqueWeaknesses.join('\n- '))
    .replace('{suggestions}', uniqueSuggestions.join('\n- '))
    .replace('{overall_avg}', averageScores.overall.toFixed(1))
    .replace('{relevance_avg}', averageScores.relevance.toFixed(1))
    .replace('{quality_avg}', averageScores.quality.toFixed(1))
    .replace('{creativity_avg}', averageScores.creativity.toFixed(1))

  try {
    const genAI = new GoogleGenAI({ apiKey })

    const result = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    })

    const responseText = result.text || ''

    // Parse JSON from response
    let jsonStr = responseText.trim()
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const startIdx = jsonStr.indexOf('{')
    if (startIdx !== -1) {
      let depth = 0
      let endIdx = startIdx
      for (let i = startIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') depth++
        if (jsonStr[i] === '}') depth--
        if (depth === 0) {
          endIdx = i + 1
          break
        }
      }
      jsonStr = jsonStr.slice(startIdx, endIdx)
    }

    const parsed = JSON.parse(jsonStr)

    const patterns: WeaknessPattern[] = (parsed.patterns || []).map((p: {
      pattern: string
      affectedDimensions: (keyof EvaluationScores)[]
      suggestedFix: string
    }) => ({
      pattern: p.pattern,
      frequency: 1, // Could be enhanced with actual frequency counting
      affectedDimensions: p.affectedDimensions || [],
      suggestedFix: p.suggestedFix,
    }))

    const improvementPriorities = parsed.improvementPriorities || []

    return { patterns, improvementPriorities }
  } catch (error) {
    console.error('Error detecting patterns with LLM:', error)
    return { patterns: [], improvementPriorities: [] }
  }
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze feedback for a specific stage
 */
export async function analyzeFeedback(
  stage: PromptStage,
  options?: {
    fromDate?: Date
    limit?: number
    includePatternDetection?: boolean
  }
): Promise<FeedbackAnalysis> {
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('prompt_studio_feedback')
    .select('*')
    .eq('stage', stage)
    .eq('feedback_type', 'llm_judge')
    .order('created_at', { ascending: false })

  if (options?.fromDate) {
    query = query.gte('created_at', options.fromDate.toISOString())
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  } else {
    query = query.limit(100) // Default limit
  }

  const { data: feedbackRecords, error } = await query

  if (error) {
    console.error('Error fetching feedback:', error)
    throw new Error('Failed to fetch feedback data')
  }

  const records = feedbackRecords || []

  // Calculate statistics
  const averageScores = calculateAverageScores(records)
  const scoreDistribution = calculateScoreDistribution(records)
  const recentTrend = calculateTrend(records)
  const weakestDimension = findWeakestDimension(averageScores)
  const timeSeriesData = calculateTimeSeriesData(records)

  const stats: FeedbackStats = {
    totalFeedback: records.length,
    averageScores,
    scoreDistribution,
    recentTrend,
    weakestDimension,
  }

  // Detect patterns with LLM if requested
  let weaknessPatterns: WeaknessPattern[] = []
  let improvementPriorities: FeedbackAnalysis['improvementPriorities'] = []

  if (options?.includePatternDetection !== false && records.length >= 3) {
    const patternResult = await detectPatternsWithLLM(records, averageScores)
    weaknessPatterns = patternResult.patterns
    improvementPriorities = patternResult.improvementPriorities
  }

  // If no LLM-detected priorities, create basic ones
  if (improvementPriorities.length === 0 && stats.totalFeedback > 0) {
    const dimensions: Array<keyof EvaluationScores> = ['relevance', 'quality', 'creativity']

    improvementPriorities = dimensions
      .filter((dim) => averageScores[dim] < 4.0)
      .sort((a, b) => averageScores[a] - averageScores[b])
      .slice(0, 3)
      .map((dim) => ({
        dimension: dim,
        currentScore: averageScores[dim],
        targetScore: 4.0,
        suggestions: [],
      }))
  }

  return {
    stats,
    weaknessPatterns,
    improvementPriorities,
    timeSeriesData,
  }
}

/**
 * Get feedback summary for display in UI
 */
export async function getFeedbackSummary(stage: PromptStage): Promise<{
  avgScore: number
  testCount: number
  trend: FeedbackStats['recentTrend']
  weakestArea: string
} | null> {
  try {
    const analysis = await analyzeFeedback(stage, {
      limit: 20,
      includePatternDetection: false,
    })

    if (analysis.stats.totalFeedback === 0) {
      return null
    }

    const dimensionLabels: Record<keyof EvaluationScores, string> = {
      overall: 'Overall',
      relevance: 'Relevance',
      quality: 'Quality',
      creativity: 'Creativity',
    }

    return {
      avgScore: analysis.stats.averageScores.overall,
      testCount: analysis.stats.totalFeedback,
      trend: analysis.stats.recentTrend,
      weakestArea: dimensionLabels[analysis.stats.weakestDimension],
    }
  } catch (error) {
    console.error('Error getting feedback summary:', error)
    return null
  }
}
