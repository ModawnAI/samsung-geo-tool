/**
 * Stage Executor
 * Executes individual stage prompts for testing
 */

import { GoogleGenAI } from '@google/genai'
import {
  type PromptStage,
  type StageTestInputData,
  type StageTestResponse,
  type StageOutput,
  type TestMetrics,
  type QualityScore,
  STAGE_CONFIG,
} from '@/types/prompt-studio'
import { composeStagePrompt } from '@/lib/tuning/prompt-loader'

interface StageExecutorParams {
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

interface ExecutorResult {
  output: StageOutput
  metrics: TestMetrics
  rawResponse: string
}

/**
 * Execute a single stage test
 */
export async function executeStageTest(
  params: StageExecutorParams
): Promise<StageTestResponse> {
  const startTime = Date.now()

  try {
    // Build the full prompt
    const fullPrompt = buildStagePrompt(params)

    // Execute with Gemini
    const result = await executeGemini(fullPrompt, params)

    // Parse the output
    const output = parseStageOutput(params.stage, result.rawResponse)

    // Calculate quality score
    const qualityScore = calculateQualityScore(params.stage, output, result.rawResponse)

    const latencyMs = Date.now() - startTime

    return {
      id: crypto.randomUUID(),
      output,
      metrics: {
        ...result.metrics,
        latencyMs,
      },
      qualityScore,
      rawResponse: result.rawResponse,
      status: 'completed',
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    console.error('[StageExecutor] Error:', error)

    return {
      id: crypto.randomUUID(),
      output: {},
      metrics: {
        latencyMs,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      qualityScore: {
        total: 0,
        grade: 'F',
        breakdown: {
          keywordDensity: 0,
          questionPatterns: 0,
          sentenceStructure: 0,
          lengthCompliance: 0,
          aiExposure: 0,
        },
        suggestions: ['Test execution failed'],
      },
      rawResponse: '',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build the full prompt for a stage
 */
function buildStagePrompt(params: StageExecutorParams): string {
  const { stage, systemPrompt, testInput, language } = params

  // Use the existing composeStagePrompt if no custom system prompt
  let basePrompt = systemPrompt
  if (!basePrompt || basePrompt.trim() === '') {
    // Generate default stage prompt
    const config = {
      stage,
      basePrompt: getDefaultBasePrompt(),
      language,
    }
    basePrompt = composeStagePrompt(config)
  }

  // Interpolate variables
  let finalPrompt = basePrompt
  if (testInput.productName) {
    finalPrompt = finalPrompt.replace(/\{\{product_name\}\}/g, testInput.productName)
  }
  if (testInput.category) {
    finalPrompt = finalPrompt.replace(/\{\{category\}\}/g, testInput.category)
  }
  if (testInput.keywords && testInput.keywords.length > 0) {
    finalPrompt = finalPrompt.replace(/\{\{keywords\}\}/g, testInput.keywords.join(', '))
  }

  // Add user content section
  const userContent = buildUserContent(testInput)
  if (userContent) {
    finalPrompt += `\n\n## INPUT DATA\n${userContent}`
  }

  return finalPrompt
}

/**
 * Build user content from test input
 */
function buildUserContent(input: StageTestInputData): string {
  const parts: string[] = []

  if (input.productName) {
    parts.push(`Product Name: ${input.productName}`)
  }
  if (input.category) {
    parts.push(`Category: ${input.category}`)
  }
  if (input.keywords && input.keywords.length > 0) {
    parts.push(`Keywords: ${input.keywords.join(', ')}`)
  }
  if (input.videoDescription) {
    parts.push(`Video Description:\n${input.videoDescription}`)
  }
  if (input.srtContent) {
    parts.push(`Transcript:\n${input.srtContent.slice(0, 5000)}`) // Limit transcript length
  }
  if (input.usps && input.usps.length > 0) {
    parts.push(`USPs:\n${input.usps.join('\n')}`)
  }
  if (input.previousStageResult) {
    parts.push(`Previous Stage Result:\n${JSON.stringify(input.previousStageResult, null, 2)}`)
  }

  return parts.join('\n\n')
}

/**
 * Execute with Gemini API
 */
async function executeGemini(
  prompt: string,
  params: StageExecutorParams
): Promise<ExecutorResult> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenAI({ apiKey })
  const modelName = params.parameters.model || 'gemini-3-flash-preview'

  const result = await genAI.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: params.parameters.temperature,
      maxOutputTokens: params.parameters.maxTokens,
      topP: params.parameters.topP,
    },
  })

  const text = result.text || ''

  // Extract token counts from usage metadata if available
  const usageMetadata = result.usageMetadata
  const inputTokens = usageMetadata?.promptTokenCount || estimateTokens(prompt)
  const outputTokens = usageMetadata?.candidatesTokenCount || estimateTokens(text)

  return {
    output: {},
    metrics: {
      latencyMs: 0, // Will be set by caller
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    rawResponse: text,
  }
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

/**
 * Parse stage output from raw response
 */
function parseStageOutput(stage: PromptStage, rawResponse: string): StageOutput {
  try {
    // Try to extract JSON from the response
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as StageOutput
    }

    // Try to parse the entire response as JSON
    const cleanResponse = rawResponse.trim()
    if (cleanResponse.startsWith('{') || cleanResponse.startsWith('[')) {
      return JSON.parse(cleanResponse) as StageOutput
    }

    // Stage-specific parsing fallback
    switch (stage) {
      case 'description':
        return parseDescriptionOutput(rawResponse)
      case 'hashtags':
        return parseHashtagsOutput(rawResponse)
      default:
        return {
          content: rawResponse,
          parsed: null,
        }
    }
  } catch (error) {
    console.error('[StageExecutor] Parse error:', error)
    return {
      content: rawResponse,
      parsed: null,
    }
  }
}

/**
 * Parse description stage output
 */
function parseDescriptionOutput(raw: string): StageOutput {
  // Try to extract first_130 and full_description
  const lines = raw.split('\n')
  let first130 = ''
  let fullDescription = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.toLowerCase().includes('first') && trimmed.includes(':')) {
      first130 = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '')
    } else if (!first130 && trimmed.length >= 100 && trimmed.length <= 150) {
      first130 = trimmed
    }
  }

  // The full description is likely the longest coherent text block
  fullDescription = raw.replace(/```[\s\S]*?```/g, '').trim()
  if (fullDescription.length > 1000) {
    fullDescription = fullDescription.slice(0, 1000)
  }

  return {
    first_130: first130 || raw.slice(0, 130),
    full_description: fullDescription || raw,
  }
}

/**
 * Parse hashtags stage output
 */
function parseHashtagsOutput(raw: string): StageOutput {
  // Extract hashtags from the response
  const hashtagMatches = raw.match(/#\w+/g)
  if (hashtagMatches) {
    return {
      hashtags: [...new Set(hashtagMatches)].slice(0, 8),
    }
  }
  return {
    hashtags: [],
  }
}

/**
 * Calculate quality score for stage output
 */
function calculateQualityScore(
  stage: PromptStage,
  output: StageOutput,
  rawResponse: string
): QualityScore {
  const breakdown = {
    keywordDensity: 0,
    questionPatterns: 0,
    sentenceStructure: 0,
    lengthCompliance: 0,
    aiExposure: 0,
  }
  const suggestions: string[] = []

  // Calculate scores based on stage
  switch (stage) {
    case 'description':
      breakdown.keywordDensity = scoreKeywordDensity(output, rawResponse)
      breakdown.lengthCompliance = scoreLengthCompliance(output)
      breakdown.sentenceStructure = scoreSentenceStructure(rawResponse)
      breakdown.aiExposure = scoreAIExposure(rawResponse)
      breakdown.questionPatterns = 5 // Not applicable for description
      break

    case 'faq':
      breakdown.questionPatterns = scoreFAQPatterns(output)
      breakdown.lengthCompliance = output.faqs ? Math.min(20, output.faqs.length * 5) : 0
      breakdown.sentenceStructure = scoreSentenceStructure(rawResponse)
      breakdown.keywordDensity = 10
      breakdown.aiExposure = 15
      break

    case 'hashtags':
      const hashtagScore = scoreHashtags(output)
      breakdown.keywordDensity = hashtagScore
      breakdown.lengthCompliance = output.hashtags && output.hashtags.length >= 3 ? 15 : 5
      breakdown.sentenceStructure = 10
      breakdown.aiExposure = 20
      breakdown.questionPatterns = 5
      break

    default:
      // Generic scoring
      breakdown.keywordDensity = rawResponse.length > 200 ? 15 : 8
      breakdown.lengthCompliance = rawResponse.length > 100 ? 12 : 6
      breakdown.sentenceStructure = 10
      breakdown.aiExposure = 20
      breakdown.questionPatterns = 5
  }

  // Generate suggestions
  if (breakdown.keywordDensity < 15) {
    suggestions.push('Increase keyword integration in the content')
  }
  if (breakdown.lengthCompliance < 12) {
    suggestions.push('Ensure content meets length requirements')
  }
  if (breakdown.sentenceStructure < 10) {
    suggestions.push('Improve sentence structure for better AI parsing')
  }

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0)

  return {
    total,
    grade: getGrade(total),
    breakdown,
    suggestions,
  }
}

/**
 * Score keyword density
 */
function scoreKeywordDensity(output: StageOutput, raw: string): number {
  let score = 0

  // Check if product name is early in content
  if (output.first_130 && output.first_130.length >= 100) {
    score += 5
  }

  // Check for feature keywords
  const featureKeywords = ['camera', 'ai', 'display', 'battery', 'performance', 'foldable']
  const matches = featureKeywords.filter((kw) => raw.toLowerCase().includes(kw)).length
  score += Math.min(10, matches * 2)

  // Natural flow (no excessive repetition)
  const words = raw.toLowerCase().split(/\s+/)
  const wordFreq: Record<string, number> = {}
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1
  }
  const maxFreq = Math.max(...Object.values(wordFreq))
  if (maxFreq < words.length * 0.1) {
    score += 5
  }

  return Math.min(20, score)
}

/**
 * Score length compliance
 */
function scoreLengthCompliance(output: StageOutput): number {
  let score = 0

  // Check first_130 length
  if (output.first_130) {
    const len = output.first_130.length
    if (len >= 110 && len <= 130) {
      score += 7
    } else if (len >= 100 && len <= 150) {
      score += 5
    } else {
      score += 2
    }
  }

  // Check full description length
  if (output.full_description) {
    const len = output.full_description.length
    if (len >= 300 && len <= 1000) {
      score += 8
    } else if (len >= 200 && len <= 1500) {
      score += 5
    } else {
      score += 2
    }
  }

  return Math.min(15, score)
}

/**
 * Score sentence structure
 */
function scoreSentenceStructure(raw: string): number {
  let score = 0

  // Check for lists/bullet points
  if (raw.includes('•') || raw.includes('-') || /\d+\.\s/.test(raw)) {
    score += 5
  }

  // Check for short paragraphs
  const paragraphs = raw.split(/\n\n+/)
  const avgParaLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
  if (avgParaLength < 300) {
    score += 5
  }

  // Check for semantic clarity (no vague terms)
  const vagueTerms = ['innovative', 'revolutionary', 'cutting-edge', 'amazing', 'incredible']
  const vagueCount = vagueTerms.filter((term) => raw.toLowerCase().includes(term)).length
  if (vagueCount === 0) {
    score += 5
  } else if (vagueCount <= 1) {
    score += 3
  }

  return Math.min(15, score)
}

/**
 * Score AI exposure
 */
function scoreAIExposure(raw: string): number {
  let score = 0

  // Check for specific technical specs
  const specPatterns = [/\d+\s*MP/i, /\d+\s*mAh/i, /\d+\.?\d*\s*inch/i, /\d+\s*Hz/i]
  const specCount = specPatterns.filter((p) => p.test(raw)).length
  score += Math.min(15, specCount * 4)

  // Check for brand/tech terms
  const techTerms = ['Samsung', 'Galaxy', 'AI', 'OLED', 'AMOLED', 'Snapdragon', 'Knox']
  const techCount = techTerms.filter((term) => raw.includes(term)).length
  score += Math.min(10, techCount * 2)

  return Math.min(30, score)
}

/**
 * Score FAQ patterns
 */
function scoreFAQPatterns(output: StageOutput): number {
  if (!output.faqs || output.faqs.length === 0) {
    return 0
  }

  let score = 0

  for (const faq of output.faqs) {
    // Check question starts with How/What/Why/When/Where
    if (/^(How|What|Why|When|Where)/i.test(faq.question)) {
      score += 3
    }

    // Check question length (10-20 words)
    const wordCount = faq.question.split(/\s+/).length
    if (wordCount >= 10 && wordCount <= 20) {
      score += 2
    }

    // Check answer length (50-150 words)
    const answerWordCount = faq.answer.split(/\s+/).length
    if (answerWordCount >= 50 && answerWordCount <= 150) {
      score += 2
    }
  }

  return Math.min(20, score)
}

/**
 * Score hashtags
 */
function scoreHashtags(output: StageOutput): number {
  if (!output.hashtags || output.hashtags.length === 0) {
    return 0
  }

  let score = 0

  // Check count (3-5 optimal)
  if (output.hashtags.length >= 3 && output.hashtags.length <= 5) {
    score += 10
  } else if (output.hashtags.length >= 2) {
    score += 5
  }

  // Check for Samsung standard order
  if (output.hashtags[0]?.includes('GalaxyAI')) {
    score += 5
  }
  if (output.hashtags[output.hashtags.length - 1]?.includes('Samsung')) {
    score += 5
  }

  return Math.min(20, score)
}

/**
 * Get grade from score
 */
function getGrade(score: number): QualityScore['grade'] {
  if (score >= 90) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 65) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

/**
 * Get default base prompt
 */
function getDefaultBasePrompt(): string {
  return `You are a Samsung GEO/AEO Content Optimization Specialist.

Your goal is to create content optimized for both AI-powered search engines (ChatGPT, Claude, Gemini, Perplexity) and traditional search (Google, YouTube).

## Core Principles:
1. Structure content for AI extraction and citation
2. Include specific technical specifications with units
3. Use natural keyword integration
4. Create modular, extractable sections
5. Avoid vague marketing language

Output in JSON format when structured data is requested.`
}
