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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Response schema for USP extraction
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
          confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Confidence level based on evidence availability',
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

  const systemInstruction = `You are a Samsung product analyst specializing in identifying Unique Selling Points (USPs).

## YOUR MISSION
Extract 2-8 evidence-based USPs from the product information, video transcript, and grounding data.

## USP QUALITY STANDARDS
1. **Specific**: Use exact numbers, measurements, and names (e.g., "50 MP main camera" not "good camera")
2. **Differentiated**: Explain what makes this different from competitors
3. **Benefit-Focused**: Always include the user benefit, not just the feature
4. **Evidence-Based**: Base confidence on available evidence from sources

## CONFIDENCE LEVEL GUIDELINES
- **high**: Found in official Samsung sources or multiple tier-1 sources with specific data
- **medium**: Found in tech reviews or tier-2 sources with reasonable specificity
- **low**: Inferred from video content only or no external verification available

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
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: uspExtractionSchema,
        temperature: 0.5,
        maxOutputTokens: 2000,
      },
    })

    const content = response.text
    if (!content) {
      console.warn('[USP Extraction] No content returned, using fallback')
      return getFallbackUSPs(productName, keywords)
    }

    const parsed = JSON.parse(content)

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
    return 'No external grounding evidence available. Use video content only with LOW confidence.'
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

    // Adjust confidence based on actual evidence
    let adjustedConfidence = usp.confidence
    if (relevantSources.some(s => s.tier === 1)) {
      adjustedConfidence = 'high'
    } else if (relevantSources.some(s => s.tier === 2) && adjustedConfidence === 'low') {
      adjustedConfidence = 'medium'
    } else if (relevantSources.length === 0 && adjustedConfidence === 'high') {
      adjustedConfidence = 'medium'
    }

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
 */
function findRelevantSources(
  feature: string,
  category: USPCategory,
  sources: GroundingSource[]
): GroundingSource[] {
  const featureLower = feature.toLowerCase()
  const categoryLower = category.toLowerCase()

  return sources.filter(source => {
    const titleLower = source.title.toLowerCase()
    const uriLower = source.uri.toLowerCase()

    // Check if source is relevant to the feature or category
    return (
      titleLower.includes(featureLower) ||
      uriLower.includes(featureLower) ||
      titleLower.includes(categoryLower) ||
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

  // Calculate based on confidence distribution
  const highCount = usps.filter(u => u.confidence === 'high').length
  const mediumCount = usps.filter(u => u.confidence === 'medium').length
  const lowCount = usps.filter(u => u.confidence === 'low').length

  const confidenceScore = (highCount * 100 + mediumCount * 60 + lowCount * 20) / usps.length

  // Boost for having official sources
  const tier1Sources = sources.filter(s => s.tier === 1).length
  const sourceBoost = Math.min(tier1Sources * 5, 20) // Max 20 point boost

  return Math.min(100, Math.round(confidenceScore + sourceBoost))
}

/**
 * Fallback USPs when extraction fails
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
    return 'Other'
  }

  const fallbackUSPs: UniqueSellingPoint[] = keywords.slice(0, 3).map(keyword => ({
    feature: `${productName} ${keyword} capability`,
    category: categoryFromKeyword(keyword),
    differentiation: `Designed for ${keyword.toLowerCase()} enthusiasts`,
    userBenefit: `Enhanced ${keyword.toLowerCase()} experience`,
    evidence: {
      sources: ['Video content'],
      quotes: [],
    },
    confidence: 'low' as ConfidenceLevel,
  }))

  // Ensure at least 2 USPs
  if (fallbackUSPs.length < 2) {
    fallbackUSPs.push({
      feature: `${productName} Samsung ecosystem integration`,
      category: 'Software',
      differentiation: 'Seamless Galaxy ecosystem experience',
      userBenefit: 'Connected device experience across Samsung products',
      evidence: {
        sources: ['Video content'],
        quotes: [],
      },
      confidence: 'low',
    })
  }

  return {
    usps: fallbackUSPs,
    competitiveContext: `${productName} in the Samsung Galaxy lineup`,
    extractionMethod: 'generative',
    groundingQuality: 15,
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
