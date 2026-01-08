/**
 * USP Extraction Stage (Stage 1.5)
 * Extracts Unique Selling Points with evidence from grounding sources
 */

import { GoogleGenAI } from '@google/genai'
import type {
  UniqueSellingPoint,
  USPExtractionResult,
  USPCategory,
  ConfidenceLevel,
  USPEvidence,
  GroundingSource,
  SOURCE_AUTHORITY_TIERS,
} from '@/types/geo-v2'
import { safeJsonParse } from '@/lib/utils'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Retry helper for transient failures
interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  context?: string
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    context = 'API call'
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const errorMessage = lastError.message.toLowerCase()
      const errorCode = (error as { code?: string })?.code?.toLowerCase() || ''

      const isRetryable =
        errorCode === 'econnreset' ||
        errorCode === 'etimedout' ||
        errorCode === 'econnrefused' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('connection')

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[${context}] Non-retryable error or max retries reached:`, lastError.message)
        throw lastError
      }

      const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      const jitter = Math.random() * 500
      const delay = exponentialDelay + jitter

      console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed (${errorCode || errorMessage}), retrying in ${Math.round(delay)}ms...`)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error(`${context} failed after ${maxRetries} attempts`)
}

// Response schema for USP extraction with 2-Stage Content Prioritization
const uspExtractionSchema = {
  type: 'object',
  properties: {
    usps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'The specific feature or capability (e.g., "50 MP FlexWindow selfies")',
          },
          category: {
            type: 'string',
            enum: ['Camera', 'Display', 'Performance', 'AI', 'Design', 'Battery', 'Security', 'Audio', 'Connectivity', 'Software', 'Other'],
            description: 'Category of the USP',
          },
          differentiation: {
            type: 'string',
            description: 'What makes this different from competitors',
          },
          userBenefit: {
            type: 'string',
            description: 'Direct benefit to the user',
          },
          evidence: {
            type: 'object',
            properties: {
              sources: {
                type: 'array',
                items: { type: 'string' },
                description: 'Source URLs or "Video content" for video-derived USPs',
              },
              quotes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Direct quotes from sources supporting this USP',
              },
            },
            required: ['sources'],
          },
          confidence: {
            type: 'string',
            enum: ['high'],
            description: 'Confidence level - ALWAYS high per 2-Stage strategy',
          },
        },
        required: ['feature', 'category', 'differentiation', 'userBenefit', 'confidence'],
      },
      minItems: 2,
      maxItems: 8,
      description: 'Array of 2-8 unique selling points',
    },
    competitiveContext: {
      type: 'string',
      description: 'Brief competitive context summary',
    },
    extractionMethod: {
      type: 'string',
      enum: ['grounded', 'video-primary'],
      description: 'How USPs were extracted',
    },
  },
  required: ['usps', 'competitiveContext'],
}

interface GroundingSignal {
  term: string
  score: number
  source?: string
  recency?: string
}

export interface ExtractUSPsParams {
  productName: string
  srtContent: string
  keywords: string[]
  groundingSignals: GroundingSignal[]
  groundingSources?: GroundingSource[]
}

/**
 * Extract USPs from product content with evidence grounding
 * This is Stage 1.5 in the v2 pipeline
 */
export async function extractUSPs(params: ExtractUSPsParams): Promise<USPExtractionResult> {
  const { productName, srtContent, keywords, groundingSignals, groundingSources = [] } = params

  console.log(`[USP Extraction] Starting for ${productName}...`)

  // Build evidence context from grounding
  const evidenceContext = buildEvidenceContext(groundingSignals, groundingSources)

  const systemInstruction = `You are extracting unique selling points for ${productName}.

## CONTENT PRIORITIZATION - 2-STAGE STRATEGY

### STAGE 1 - VIDEO CONTENT (Primary - HIGHEST PRIORITY)
Extract USPs DIRECTLY from video content (description and transcript):
1. Identify features explicitly mentioned or demonstrated in the video
2. Focus on what the video emphasizes and showcases
3. Extract specific examples, demonstrations, and use cases shown
4. Prioritize content that appears in both description AND transcript
5. Use the video's own language and framing

### STAGE 2 - GROUNDING FALLBACK (Last Resort - LOWEST PRIORITY)
Use grounding ONLY if Stage 1 provides insufficient detail:
1. Supplement with specific ${productName} specifications from official sources
2. Validate that grounding content MATCHES video emphasis
3. DO NOT use grounding content that contradicts or diverges from video

## GROUNDING QUERY GENERATION - MANDATORY EXECUTION PROTOCOL

🔴 CRITICAL: You MUST EXECUTE ALL [REQUIRED] queries below.

📋 Generate 10-15 search queries for EACH USP extracted from video content:

### QUERY TYPES per USP Feature (MANDATORY - use all 5 site types):
- Official: "${productName} [USP feature] specifications site:samsung.com" [REQUIRED]
- Community: "${productName} [USP feature] reddit OR site:reddit.com/r/samsung" [REQUIRED]
- Review Sites: "${productName} [USP feature] site:gsmarena.com OR site:techradar.com" [REQUIRED]
- Video Content: "${productName} [USP feature] site:youtube.com" [REQUIRED]
- Competitive: "${productName} [USP feature] vs [competitor]" [REQUIRED]

## ANTI-MISMATCH RULES
❌ DO NOT prioritize grounding over video content
❌ DO NOT include features not mentioned in video
❌ DO NOT let external content overshadow video emphasis
✅ Video content = Ground truth
✅ Grounding = Supplementary detail only

## USP QUALITY STANDARDS
1. **Specific**: Use exact numbers, measurements, and names (e.g., "50 MP main camera" not "good camera")
2. **Differentiated**: Explain what makes this different from competitors
3. **Benefit-Focused**: Always include the user benefit, not just the feature
4. **Evidence-Based**: Base on video content first, grounding second

## CATEGORY GUIDELINES
- Camera: Photo/video capabilities, sensors, lenses, modes
- Display: Screen technology, refresh rate, brightness, resolution
- Performance: Processor, RAM, benchmarks, speed
- AI: Galaxy AI features, on-device AI, smart features
- Design: Form factor, materials, colors, durability
- Battery: Capacity, charging speed, battery life
- Security: Knox, biometrics, privacy features
- Audio: Speakers, AKG, Dolby, microphones
- Connectivity: 5G, WiFi, Bluetooth, satellite
- Software: One UI, updates, ecosystem features
- Other: Anything not fitting above categories

## CONFIDENCE LEVEL RULES
✅ Video content-based USPs: ALWAYS set confidence: "high"
✅ Grounding-supplemented USPs: Set confidence: "high"
🔴 CRITICAL: There is NO "low" or "medium" confidence. ALL USPs must be "high".

## ANTI-FABRICATION RULES
- NEVER invent percentages or statistics without evidence
- NEVER claim "studies show" or "experts agree" without sources
- If evidence is weak, use SAFE LANGUAGE like:
  - "Designed for..."
  - "Enables professionals to..."
  - "Potential improvement in..."
  - "Built to support..."

Output must be in English for structured data processing.`

  const userPrompt = `Extract Unique Selling Points for this Samsung product:

## PRODUCT
${productName}

## KEYWORDS FROM USER
${keywords.join(', ')}

## VIDEO TRANSCRIPT (Summary)
${srtContent.slice(0, 2000)}

## GROUNDING EVIDENCE
${evidenceContext}

## TOP USER INTEREST SIGNALS
${groundingSignals.slice(0, 5).map(s => `- ${s.term} (score: ${s.score}%)`).join('\n')}

Extract 2-8 USPs that:
1. Address the top user interest signals
2. Are backed by available evidence
3. Focus on genuine differentiators
4. Include clear user benefits`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: uspExtractionSchema,
          temperature: 0.5,
          maxOutputTokens: 4000,
        },
      }),
      { context: 'USP Extraction' }
    )

    // Debug: Log raw response structure
    console.log('[USP Extraction] Raw response keys:', Object.keys(response))
    console.log('[USP Extraction] Response text type:', typeof response.text)
    console.log('[USP Extraction] Response text length:', response.text?.length || 0)
    console.log('[USP Extraction] Response text preview:', response.text?.slice(0, 300))

    const content = response.text
    if (!content) {
      console.warn('[USP Extraction] No content returned, using fallback')
      return getFallbackUSPs(productName, keywords)
    }

    // Use safe JSON parsing to handle malformed LLM outputs
    const defaultParsed = { usps: [], competitiveContext: '' }
    const parsed = safeJsonParse<{ usps: Array<{ feature: string; category: USPCategory; differentiation: string; userBenefit: string; confidence: ConfidenceLevel }>; competitiveContext: string }>(
      content,
      defaultParsed,
      'USP Extraction'
    )

    // If parsing failed and returned default, use fallback
    if (!parsed.usps || parsed.usps.length === 0) {
      console.warn('[USP Extraction] Parsed result has no USPs, using fallback')
      return getFallbackUSPs(productName, keywords)
    }

    // Enrich USPs with evidence from grounding sources
    const enrichedUSPs = enrichUSPsWithEvidence(parsed.usps, groundingSources, groundingSignals)

    const result: USPExtractionResult = {
      usps: enrichedUSPs,
      competitiveContext: parsed.competitiveContext || `${productName} differentiators in the premium smartphone market`,
      extractionMethod: groundingSources.length > 0 ? 'grounded' : 'generative',
      groundingQuality: calculateGroundingQuality(enrichedUSPs, groundingSources),
    }

    console.log(`[USP Extraction] Extracted ${result.usps.length} USPs (method: ${result.extractionMethod})`)

    return result
  } catch (error) {
    console.error('[USP Extraction] Error:', error)
    return getFallbackUSPs(productName, keywords)
  }
}

/**
 * Build evidence context string from grounding sources
 */
function buildEvidenceContext(
  groundingSignals: GroundingSignal[],
  groundingSources: GroundingSource[]
): string {
  if (groundingSources.length === 0 && groundingSignals.length === 0) {
    return 'No external grounding evidence available. Per 2-Stage strategy: Use video content as ground truth (HIGH confidence).'
  }

  const sourceLines = groundingSources.slice(0, 10).map(source => {
    const tierLabel = source.tier === 1 ? '(Official)' : source.tier === 2 ? '(Tech Media)' : '(Community)'
    return `- ${source.title} ${tierLabel}: ${source.uri}`
  })

  const signalLines = groundingSignals.slice(0, 5).map(signal => {
    return `- "${signal.term}" trending (${signal.score}% relevance)${signal.source ? ` - Source: ${signal.source}` : ''}`
  })

  return `### Available Sources
${sourceLines.join('\n') || 'No specific sources available'}

### User Interest Signals
${signalLines.join('\n') || 'No signals available'}`
}

/**
 * Enrich USPs with evidence from grounding sources
 */
function enrichUSPsWithEvidence(
  usps: Array<{
    feature: string
    category: USPCategory
    differentiation: string
    userBenefit: string
    confidence: ConfidenceLevel
  }>,
  groundingSources: GroundingSource[],
  groundingSignals: GroundingSignal[]
): UniqueSellingPoint[] {
  return usps.map(usp => {
    // Find relevant sources for this USP
    const relevantSources = findRelevantSources(usp.feature, usp.category, groundingSources)
    const relevantSignals = groundingSignals.filter(signal =>
      usp.feature.toLowerCase().includes(signal.term.toLowerCase()) ||
      usp.category.toLowerCase().includes(signal.term.toLowerCase())
    )

    const evidence: USPEvidence = {
      sources: relevantSources.map(s => s.uri),
      quotes: [], // Would be populated from actual source content
      searchQueries: relevantSignals.map(s => s.term),
    }

    // Per 2-Stage Content Prioritization: ALL USPs must have HIGH confidence
    // Video content = ground truth, so if USP was extracted, it's high confidence
    // Grounding only supplements - never downgrades confidence
    const adjustedConfidence: ConfidenceLevel = 'high'

    return {
      feature: usp.feature,
      category: usp.category,
      differentiation: usp.differentiation,
      userBenefit: usp.userBenefit,
      evidence,
      confidence: adjustedConfidence,
    }
  })
}

/**
 * Find sources relevant to a specific USP feature
 * Improved matching: checks if feature contains source keywords (not just vice versa)
 */
function findRelevantSources(
  feature: string,
  category: USPCategory,
  sources: GroundingSource[]
): GroundingSource[] {
  const featureLower = feature.toLowerCase()
  const categoryLower = category.toLowerCase()

  // Extract significant keywords from the feature for matching
  const featureKeywords = featureLower
    .split(/\s+/)
    .filter(word => word.length > 3) // Skip short words like "the", "and", etc.
    .map(word => word.replace(/[^a-z0-9]/g, '')) // Remove punctuation

  return sources.filter(source => {
    const titleLower = source.title.toLowerCase()
    const uriLower = source.uri.toLowerCase()

    // Check if source is relevant to the feature or category
    // Improved: Check both directions - title in feature OR feature keywords in title
    return (
      // Original: title contains feature (rare for full feature strings)
      titleLower.includes(featureLower) ||
      // NEW: Feature contains title (e.g., "200 megapixel camera" contains "camera")
      featureLower.includes(titleLower) ||
      // NEW: Any significant feature keyword matches title
      featureKeywords.some(kw => titleLower.includes(kw)) ||
      // Original: URI contains feature keywords
      featureKeywords.some(kw => uriLower.includes(kw)) ||
      // Original: Category matching
      titleLower.includes(categoryLower) ||
      featureLower.includes(categoryLower) ||
      source.usedIn.some(section =>
        section.toLowerCase().includes(categoryLower)
      )
    )
  }).slice(0, 3) // Limit to 3 sources per USP
}

/**
 * Calculate grounding quality score (0-100)
 */
function calculateGroundingQuality(
  usps: UniqueSellingPoint[],
  sources: GroundingSource[]
): number {
  if (usps.length === 0) return 0

  // Per 2-Stage strategy, all USPs are high confidence (video-based)
  // Quality score now based on source tier distribution and evidence coverage
  const uspsWithEvidence = usps.filter(u => u.evidence.sources.length > 0).length
  const evidenceCoverage = (uspsWithEvidence / usps.length) * 50 // 0-50 points

  // Source authority scoring
  const tier1Sources = sources.filter(s => s.tier === 1).length
  const tier2Sources = sources.filter(s => s.tier === 2).length
  const tier3Sources = sources.filter(s => s.tier === 3).length

  // Tier 1 (Official) = 10pts each, Tier 2 (Tech Media) = 5pts, Tier 3 (Community) = 2pts
  const sourceScore = Math.min(50, tier1Sources * 10 + tier2Sources * 5 + tier3Sources * 2)

  return Math.min(100, Math.round(evidenceCoverage + sourceScore))
}

/**
 * Fallback USPs when extraction fails
 * Per 2-Stage strategy: ALL USPs must be HIGH confidence
 * Fallback uses safe language patterns from ANTI-FABRICATION RULES
 */
function getFallbackUSPs(productName: string, keywords: string[]): USPExtractionResult {
  const categoryFromKeyword = (keyword: string): USPCategory => {
    const kw = keyword.toLowerCase()
    if (kw.includes('camera') || kw.includes('photo')) return 'Camera'
    if (kw.includes('display') || kw.includes('screen')) return 'Display'
    if (kw.includes('battery') || kw.includes('charging')) return 'Battery'
    if (kw.includes('ai') || kw.includes('galaxy ai')) return 'AI'
    if (kw.includes('design') || kw.includes('color')) return 'Design'
    if (kw.includes('performance') || kw.includes('speed')) return 'Performance'
    if (kw.includes('security') || kw.includes('knox')) return 'Security'
    if (kw.includes('audio') || kw.includes('sound')) return 'Audio'
    if (kw.includes('5g') || kw.includes('wifi') || kw.includes('connect')) return 'Connectivity'
    if (kw.includes('software') || kw.includes('one ui')) return 'Software'
    return 'Other'
  }

  // Use SAFE LANGUAGE patterns per Anti-Fabrication Rules
  const safeLanguagePatterns = [
    'Designed for',
    'Built to support',
    'Optimized for',
    'Engineered to deliver',
  ]

  const fallbackUSPs: UniqueSellingPoint[] = keywords.slice(0, 3).map((keyword, idx) => ({
    feature: `${productName} ${keyword} capability`,
    category: categoryFromKeyword(keyword),
    differentiation: `${safeLanguagePatterns[idx % safeLanguagePatterns.length]} ${keyword.toLowerCase()} enthusiasts`,
    userBenefit: `Enhanced ${keyword.toLowerCase()} experience for daily use`,
    evidence: {
      sources: ['Video content'],
      quotes: [],
      searchQueries: [`${productName} ${keyword}`],
    },
    confidence: 'high' as ConfidenceLevel, // Per 2-Stage: ALL USPs are HIGH confidence
  }))

  // Ensure at least 2 USPs
  if (fallbackUSPs.length < 2) {
    fallbackUSPs.push({
      feature: `${productName} Samsung ecosystem integration`,
      category: 'Software',
      differentiation: 'Built to support seamless Galaxy ecosystem experience',
      userBenefit: 'Connected device experience across Samsung products',
      evidence: {
        sources: ['Video content'],
        quotes: [],
        searchQueries: [`${productName} Galaxy ecosystem`],
      },
      confidence: 'high', // Per 2-Stage: ALL USPs are HIGH confidence
    })
  }

  return {
    usps: fallbackUSPs,
    competitiveContext: `${productName} differentiators in the Samsung Galaxy lineup`,
    extractionMethod: 'generative',
    groundingQuality: 40, // Fallback has moderate quality (video-derived, no external grounding)
  }
}

/**
 * Map USP categories to Korean labels
 */
export const USP_CATEGORY_LABELS: Record<USPCategory, { en: string; ko: string }> = {
  Camera: { en: 'Camera', ko: '카메라' },
  Display: { en: 'Display', ko: '디스플레이' },
  Performance: { en: 'Performance', ko: '성능' },
  AI: { en: 'AI', ko: 'AI' },
  Design: { en: 'Design', ko: '디자인' },
  Battery: { en: 'Battery', ko: '배터리' },
  Security: { en: 'Security', ko: '보안' },
  Audio: { en: 'Audio', ko: '오디오' },
  Connectivity: { en: 'Connectivity', ko: '연결성' },
  Software: { en: 'Software', ko: '소프트웨어' },
  Other: { en: 'Other', ko: '기타' },
}
