import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { multiQuerySearch, getSectionContext } from '@/lib/rag/search'
import { isPineconeConfigured } from '@/lib/pinecone/client'
import { loadActivePrompt } from '@/lib/tuning/prompt-loader'
import type { ProductCategory, PlaybookSearchResult, PlaybookSection } from '@/types/playbook'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Signal weights for harmonized RAG + Grounding + User Input fusion
const SIGNAL_WEIGHTS = {
  playbook: 0.33,   // Brand guidelines
  grounding: 0.33,  // User intent signals from real-time search
  userContent: 0.34 // User's actual content (SRT + keywords)
} as const

interface GroundingSignal {
  term: string
  score: number
  source?: string
  recency?: string
}

interface GenerateRequest {
  productName: string
  srtContent: string
  keywords: string[]
  briefUsps: string[]
  productCategory?: ProductCategory | 'all'
  usePlaybook?: boolean
  launchDate?: string // For grounding date filtering
  groundingKeywords?: GroundingSignal[] // Pre-fetched grounding signals
}

interface QualityScores {
  overall: number
  brandVoice: number
  keywordIntegration: number
  geoOptimization: number
  faqQuality: number
  refined: boolean
}

interface GenerationBreakdown {
  playbookInfluence: {
    sectionsUsed: string[]
    guidelinesApplied: number
    confidence: number
  }
  groundingInfluence: {
    topSignals: GroundingSignal[]
    signalsApplied: number
  }
  userInputInfluence: {
    keywordsIntegrated: string[]
    timestampsGenerated: number
  }
  qualityScores?: QualityScores
}

interface GenerateResponse {
  description: string
  timestamps: string
  hashtags: string[]
  faq: string
  breakdown?: GenerationBreakdown // Transparency for UI
}

// Robust JSON parser for AI responses
function parseAIJson<T>(content: string): T {
  let cleaned = content.trim()

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Attempt repair for common issues
  }

  // Fix unterminated strings by finding last valid JSON structure
  const lastBrace = cleaned.lastIndexOf('}')
  if (lastBrace > 0) {
    let truncated = cleaned.slice(0, lastBrace + 1)

    // Count quotes to check for unterminated string
    const quoteCount = (truncated.match(/(?<!\\)"/g) || []).length
    if (quoteCount % 2 !== 0) {
      // Find the last property and try to close it
      const lastColon = truncated.lastIndexOf(':')
      const lastQuote = truncated.lastIndexOf('"')
      if (lastQuote > lastColon) {
        // Unterminated string value - close it
        truncated = truncated.slice(0, lastQuote + 1) + '}'
        // May need multiple closing braces
        const openBraces = (truncated.match(/{/g) || []).length
        const closeBraces = (truncated.match(/}/g) || []).length
        truncated += '}'.repeat(Math.max(0, openBraces - closeBraces))
      }
    }

    try {
      return JSON.parse(truncated) as T
    } catch {
      // Continue to next strategy
    }
  }

  // Try extracting JSON object with regex
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch {
      // Continue
    }
  }

  // Last resort: escape control characters
  const escaped = cleaned
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')

  return JSON.parse(escaped) as T
}

const responseSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'SEO-optimized video description (300-500 characters) with natural keyword integration',
    },
    timestamps: {
      type: 'string',
      description: 'Video timestamps based on SRT content (format: "0:00 Section name")',
    },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of 10-15 relevant hashtags (Korean and English)',
    },
    faq: {
      type: 'string',
      description: '3-5 Q&A pairs formatted as a pinned comment',
    },
  },
  required: ['description', 'timestamps', 'hashtags', 'faq'],
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const {
      productName,
      srtContent,
      keywords,
      briefUsps,
      productCategory,
      usePlaybook = true,
      launchDate,
      groundingKeywords: preGroundingSignals
    } = body

    if (!productName || !srtContent) {
      return NextResponse.json(
        { error: 'Product name and SRT content are required' },
        { status: 400 }
      )
    }

    // ==========================================
    // SEQUENTIAL-THEN-PARALLEL EXECUTION
    // Grounding runs first → informs section-aware RAG
    // ==========================================
    const startTime = Date.now()

    // Step 1: Fetch grounding signals (needed for section-aware RAG filtering)
    const groundingSignals = preGroundingSignals
      ? preGroundingSignals
      : await fetchGroundingSignals(productName, keywords, launchDate)

    console.log(`[Generate] Grounding signals fetched in ${Date.now() - startTime}ms`)

    // Step 2: Fetch RAG context using grounding signals for section awareness
    const ragStartTime = Date.now()
    const playbookContext = (usePlaybook && isPineconeConfigured())
      ? await fetchPlaybookContext(productName, keywords, productCategory, groundingSignals)
      : []

    console.log(`[Generate] RAG context fetched in ${Date.now() - ragStartTime}ms`)
    console.log(`[Generate] Total fetch completed in ${Date.now() - startTime}ms`)
    console.log(`[Generate] RAG results: ${playbookContext.length}, Grounding signals: ${groundingSignals.length}`)

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(getMockGeneratedContent(productName, keywords))
    }

    const result = await generateContent({
      productName,
      srtContent,
      keywords,
      briefUsps,
      productCategory,
      usePlaybook,
      launchDate,
      groundingKeywords: groundingSignals,
    }, playbookContext, groundingSignals)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

/**
 * Fetch grounding signals from Perplexity Search API
 * ENHANCED: Multiple parallel queries for richer signals
 * Returns user intent signals based on current search trends
 */
async function fetchGroundingSignals(
  productName: string,
  keywords: string[],
  launchDate?: string
): Promise<GroundingSignal[]> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      console.warn('[Grounding] No Perplexity API key, skipping grounding')
      return []
    }

    // ENHANCEMENT: Multiple query types for comprehensive signals
    const groundingQueries = [
      // Core product queries
      `${productName} reviews opinions 2024 2025`,
      // Competitor comparison
      `${productName} vs iPhone vs Pixel comparison`,
      // Trending features
      `${productName} best features what users love`,
      // Common questions (FAQ signals)
      `${productName} common questions problems issues`,
      // Use case queries
      `${productName} ${keywords[0] || 'camera'} real world performance`,
    ]

    // Execute all queries in parallel
    const queryPromises = groundingQueries.map(query =>
      fetchSingleGroundingQuery(apiKey, query).catch(() => [])
    )

    const allResults = await Promise.all(queryPromises)
    const combinedResults = allResults.flat()

    console.log(`[Grounding] Fetched ${combinedResults.length} results from ${groundingQueries.length} queries`)

    // Filter by launch date if provided
    const filteredResults = launchDate
      ? combinedResults.filter((r: { date?: string }) => !r.date || new Date(r.date) >= new Date(launchDate))
      : combinedResults

    // Extract and score signals from search results
    const signals = extractSignalsFromResults(filteredResults, keywords)

    return signals.slice(0, 15) // Top 15 signals (increased from 10)
  } catch (error) {
    console.error('[Grounding] Failed to fetch grounding signals:', error)
    return []
  }
}

/**
 * Execute a single grounding query
 */
async function fetchSingleGroundingQuery(
  apiKey: string,
  query: string
): Promise<Array<{ title?: string; snippet?: string; url?: string; date?: string }>> {
  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      max_tokens_per_page: 512,
    }),
  })

  if (!response.ok) {
    console.error(`[Grounding] Query failed: "${query.slice(0, 30)}..." - ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.results || []
}

/**
 * Extract user intent signals from search results
 */
function extractSignalsFromResults(
  results: Array<{ title?: string; snippet?: string; url?: string; date?: string }>,
  userKeywords: string[]
): GroundingSignal[] {
  const signalMap = new Map<string, { count: number; sources: string[]; recency?: string }>()

  // Common intent indicators for Samsung products
  const intentPatterns = [
    'camera', 'battery', 'display', 'screen', 'performance', 'price',
    'AI', 'Galaxy AI', 'design', 'durability', 'charging', 'storage',
    '카메라', '배터리', '디스플레이', '성능', '가격', '디자인',
    'comparison', 'vs', 'review', 'unboxing', 'test'
  ]

  for (const result of results) {
    const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase()

    // Check for intent patterns
    for (const pattern of intentPatterns) {
      if (text.includes(pattern.toLowerCase())) {
        const existing = signalMap.get(pattern) || { count: 0, sources: [] }
        existing.count++
        if (result.url) existing.sources.push(result.url)
        if (result.date && !existing.recency) existing.recency = result.date
        signalMap.set(pattern, existing)
      }
    }

    // Boost user-provided keywords found in results
    for (const keyword of userKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        const existing = signalMap.get(keyword) || { count: 0, sources: [] }
        existing.count += 2 // Double weight for user keywords
        signalMap.set(keyword, existing)
      }
    }
  }

  // Convert to scored signals
  const maxCount = Math.max(...Array.from(signalMap.values()).map(v => v.count), 1)

  return Array.from(signalMap.entries())
    .map(([term, data]) => ({
      term,
      score: Math.round((data.count / maxCount) * 100),
      source: data.sources[0],
      recency: data.recency,
    }))
    .sort((a, b) => b.score - a.score)
}

// ==========================================
// SECTION-AWARE RAG FILTERING
// Maps user intent signals to relevant playbook sections
// ==========================================

const INTENT_TO_SECTION_MAPPING: Record<string, PlaybookSection[]> = {
  // Feature-related intents
  'camera': ['content_type_playbook', 'channel_playbook', 'creative_guidelines'],
  'battery': ['brand_core', 'content_type_playbook', 'tone_voice'],
  'display': ['creative_guidelines', 'content_type_playbook', 'brand_core'],
  'screen': ['creative_guidelines', 'content_type_playbook', 'brand_core'],
  'performance': ['brand_core', 'content_type_playbook', 'ai_content_guide'],
  'AI': ['ai_content_guide', 'content_type_playbook', 'brand_core'],
  'Galaxy AI': ['ai_content_guide', 'content_type_playbook', 'brand_core'],
  'design': ['creative_guidelines', 'brand_core', 'tone_voice'],
  'charging': ['content_type_playbook', 'brand_core', 'channel_playbook'],
  'storage': ['content_type_playbook', 'brand_core'],

  // Sentiment-related intents
  'price': ['brand_core', 'messaging_framework', 'tone_voice'],
  'comparison': ['brand_core', 'messaging_framework', 'tone_voice'],
  'vs': ['brand_core', 'messaging_framework', 'tone_voice'],

  // Content-type intents
  'review': ['content_type_playbook', 'channel_playbook', 'content_strategy'],
  'unboxing': ['content_type_playbook', 'channel_playbook', 'creative_guidelines'],
  'test': ['content_type_playbook', 'content_strategy', 'channel_playbook'],

  // Korean equivalents
  '카메라': ['content_type_playbook', 'channel_playbook', 'creative_guidelines'],
  '배터리': ['brand_core', 'content_type_playbook', 'tone_voice'],
  '디스플레이': ['creative_guidelines', 'content_type_playbook', 'brand_core'],
  '성능': ['brand_core', 'content_type_playbook', 'ai_content_guide'],
  '가격': ['brand_core', 'messaging_framework', 'tone_voice'],
  '디자인': ['creative_guidelines', 'brand_core', 'tone_voice'],
}

/**
 * Get relevant playbook sections based on grounding signals
 */
function getRelevantSections(groundingSignals: GroundingSignal[]): PlaybookSection[] {
  const sectionScores = new Map<PlaybookSection, number>()

  for (const signal of groundingSignals) {
    const sections = INTENT_TO_SECTION_MAPPING[signal.term] ||
                     INTENT_TO_SECTION_MAPPING[signal.term.toLowerCase()] || []

    for (const section of sections) {
      const currentScore = sectionScores.get(section) || 0
      sectionScores.set(section, currentScore + signal.score)
    }
  }

  // Sort by score and return top sections
  return Array.from(sectionScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([section]) => section)
}

/**
 * Fetch relevant context from Samsung Marketing Playbook using multi-query RAG
 * Enhanced with section-aware filtering based on grounding signals
 */
async function fetchPlaybookContext(
  productName: string,
  keywords: string[],
  productCategory?: ProductCategory | 'all',
  groundingSignals: GroundingSignal[] = []
): Promise<PlaybookSearchResult[]> {
  try {
    // Get relevant sections based on grounding signals
    const relevantSections = getRelevantSections(groundingSignals)
    console.log(`[RAG] Relevant sections from grounding: ${relevantSections.join(', ')}`)

    // Generate multiple queries to align with playbook content
    const baseQueries = [
      // Brand and content guidelines
      `Samsung brand guidelines content creation ${productName}`,
      // GEO optimization specific
      `GEO optimization generative engine AI search content ${productName}`,
      // Product-specific marketing
      `${productName} marketing strategy content guidelines`,
      // Keywords context
      ...keywords.slice(0, 3).map(k => `Samsung ${k} marketing guidelines`),
      // Tone and voice
      `Samsung tone of voice writing style guidelines`,
    ]

    // Add section-specific queries based on grounding signals
    const sectionQueries = relevantSections.slice(0, 3).map(section =>
      `Samsung ${section.replace(/_/g, ' ')} guidelines ${productName}`
    )

    const queries = [...baseQueries, ...sectionQueries]

    // Perform multi-query search with reranking
    const ragContext = await multiQuerySearch(queries, {
      productCategory,
      topKPerQuery: 3,
      finalTopN: 8,
      deduplicateByContent: true,
    })

    // Also get section-specific context for AI content / GEO optimization
    const geoContext = await getSectionContext('ai_content_guide', {
      productCategory,
      topK: 3,
    })

    // Get additional context for top grounding-relevant sections
    const sectionContextPromises = relevantSections.slice(0, 2).map((section: PlaybookSection) =>
      getSectionContext(section, { productCategory, topK: 2 }).catch(() => [])
    )
    const additionalContexts = await Promise.all(sectionContextPromises)

    // Combine and deduplicate all results
    const allResults = [...ragContext.results]
    const seenIds = new Set(allResults.map(r => r.id))

    // Add GEO context
    for (const result of geoContext) {
      if (!seenIds.has(result.id)) {
        allResults.push(result)
        seenIds.add(result.id)
      }
    }

    // Add section-specific contexts with slight score boost for grounding-relevant sections
    for (const contextResults of additionalContexts) {
      for (const result of contextResults) {
        if (!seenIds.has(result.id)) {
          // Boost score for grounding-relevant sections
          allResults.push({
            ...result,
            score: (result.score || 0) * 1.1, // 10% boost
          })
          seenIds.add(result.id)
        }
      }
    }

    // Sort by score and limit
    return allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12)
  } catch (error) {
    console.error('Failed to fetch playbook context:', error)
    return []
  }
}

/**
 * Critique schema for self-evaluation
 */
const critiqueSchema = {
  type: 'object',
  properties: {
    overallScore: {
      type: 'number',
      description: 'Overall quality score 0-100',
    },
    brandVoiceScore: {
      type: 'number',
      description: 'Brand voice compliance 0-100',
    },
    keywordIntegration: {
      type: 'number',
      description: 'Keyword integration naturalness 0-100',
    },
    geoOptimization: {
      type: 'number',
      description: 'GEO optimization quality 0-100',
    },
    faqQuality: {
      type: 'number',
      description: 'FAQ relevance and completeness 0-100',
    },
    issues: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of specific issues to fix',
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific improvement suggestions',
    },
  },
  required: ['overallScore', 'brandVoiceScore', 'keywordIntegration', 'geoOptimization', 'faqQuality', 'issues', 'suggestions'],
}

interface CritiqueResult {
  overallScore: number
  brandVoiceScore: number
  keywordIntegration: number
  geoOptimization: number
  faqQuality: number
  issues: string[]
  suggestions: string[]
}

/**
 * Self-critique function to evaluate generated content
 */
async function critiqueContent(
  content: GenerateResponse,
  productName: string,
  keywords: string[],
  groundingSignals: GroundingSignal[]
): Promise<CritiqueResult | null> {
  try {
    const critiquePrompt = `You are a critical evaluator for Samsung marketing content.

Evaluate this generated content for a ${productName} video:

## GENERATED CONTENT
**Description:** ${content.description}

**Timestamps:** ${content.timestamps}

**Hashtags:** ${content.hashtags.join(', ')}

**FAQ:** ${content.faq}

## EVALUATION CRITERIA
1. **Brand Voice (0-100)**: Does it match Samsung's confident, approachable, innovative tone?
2. **Keyword Integration (0-100)**: Are these keywords naturally integrated? ${keywords.join(', ')}
3. **GEO Optimization (0-100)**: Is content structured for AI search engines? (entities, Q&A format, structured data)
4. **FAQ Quality (0-100)**: Does FAQ address real user concerns? Top signals: ${groundingSignals.slice(0, 3).map(s => s.term).join(', ')}

## SCORING GUIDELINES
- 90-100: Excellent, minimal improvements needed
- 70-89: Good, minor refinements suggested
- 50-69: Adequate, several improvements needed
- Below 50: Needs significant rework

Be critical but constructive. Identify specific issues and provide actionable suggestions.`

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: critiquePrompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: critiqueSchema,
        temperature: 0.3, // Lower temp for consistent evaluation
        maxOutputTokens: 1000,
      },
    })

    const critiqueText = response.text
    if (!critiqueText) return null

    return parseAIJson<CritiqueResult>(critiqueText)
  } catch (error) {
    console.error('[Critique] Failed to evaluate content:', error)
    return null
  }
}

/**
 * Refine content based on critique feedback
 */
async function refineContent(
  originalContent: GenerateResponse,
  critique: CritiqueResult,
  productName: string,
  keywords: string[],
  groundingSignals: GroundingSignal[],
  playbookContext: PlaybookSearchResult[]
): Promise<GenerateResponse> {
  try {
    const refinePrompt = `You are a Samsung content refinement specialist.

## ORIGINAL CONTENT
**Description:** ${originalContent.description}
**Timestamps:** ${originalContent.timestamps}
**Hashtags:** ${originalContent.hashtags.join(', ')}
**FAQ:** ${originalContent.faq}

## CRITIQUE SCORES
- Brand Voice: ${critique.brandVoiceScore}/100
- Keyword Integration: ${critique.keywordIntegration}/100
- GEO Optimization: ${critique.geoOptimization}/100
- FAQ Quality: ${critique.faqQuality}/100

## ISSUES IDENTIFIED
${critique.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

## IMPROVEMENT SUGGESTIONS
${critique.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## CONTEXT
Product: ${productName}
Target Keywords: ${keywords.join(', ')}
User Signals: ${groundingSignals.slice(0, 5).map(s => `${s.term} (${s.score}%)`).join(', ')}

## YOUR TASK
Refine the content addressing ALL identified issues. Focus especially on areas scoring below 80.
Keep the same structure but improve quality. Output must be in Korean.`

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: refinePrompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    })

    const refinedText = response.text
    if (!refinedText) return originalContent

    const refined = parseAIJson<GenerateResponse>(refinedText)
    console.log('[Refine] Content refined successfully')
    return refined
  } catch (error) {
    console.error('[Refine] Failed to refine content:', error)
    return originalContent
  }
}

async function generateContent(
  params: GenerateRequest,
  playbookContext: PlaybookSearchResult[] = [],
  groundingSignals: GroundingSignal[] = []
): Promise<GenerateResponse> {
  const { productName, srtContent, keywords, briefUsps } = params

  // Load active system prompt from database (or use default fallback)
  const promptResult = await loadActivePrompt('gemini')
  const baseSystemPrompt = promptResult.prompt?.systemPrompt || ''
  console.log(`[Generate] Using ${promptResult.source} prompt${promptResult.prompt ? ` (v${promptResult.prompt.version})` : ''}`)

  // Extract unique sections from playbook context
  const sectionsUsed = [...new Set(playbookContext.map(ctx => ctx.metadata.section))]
  const topGroundingSignals = groundingSignals.slice(0, 5)

  // ==========================================
  // WEIGHTED SIGNAL FUSION PROMPT ENGINEERING
  // ==========================================

  // Build playbook context section (Weight: 33%)
  const playbookSection = playbookContext.length > 0
    ? `
## 🎯 SAMSUNG BRAND GUIDELINES (Weight: ${SIGNAL_WEIGHTS.playbook * 100}%)
Follow these guidelines from the Samsung Marketing Playbook for tone and style consistency.

${playbookContext.map((ctx, i) => `### [Guideline ${i + 1} - ${ctx.metadata.section}]
${ctx.content}`).join('\n\n')}

✅ INSTRUCTION: Use these guidelines as your style and tone framework.
`
    : ''

  // Build grounding signals section (Weight: 33%)
  const groundingSection = topGroundingSignals.length > 0
    ? `
## 🔍 USER INTENT SIGNALS (Weight: ${SIGNAL_WEIGHTS.grounding * 100}%)
Current user interest signals from real-time search data. Address these to maximize content relevance:

${topGroundingSignals.map((signal, i) => `${i + 1}. **${signal.term}** (relevance: ${signal.score}%)${signal.recency ? ` - Recent: ${signal.recency}` : ''}`).join('\n')}

✅ INSTRUCTION: Integrate these signals naturally throughout your content to address real user queries.
`
    : ''

  // Build user content section (Weight: 34%)
  const userContentSection = `
## ✏️ USER CONTENT FOUNDATION (Weight: ${SIGNAL_WEIGHTS.userContent * 100}%)
Product: ${productName}
Brief USPs: ${briefUsps.join(', ')}
Keywords to Integrate: ${keywords.join(', ')}

Video Transcript (SRT):
${srtContent.slice(0, 3000)}
`

  // Use dynamically loaded system prompt from database/default
  const systemInstruction = baseSystemPrompt

  const userPrompt = `Generate optimized content for this Samsung product video:

${playbookSection}
${groundingSection}
${userContentSection}

## OUTPUT REQUIREMENTS
Generate JSON with:
1. "description": SEO-optimized video description (300-500 chars)
   - Naturally integrate top 3 user intent signals
   - Follow playbook tone and messaging guidelines
   - Include selected keywords organically

2. "timestamps": Video timestamps from SRT (format: "0:00 Section name")
   - Match actual content from transcript
   - Use engaging section titles

3. "hashtags": Array of 10-15 hashtags (Korean + English)
   - Include brand hashtags: #Samsung, #Galaxy, #GalaxyAI
   - Add feature-specific hashtags based on user signals
   - Follow playbook hashtag guidelines if specified

4. "faq": 3-5 Q&A pairs for pinned comment
   - Address top user intent signals as questions
   - Provide comprehensive, AI-searchable answers
   - Use natural conversational language`

  try {
    // ==========================================
    // STEP 1: INITIAL GENERATION
    // ==========================================
    console.log('[Generate] Starting initial generation...')
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    })

    const content = response.text
    if (!content) {
      throw new Error('No content generated')
    }

    let parsed = parseAIJson<GenerateResponse>(content)
    console.log('[Generate] Initial content generated')

    // ==========================================
    // STEP 2: SELF-CRITIQUE REFINEMENT LOOP
    // ==========================================
    const REFINEMENT_THRESHOLD = 80 // Refine if any score below this
    const MAX_REFINEMENT_ITERATIONS = 1 // Limit refinement passes

    let refinementIterations = 0
    let critique: CritiqueResult | null = null

    while (refinementIterations < MAX_REFINEMENT_ITERATIONS) {
      console.log(`[Critique] Running self-critique (iteration ${refinementIterations + 1})...`)

      critique = await critiqueContent(parsed, productName, keywords, topGroundingSignals)

      if (!critique) {
        console.log('[Critique] Critique failed, using initial content')
        break
      }

      console.log(`[Critique] Scores - Brand: ${critique.brandVoiceScore}, Keywords: ${critique.keywordIntegration}, GEO: ${critique.geoOptimization}, FAQ: ${critique.faqQuality}`)

      // Check if refinement is needed
      const needsRefinement =
        critique.overallScore < REFINEMENT_THRESHOLD ||
        critique.brandVoiceScore < REFINEMENT_THRESHOLD ||
        critique.keywordIntegration < REFINEMENT_THRESHOLD ||
        critique.geoOptimization < REFINEMENT_THRESHOLD ||
        critique.faqQuality < REFINEMENT_THRESHOLD

      if (!needsRefinement) {
        console.log('[Critique] Content meets quality threshold, no refinement needed')
        break
      }

      console.log(`[Refine] Refinement needed (${critique.issues.length} issues found)`)
      const refined = await refineContent(
        parsed,
        critique,
        productName,
        keywords,
        topGroundingSignals,
        playbookContext
      )

      // Update parsed with refined content
      parsed = {
        description: refined.description || parsed.description,
        timestamps: refined.timestamps || parsed.timestamps,
        hashtags: refined.hashtags?.length ? refined.hashtags : parsed.hashtags,
        faq: refined.faq || parsed.faq,
      }

      refinementIterations++
    }

    // ==========================================
    // STEP 3: BUILD BREAKDOWN WITH CRITIQUE DATA
    // ==========================================
    const breakdown: GenerationBreakdown = {
      playbookInfluence: {
        sectionsUsed,
        guidelinesApplied: playbookContext.length,
        confidence: critique?.brandVoiceScore || (playbookContext.length > 0
          ? Math.min(100, playbookContext.reduce((sum, ctx) => sum + (ctx.score || 0.5), 0) / playbookContext.length * 100)
          : 0),
      },
      groundingInfluence: {
        topSignals: topGroundingSignals,
        signalsApplied: topGroundingSignals.length,
      },
      userInputInfluence: {
        keywordsIntegrated: keywords,
        timestampsGenerated: (parsed.timestamps?.match(/\d+:\d+/g) || []).length,
      },
      // Include quality scores from critique
      qualityScores: critique ? {
        overall: critique.overallScore,
        brandVoice: critique.brandVoiceScore,
        keywordIntegration: critique.keywordIntegration,
        geoOptimization: critique.geoOptimization,
        faqQuality: critique.faqQuality,
        refined: refinementIterations > 0,
      } : undefined,
    }

    console.log(`[Generate] Completed with ${refinementIterations} refinement iteration(s)`)
    if (critique) {
      console.log(`[Generate] Quality scores - Overall: ${critique.overallScore}, Brand: ${critique.brandVoiceScore}, Keywords: ${critique.keywordIntegration}, GEO: ${critique.geoOptimization}, FAQ: ${critique.faqQuality}`)
    }

    return {
      description: parsed.description || '',
      timestamps: parsed.timestamps || '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      faq: parsed.faq || '',
      breakdown,
    }
  } catch (error) {
    console.error('Gemini error:', error)
    return getMockGeneratedContent(productName, keywords)
  }
}

function getMockGeneratedContent(productName: string, keywords: string[]): GenerateResponse {
  const keywordText = keywords.length > 0 ? keywords.join(', ') : 'camera, battery, design'

  return {
    description: `${productName}의 혁신적인 기능을 직접 체험해보세요! 이 영상에서는 ${keywordText}에 대해 자세히 알아봅니다. 삼성의 최신 기술이 어떻게 일상을 바꾸는지 확인하세요. Galaxy AI와 함께하는 새로운 경험, 지금 시작하세요!

#Samsung #${productName.replace(/\s+/g, '')} #GalaxyAI`,
    timestamps: `0:00 인트로
0:15 ${productName} 첫인상
0:45 ${keywords[0] || 'Camera'} 테스트
1:30 ${keywords[1] || 'Battery'} 성능
2:15 ${keywords[2] || 'Design'} 살펴보기
3:00 AI 기능 체험
4:00 총평 및 결론`,
    hashtags: [
      '#Samsung',
      `#${productName.replace(/\s+/g, '')}`,
      '#GalaxyAI',
      '#삼성',
      '#갤럭시',
      ...keywords.map((k) => `#${k.replace(/\s+/g, '')}`),
      '#스마트폰',
      '#테크리뷰',
      '#언박싱',
      '#TechReview',
      '#Unboxing',
      '#NewPhone',
    ],
    faq: `자주 묻는 질문 FAQ

Q: ${productName}의 ${keywords[0] || 'Camera'} 성능은 어떤가요?
A: ${productName}은 최신 센서와 AI 기술을 탑재하여 전문가 수준의 결과물을 제공합니다.

Q: 배터리는 하루 종일 사용 가능한가요?
A: 네, 일반적인 사용 패턴에서 하루 이상 사용이 가능합니다.

Q: One UI 업데이트는 얼마나 지원되나요?
A: 삼성은 최대 7년간 OS 업데이트를 지원합니다.

Q: 이전 기종과 가장 큰 차이점은?
A: Galaxy AI 기능이 탑재되어 더욱 스마트한 사용 경험을 제공합니다.`,
  }
}
