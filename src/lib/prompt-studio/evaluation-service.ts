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

// ============================================================================
// System Prompts for LLM-as-Judge
// ============================================================================

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for GEO/AEO (Generative Engine Optimization / AI Engine Optimization) content.

Your task is to evaluate the quality of AI-generated content based on four dimensions:

1. **Relevance** (1-5): How well does the output match the input requirements?
   - 5: Perfectly addresses all input requirements
   - 4: Addresses most requirements with minor omissions
   - 3: Addresses core requirements but misses some aspects
   - 2: Partially relevant with significant gaps
   - 1: Mostly irrelevant to the input

2. **Quality** (1-5): How well-written and structured is the output?
   - 5: Exceptional writing, perfect structure, professional tone
   - 4: Good writing with minor improvements possible
   - 3: Acceptable quality with some issues
   - 2: Below average with notable problems
   - 1: Poor quality, major issues

3. **Creativity** (1-5): How original and engaging is the output?
   - 5: Highly creative, unique perspective, very engaging
   - 4: Good creativity with fresh elements
   - 3: Standard approach, somewhat engaging
   - 2: Generic, lacks originality
   - 1: Bland, copy-paste feel

4. **Overall** (1-5): Holistic assessment considering all factors and GEO/AEO effectiveness
   - Consider: keyword integration, AI parseability, user intent alignment
   - 5: Excellent for GEO/AEO, ready for production
   - 4: Good, minor refinements needed
   - 3: Acceptable, some improvements recommended
   - 2: Below expectations, significant work needed
   - 1: Unacceptable, major revision required

IMPORTANT: Respond in valid JSON format only. No markdown, no explanations outside JSON.

Response format:
{
  "scores": {
    "overall": <1-5>,
    "relevance": <1-5>,
    "quality": <1-5>,
    "creativity": <1-5>
  },
  "feedback": {
    "strengths": ["strength 1", "strength 2", ...],
    "weaknesses": ["weakness 1", "weakness 2", ...],
    "suggestions": ["suggestion 1", "suggestion 2", ...],
    "summary": "<2-3 sentence overall assessment>"
  }
}`

const STAGE_CONTEXT: Record<PromptStage, string> = {
  grounding: 'evaluating web search results for user intent signals and product context',
  description: 'evaluating YouTube description content optimized for GEO/AEO',
  usp: 'evaluating unique selling points extraction and competitive positioning',
  faq: 'evaluating Q&A pairs for AEO optimization and search visibility',
  chapters: 'evaluating timestamp chapters for video navigation and SEO',
  case_studies: 'evaluating real-world use case scenarios for relatability',
  keywords: 'evaluating keyword extraction and scoring for SEO/GEO',
  hashtags: 'evaluating strategic hashtags following Samsung standards',
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
  const context = STAGE_CONTEXT[stage]

  return `You are ${context}.

## Stage: ${stage.toUpperCase()}

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

Evaluate this output using the 4-dimension scoring system. Consider:
- Does the output fulfill all requirements from the input?
- Is the content well-structured and professionally written?
- Does it demonstrate creativity while maintaining brand consistency?
- Is it optimized for GEO/AEO (AI parseability, keyword integration)?

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
      systemInstruction: JUDGE_SYSTEM_PROMPT,
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
