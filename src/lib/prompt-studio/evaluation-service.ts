/**
 * LLM-as-Judge Evaluation Service
 *
 * Provides AI-powered evaluation of stage outputs using a multi-dimensional
 * scoring system with detailed feedback generation.
 */

import { GoogleGenAI } from '@google/genai'
import type {
  PromptStage,
  StageTestInputData,
  StageOutput,
  EvaluationScores,
  EvaluationFeedback,
  LLMJudgeEvaluation,
} from '@/types/prompt-studio'
import { getEvaluationConfig } from './stage-evaluation-config'

// ============================================================================
// Dynamic System Prompt Builder for LLM-as-Judge
// ============================================================================

/**
 * Build a stage-specific judge system prompt using the evaluation config.
 * Each stage gets its own 4 custom dimensions and scoring context.
 */
function buildJudgeSystemPrompt(stage: PromptStage): string {
  const config = getEvaluationConfig(stage)
  const [d1, d2, d3, d4] = config.dimensions

  return `You are an expert evaluator for the "${stage}" stage of a Samsung GEO content pipeline.

${config.judgeContext}

Evaluate the output on these 4 dimensions (1.0-5.0 scale, 0.5 increments):

1. ${d1.label}: ${d1.description}
   - 5: Exceptional
   - 4: Good with minor improvements possible
   - 3: Acceptable with some issues
   - 2: Below average with notable problems
   - 1: Poor, major issues

2. ${d2.label}: ${d2.description}
   - 5: Exceptional
   - 4: Good with minor improvements possible
   - 3: Acceptable with some issues
   - 2: Below average with notable problems
   - 1: Poor, major issues

3. ${d3.label}: ${d3.description}
   - 5: Exceptional
   - 4: Good with minor improvements possible
   - 3: Acceptable with some issues
   - 2: Below average with notable problems
   - 1: Poor, major issues

4. ${d4.label}: ${d4.description}
   - 5: Exceptional
   - 4: Good with minor improvements possible
   - 3: Acceptable with some issues
   - 2: Below average with notable problems
   - 1: Poor, major issues

IMPORTANT: Respond in valid JSON format only. No markdown, no explanations outside JSON.

Response format:
{
  "scores": { "overall": <score>, "relevance": <score>, "quality": <score>, "creativity": <score> },
  "feedback": {
    "strengths": ["strength 1", "strength 2", ...],
    "weaknesses": ["weakness 1", "weakness 2", ...],
    "suggestions": ["suggestion 1", "suggestion 2", ...],
    "summary": "<2-3 sentence overall assessment>"
  }
}`
}

// ============================================================================
// Evaluation Functions
// ============================================================================

/**
 * Build the evaluation prompt for the LLM judge
 */
function buildEvaluationPrompt(
  stage: PromptStage,
  input: StageTestInputData,
  output: StageOutput,
  prompt: string
): string {
  const config = getEvaluationConfig(stage)
  const [d1, d2, d3, d4] = config.dimensions

  return `## Stage: ${stage.toUpperCase()}

## Input Provided:
\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

## Prompt Used:
\`\`\`
${prompt.slice(0, 2000)}${prompt.length > 2000 ? '...[truncated]' : ''}
\`\`\`

## Output Generated:
\`\`\`json
${JSON.stringify(output, null, 2)}
\`\`\`

Evaluate this output on the 4 dimensions: ${d1.label}, ${d2.label}, ${d3.label}, ${d4.label}.

Respond with your evaluation in the specified JSON format.`
}

/**
 * Parse the LLM response into structured evaluation
 */
function parseEvaluationResponse(response: string): { scores: EvaluationScores; feedback: EvaluationFeedback } {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Handle potential markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // Handle responses that start with { but have trailing text
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

  // Validate and normalize scores (ensure 1-5 range)
  const normalizeScore = (score: number): number => {
    const n = Number(score)
    return Math.max(1, Math.min(5, isNaN(n) ? 3 : Math.round(n * 10) / 10))
  }

  const scores: EvaluationScores = {
    overall: normalizeScore(parsed.scores?.overall ?? 3),
    relevance: normalizeScore(parsed.scores?.relevance ?? 3),
    quality: normalizeScore(parsed.scores?.quality ?? 3),
    creativity: normalizeScore(parsed.scores?.creativity ?? 3),
  }

  const feedback: EvaluationFeedback = {
    strengths: Array.isArray(parsed.feedback?.strengths) ? parsed.feedback.strengths : [],
    weaknesses: Array.isArray(parsed.feedback?.weaknesses) ? parsed.feedback.weaknesses : [],
    suggestions: Array.isArray(parsed.feedback?.suggestions) ? parsed.feedback.suggestions : [],
    summary: typeof parsed.feedback?.summary === 'string' ? parsed.feedback.summary : 'Evaluation completed.',
  }

  return { scores, feedback }
}

/**
 * Evaluate a stage output using LLM-as-Judge
 */
export async function evaluateOutput(
  stage: PromptStage,
  input: StageTestInputData,
  output: StageOutput,
  prompt: string
): Promise<LLMJudgeEvaluation> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured')
  }

  const genAI = new GoogleGenAI({ apiKey })

  const evaluationPrompt = buildEvaluationPrompt(stage, input, output, prompt)

  const result = await genAI.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
    config: {
      systemInstruction: buildJudgeSystemPrompt(stage),
      temperature: 0.3, // Lower temperature for more consistent scoring
      maxOutputTokens: 2048,
      topP: 0.9,
    },
  })

  const responseText = result.text || ''

  try {
    const { scores, feedback } = parseEvaluationResponse(responseText)

    return {
      scores,
      feedback,
      judgeModel: 'gemini-3-flash-preview',
      rawResponse: responseText,
    }
  } catch (parseError) {
    console.error('Failed to parse evaluation response:', parseError)
    console.error('Raw response:', responseText)

    // Return default scores with error feedback
    return {
      scores: {
        overall: 3,
        relevance: 3,
        quality: 3,
        creativity: 3,
      },
      feedback: {
        strengths: [],
        weaknesses: ['Unable to parse evaluation response'],
        suggestions: ['Review the output manually'],
        summary: 'Automated evaluation encountered an error. Manual review recommended.',
      },
      judgeModel: 'gemini-3-flash-preview',
      rawResponse: responseText,
    }
  }
}

/**
 * Calculate an aggregate score from individual dimensions
 */
export function calculateAggregateScore(scores: EvaluationScores): number {
  // Weighted average: overall has higher weight as it considers all factors
  const weights = {
    overall: 0.4,
    relevance: 0.25,
    quality: 0.2,
    creativity: 0.15,
  }

  return (
    scores.overall * weights.overall +
    scores.relevance * weights.relevance +
    scores.quality * weights.quality +
    scores.creativity * weights.creativity
  )
}

/**
 * Convert numeric score to letter grade
 */
export function scoreToGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 4.5) return 'A+'
  if (score >= 4.0) return 'A'
  if (score >= 3.0) return 'B'
  if (score >= 2.0) return 'C'
  if (score >= 1.0) return 'D'
  return 'F'
}

/**
 * Get display color class for score
 */
export function getScoreColorClass(score: number): string {
  if (score >= 4.0) return 'text-green-600 bg-green-100'
  if (score >= 3.0) return 'text-blue-600 bg-blue-100'
  if (score >= 2.0) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

/**
 * Format score for display (1 decimal place)
 */
export function formatScore(score: number): string {
  return score.toFixed(1)
}
