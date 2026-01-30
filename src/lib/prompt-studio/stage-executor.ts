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
  type GroundingKeyword,
  type GroundingSource,
  STAGE_CONFIG,
} from '@/types/prompt-studio'
import { composeStagePrompt } from '@/lib/tuning/prompt-loader'
import { getSourceTier } from '@/lib/geo-v2/grounding-scorer'

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
    // Special handling for grounding stage (uses Perplexity API instead of Gemini)
    if (params.stage === 'grounding') {
      return await executeGroundingStage(params, startTime)
    }

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
 * Execute grounding stage using Perplexity Sonar API
 */
async function executeGroundingStage(
  params: StageExecutorParams,
  startTime: number
): Promise<StageTestResponse> {
  const { testInput } = params
  const productName = testInput.productName || ''
  const launchDate = testInput.launchDate

  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    console.warn('[Grounding] Perplexity API key not set, using mock data')
    return createGroundingResponse(
      getMockGroundingData(productName),
      [],
      Date.now() - startTime,
      'Mock data (no API key)'
    )
  }

  try {
    // Search queries for different user intent signals
    const queries = [
      `What are users saying about ${productName}? What are the most discussed features and topics in reviews and forums?`,
      `What are the main highlights and concerns about ${productName} from tech reviews and user feedback?`,
      `What are the key comparisons between ${productName} and its competitors? What features stand out?`,
    ]

    const allSources: GroundingSource[] = []
    const seenUrls = new Set<string>()
    const keywordCounts = new Map<string, { count: number; sources: GroundingSource[] }>()

    // Execute searches in parallel using Perplexity chat/completions with Sonar
    const searchPromises = queries.map(async (query) => {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: `You are a product research analyst. Extract key topics, features, and user interests about the product. Focus on identifying what users care about most. Be concise and factual.${launchDate ? ` Only consider content from after ${launchDate}.` : ''}`,
              },
              {
                role: 'user',
                content: query,
              },
            ],
            max_tokens: 1024,
            temperature: 0.2,
            return_citations: true,
            search_recency_filter: launchDate ? 'month' : 'year',
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Grounding] Perplexity API error (${response.status}):`, errorText)
          return null
        }

        interface PerplexityResponse {
          choices: Array<{ message: { content: string } }>
          citations?: Array<string | { url: string; title?: string }>
        }

        const data: PerplexityResponse = await response.json()

        // Extract citations/sources
        if (data.citations && Array.isArray(data.citations)) {
          for (const citation of data.citations) {
            let url: string
            let title: string

            if (typeof citation === 'string') {
              url = citation
              title = extractTitleFromUrl(citation)
            } else {
              url = citation.url
              title = citation.title || extractTitleFromUrl(citation.url)
            }

            if (!seenUrls.has(url)) {
              seenUrls.add(url)
              const tier = getSourceTier(url)
              allSources.push({ uri: url, title, tier })
            }
          }
        }

        // Extract content for keyword analysis
        const content = data.choices?.[0]?.message?.content || ''
        return { content, citations: data.citations || [] }
      } catch (searchError) {
        console.error(`[Grounding] Search error:`, searchError)
        return null
      }
    })

    const results = await Promise.all(searchPromises)
    const validResults = results.filter((r) => r !== null) as { content: string; citations: unknown[] }[]

    console.log(`[Grounding] Perplexity responses ${validResults.length}/${queries.length}, sources ${allSources.length}`)

    if (validResults.length === 0) {
      console.warn('[Grounding] No Perplexity results, using mock data')
      return createGroundingResponse(
        getMockGroundingData(productName),
        [],
        Date.now() - startTime,
        'Mock data (API returned no results)'
      )
    }

    // Extract keywords from all content
    const combinedContent = validResults.map(r => r.content).join(' ')
    extractKeywordsFromContent(combinedContent, productName, allSources, keywordCounts)

    // Convert to sorted keywords array
    const keywords: GroundingKeyword[] = Array.from(keywordCounts.entries())
      .map(([term, data]) => ({
        term: term.charAt(0).toUpperCase() + term.slice(1),
        score: Math.min(data.count * 15, 100),
        sources: data.sources.slice(0, 5),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)

    // Sort allSources by tier (best first)
    allSources.sort((a, b) => a.tier - b.tier)

    const finalKeywords = keywords.length > 0 ? keywords : getMockGroundingData(productName)

    return createGroundingResponse(
      finalKeywords,
      allSources,
      Date.now() - startTime,
      JSON.stringify({ keywords: finalKeywords, sources: allSources }, null, 2)
    )
  } catch (error) {
    console.error('[Grounding] Perplexity search error:', error)
    return createGroundingResponse(
      getMockGroundingData(productName),
      [],
      Date.now() - startTime,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Create grounding stage response
 */
function createGroundingResponse(
  keywords: GroundingKeyword[],
  sources: GroundingSource[],
  latencyMs: number,
  rawResponse: string
): StageTestResponse {
  const output: StageOutput = {
    grounding_keywords: keywords,
    grounding_sources: sources,
  }

  // Calculate quality score for grounding
  const keywordScore = Math.min(20, keywords.length * 2)
  const sourceScore = Math.min(20, sources.length * 2)
  const tierScore = sources.filter(s => s.tier <= 2).length * 3
  const total = keywordScore + sourceScore + Math.min(20, tierScore) + 20 // Base score

  return {
    id: crypto.randomUUID(),
    output,
    metrics: {
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
    qualityScore: {
      total: Math.min(100, total),
      grade: getGrade(total),
      breakdown: {
        keywordDensity: keywordScore,
        questionPatterns: 5, // N/A for grounding
        sentenceStructure: sourceScore,
        lengthCompliance: Math.min(20, tierScore),
        aiExposure: 20,
      },
      suggestions: keywords.length < 5
        ? ['Try a more specific product name for better results']
        : [],
    },
    rawResponse,
    status: 'completed',
  }
}

/**
 * Extract title from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    const path = urlObj.pathname.split('/').filter(Boolean).slice(0, 2).join(' - ')
    return path ? `${hostname}: ${path}` : hostname
  } catch {
    return url
  }
}

/**
 * Extract keywords from content
 */
function extractKeywordsFromContent(
  content: string,
  productName: string,
  sources: GroundingSource[],
  keywordCounts: Map<string, { count: number; sources: GroundingSource[] }>
): void {
  const relevantTerms = [
    'camera', 'battery', 'display', 'screen', 'performance', 'design',
    'processor', 'storage', 'charging', 'wireless', 'audio', 'speaker',
    'durability', 'weight', 'size', 'build quality',
    'ai', 'galaxy ai', 'software', 'one ui', 'features', 'update',
    'price', 'value', 'premium', 'flagship', 'budget', 'affordable',
    'gaming', 'photography', 'video', 'productivity', 'multitasking',
    'comparison', 'vs', 'better', 'best', 'improvement', 'upgrade',
    'foldable', 'compact', 'slim', 'lightweight', 'portable',
  ]

  const lowerContent = content.toLowerCase()

  for (const term of relevantTerms) {
    const termLower = term.toLowerCase()
    const occurrences = (lowerContent.match(new RegExp(termLower, 'gi')) || []).length

    if (occurrences > 0) {
      const existing = keywordCounts.get(term) || { count: 0, sources: [] }
      existing.count += occurrences

      const sortedSources = [...sources].sort((a, b) => a.tier - b.tier)
      for (const source of sortedSources.slice(0, 3)) {
        if (!existing.sources.some(s => s.uri === source.uri)) {
          existing.sources.push(source)
        }
      }

      keywordCounts.set(term, existing)
    }
  }
}

/**
 * Mock grounding data for when API is unavailable
 */
function getMockGroundingData(productName: string): GroundingKeyword[] {
  const baseSources: GroundingSource[] = [
    { uri: 'https://www.gsmarena.com', title: 'GSMArena Review', tier: 2 },
    { uri: 'https://www.reddit.com/r/GalaxyS', title: 'Reddit Galaxy Community', tier: 3 },
    { uri: 'https://www.youtube.com/watch', title: 'YouTube Tech Review', tier: 3 },
  ]

  const mockData: GroundingKeyword[] = [
    { term: 'Camera', score: 95, sources: baseSources },
    { term: 'Battery Life', score: 88, sources: baseSources },
    { term: 'Display Quality', score: 82, sources: baseSources },
    { term: 'AI Features', score: 78, sources: baseSources },
    { term: 'Performance', score: 75, sources: baseSources },
    { term: 'Design', score: 70, sources: baseSources },
    { term: 'One UI', score: 65, sources: baseSources },
    { term: 'Charging Speed', score: 60, sources: baseSources },
  ]

  // Customize based on product type
  if (productName.toLowerCase().includes('watch')) {
    return [
      { term: 'Health Tracking', score: 95, sources: baseSources },
      { term: 'Battery Life', score: 90, sources: baseSources },
      { term: 'Sleep Tracking', score: 85, sources: baseSources },
      { term: 'Design', score: 80, sources: baseSources },
      { term: 'Fitness Features', score: 75, sources: baseSources },
    ]
  }

  if (productName.toLowerCase().includes('buds')) {
    return [
      { term: 'Sound Quality', score: 95, sources: baseSources },
      { term: 'ANC', score: 90, sources: baseSources },
      { term: 'Battery Life', score: 85, sources: baseSources },
      { term: 'Comfort', score: 80, sources: baseSources },
      { term: 'Call Quality', score: 75, sources: baseSources },
    ]
  }

  if (productName.toLowerCase().includes('fold') || productName.toLowerCase().includes('flip')) {
    return [
      { term: 'Foldable Display', score: 95, sources: baseSources },
      { term: 'Durability', score: 90, sources: baseSources },
      { term: 'Camera', score: 85, sources: baseSources },
      { term: 'Multitasking', score: 80, sources: baseSources },
      { term: 'Battery Life', score: 75, sources: baseSources },
      { term: 'Portability', score: 70, sources: baseSources },
    ]
  }

  return mockData
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
    case 'grounding':
      // Grounding is scored in executeGroundingStage, this is a fallback
      breakdown.keywordDensity = output.grounding_keywords ? Math.min(20, output.grounding_keywords.length * 2) : 0
      breakdown.sentenceStructure = output.grounding_sources ? Math.min(15, output.grounding_sources.length * 2) : 0
      breakdown.lengthCompliance = 15
      breakdown.aiExposure = 20
      breakdown.questionPatterns = 5
      break

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
