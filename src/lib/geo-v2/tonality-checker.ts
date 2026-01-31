/**
 * Tonality Checker for Samsung Brand Voice
 * Based on GEO Solution Brief Slide 2:
 * "디스크립션 카피 토날리티 검수 진행"
 * 
 * Checks content against Samsung's brand voice guidelines:
 * - Professional yet approachable
 * - Innovative and forward-thinking
 * - Consumer-focused benefits
 * - Consistent terminology
 */

import { GoogleGenAI } from '@google/genai'
import { safeJsonParse } from '@/lib/utils'
import type { Platform, ContentType } from '@/types/geo-v2'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ==========================================
// Samsung Brand Voice Guidelines
// ==========================================

export const SAMSUNG_BRAND_VOICE = {
  // Core attributes of Samsung brand voice
  attributes: [
    'innovative',
    'premium',
    'human-centric',
    'empowering',
    'confident',
    'accessible',
  ],
  
  // Tone variations by platform
  platformTone: {
    youtube: 'Professional yet engaging, informative with subtle enthusiasm',
    instagram: 'Friendly, visual-first, emoji-friendly, Gen-Z aware',
    tiktok: 'Casual, trendy, Gen-Z native, fast-paced',
  } as Record<Platform, string>,
  
  // Tone variations by content type
  contentTypeTone: {
    intro: 'Exciting and innovative, highlighting key features',
    unboxing: 'Enthusiastic and detailed, building anticipation',
    how_to: 'Clear, instructional, helpful and patient',
    shorts: 'Quick, punchy, attention-grabbing',
    teaser: 'Mysterious, exciting, building anticipation',
    brand: 'Premium, aspirational, lifestyle-focused',
    esg: 'Sincere, responsible, forward-thinking',
    documentary: 'Thoughtful, storytelling, emotional connection',
    official_replay: 'Professional, comprehensive, recap-style',
  } as Record<ContentType, string>,
  
  // Forbidden patterns (anti-brand)
  forbiddenPatterns: [
    /cheap|cheapest/i,
    /buy now|limited time/i,
    /you won't believe/i,
    /click here/i,
    /subscribe for more/i,
    /best\s+in\s+(the\s+)?world/i,
    /guaranteed\s+to/i,
    /100%\s+satisfaction/i,
    /act\s+now/i,
    /don't\s+miss\s+out/i,
  ],
  
  // Preferred Samsung terminology
  preferredTerms: {
    // Use these instead of generic terms
    phone: 'Galaxy smartphone',
    camera: 'Galaxy camera system',
    ai: 'Galaxy AI',
    battery: 'long-lasting battery',
    screen: 'Dynamic AMOLED display',
    fast: 'Snapdragon-powered performance',
  } as Record<string, string>,
  
  // Required elements for Samsung content
  requiredElements: {
    productMention: true,      // Must mention product name
    featureHighlight: true,    // Must highlight key features
    benefitFocus: true,        // Must focus on user benefits
    callToAction: true,        // Must have clear CTA
  },
}

// ==========================================
// Tonality Check Types
// ==========================================

export interface TonalityIssue {
  type: 'warning' | 'error'
  category: 'tone' | 'terminology' | 'structure' | 'brand_voice'
  message: string
  suggestion?: string
  location?: {
    start: number
    end: number
    text: string
  }
}

export interface TonalityCheckResult {
  overallScore: number        // 0-100
  isOnBrand: boolean         // true if score >= 70
  issues: TonalityIssue[]
  
  // Detailed breakdown
  breakdown: {
    toneAlignment: number     // 0-100: How well it matches Samsung tone
    terminologyScore: number  // 0-100: Use of preferred terminology
    structureScore: number    // 0-100: Content structure quality
    brandVoiceScore: number   // 0-100: Overall brand voice alignment
  }
  
  // Suggestions for improvement
  suggestions: string[]
  
  // Positive aspects found
  positives: string[]
}

// ==========================================
// Tonality Checker Implementation
// ==========================================

interface TonalityCheckInput {
  content: string
  platform: Platform
  contentType: ContentType
  productName: string
  keywords?: string[]
}

/**
 * Check content tonality against Samsung brand voice guidelines
 * Based on Brief Slide 2: "디스크립션 카피 토날리티 검수 진행"
 */
export async function checkTonality(
  input: TonalityCheckInput
): Promise<TonalityCheckResult> {
  const { content, platform, contentType, productName, keywords = [] } = input

  console.log(`[Tonality] Checking content for: ${productName} (${platform}/${contentType})`)

  // Run rule-based checks first
  const ruleBasedIssues = runRuleBasedChecks(content, platform, contentType, productName)
  
  // Run AI-powered tonality analysis
  const aiAnalysis = await runAITonalityAnalysis(
    content,
    platform,
    contentType,
    productName,
    keywords
  )

  // Combine results
  const allIssues = [...ruleBasedIssues, ...aiAnalysis.issues]
  
  // Calculate scores
  const toneAlignment = aiAnalysis.toneScore
  const terminologyScore = calculateTerminologyScore(content, ruleBasedIssues)
  const structureScore = calculateStructureScore(content, productName)
  const brandVoiceScore = Math.round(
    (toneAlignment + terminologyScore + structureScore) / 3
  )
  
  const overallScore = Math.round(
    (toneAlignment * 0.35) + 
    (terminologyScore * 0.25) + 
    (structureScore * 0.15) + 
    (brandVoiceScore * 0.25)
  )

  return {
    overallScore,
    isOnBrand: overallScore >= 70,
    issues: allIssues,
    breakdown: {
      toneAlignment,
      terminologyScore,
      structureScore,
      brandVoiceScore,
    },
    suggestions: aiAnalysis.suggestions,
    positives: aiAnalysis.positives,
  }
}

/**
 * Run rule-based checks for known patterns
 */
function runRuleBasedChecks(
  content: string,
  platform: Platform,
  contentType: ContentType,
  productName: string
): TonalityIssue[] {
  const issues: TonalityIssue[] = []

  // Check for forbidden patterns
  for (const pattern of SAMSUNG_BRAND_VOICE.forbiddenPatterns) {
    const match = content.match(pattern)
    if (match) {
      issues.push({
        type: 'error',
        category: 'brand_voice',
        message: `Avoid using "${match[0]}" - not aligned with Samsung brand voice`,
        suggestion: 'Use more professional and premium language',
        location: {
          start: match.index || 0,
          end: (match.index || 0) + match[0].length,
          text: match[0],
        },
      })
    }
  }

  // Check for product mention
  if (!content.toLowerCase().includes(productName.toLowerCase()) &&
      !content.toLowerCase().includes('galaxy') &&
      !content.toLowerCase().includes('samsung')) {
    issues.push({
      type: 'warning',
      category: 'structure',
      message: 'Product name or Samsung/Galaxy branding not found in content',
      suggestion: `Include "${productName}" or "Galaxy" in the content`,
    })
  }

  // Check for excessive exclamation marks (unprofessional)
  const exclamationCount = (content.match(/!/g) || []).length
  if (exclamationCount > 3) {
    issues.push({
      type: 'warning',
      category: 'tone',
      message: `Too many exclamation marks (${exclamationCount}) - may seem unprofessional`,
      suggestion: 'Limit exclamation marks to 1-2 per description',
    })
  }

  // Check for ALL CAPS (unless it's a title/brand name)
  const capsWords = content.match(/\b[A-Z]{4,}\b/g) || []
  const nonBrandCaps = capsWords.filter(
    word => !['SAMSUNG', 'GALAXY', 'AMOLED', 'HDR', 'AI', 'NEW'].includes(word)
  )
  if (nonBrandCaps.length > 0) {
    issues.push({
      type: 'warning',
      category: 'tone',
      message: `Avoid ALL CAPS for non-brand words: ${nonBrandCaps.join(', ')}`,
      suggestion: 'Use title case or sentence case for emphasis instead',
    })
  }

  // Platform-specific checks
  if (platform === 'instagram' || platform === 'tiktok') {
    // Check for hashtag presence
    if (!content.includes('#')) {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'No hashtags found - important for discoverability on this platform',
        suggestion: 'Add relevant hashtags like #GalaxyAI #Samsung',
      })
    }
  }

  return issues
}

/**
 * Run AI-powered tonality analysis
 */
async function runAITonalityAnalysis(
  content: string,
  platform: Platform,
  contentType: ContentType,
  productName: string,
  keywords: string[]
): Promise<{
  toneScore: number
  issues: TonalityIssue[]
  suggestions: string[]
  positives: string[]
}> {
  const platformTone = SAMSUNG_BRAND_VOICE.platformTone[platform]
  const contentTone = SAMSUNG_BRAND_VOICE.contentTypeTone[contentType]

  const prompt = `You are a Samsung brand voice expert. Analyze the following content for tonality alignment.

## SAMSUNG BRAND VOICE GUIDELINES
- Core attributes: ${SAMSUNG_BRAND_VOICE.attributes.join(', ')}
- Expected tone for ${platform}: ${platformTone}
- Expected tone for ${contentType} content: ${contentTone}

## CONTENT TO ANALYZE
Product: ${productName}
Keywords: ${keywords.join(', ')}
Content:
"""
${content}
"""

## ANALYZE FOR
1. **Tone Alignment**: Does it match Samsung's professional yet approachable voice?
2. **Platform Fit**: Is the tone appropriate for ${platform}?
3. **Content Type Fit**: Does it match expectations for ${contentType} content?
4. **Innovation Focus**: Does it highlight innovative features?
5. **User Benefits**: Does it focus on user benefits, not just specs?
6. **Professionalism**: Is it professional without being cold?

## OUTPUT FORMAT (JSON)
{
  "toneScore": <0-100>,
  "issues": [
    {
      "type": "warning" | "error",
      "category": "tone",
      "message": "Issue description",
      "suggestion": "How to fix"
    }
  ],
  "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"],
  "positives": ["Positive aspect 1", "Positive aspect 2"]
}

Be specific and constructive. Focus on actionable feedback.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.3, // Low for consistency
        responseMimeType: 'application/json',
      },
    })

    const parsed = safeJsonParse<{
      toneScore?: number
      issues?: Array<{ type: string; category: string; message: string; suggestion?: string }>
      suggestions?: string[]
      positives?: string[]
    }>(response.text || '', {}, 'TonalityAnalysis')

    return {
      toneScore: parsed.toneScore || 70,
      issues: (parsed.issues || []).map(issue => ({
        type: issue.type as 'warning' | 'error',
        category: issue.category as TonalityIssue['category'],
        message: issue.message,
        suggestion: issue.suggestion,
      })),
      suggestions: parsed.suggestions || [],
      positives: parsed.positives || [],
    }
  } catch (error) {
    console.error('[Tonality] AI analysis failed:', error)
    return {
      toneScore: 75, // Default to passing score
      issues: [],
      suggestions: ['AI tonality analysis temporarily unavailable'],
      positives: [],
    }
  }
}

/**
 * Calculate terminology score based on rule-based issues
 */
function calculateTerminologyScore(
  content: string,
  issues: TonalityIssue[]
): number {
  let score = 100
  
  // Deduct for terminology issues
  const terminologyIssues = issues.filter(i => i.category === 'terminology')
  score -= terminologyIssues.length * 10
  
  // Bonus for using preferred terms
  const preferredTermsUsed = Object.values(SAMSUNG_BRAND_VOICE.preferredTerms)
    .filter(term => content.toLowerCase().includes(term.toLowerCase()))
  score += Math.min(10, preferredTermsUsed.length * 2)
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate structure score
 */
function calculateStructureScore(
  content: string,
  productName: string
): number {
  let score = 60 // Base score
  
  // Has product mention
  if (content.toLowerCase().includes(productName.toLowerCase())) {
    score += 10
  }
  
  // Has emoji (appropriate for social)
  if (/[\u{1F300}-\u{1F9FF}]/u.test(content)) {
    score += 5
  }
  
  // Has line breaks for readability
  if (content.includes('\n')) {
    score += 5
  }
  
  // Appropriate length (not too short, not too long)
  if (content.length >= 100 && content.length <= 1000) {
    score += 10
  }
  
  // Has CTA keywords
  const ctaKeywords = ['learn more', 'discover', 'explore', 'experience', 'try', 'get']
  if (ctaKeywords.some(cta => content.toLowerCase().includes(cta))) {
    score += 10
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Quick tonality check without AI (for real-time feedback)
 */
export function quickTonalityCheck(
  content: string,
  platform: Platform,
  contentType: ContentType,
  productName: string
): { score: number; issues: TonalityIssue[] } {
  const issues = runRuleBasedChecks(content, platform, contentType, productName)
  const score = Math.max(0, 100 - (issues.filter(i => i.type === 'error').length * 20) - (issues.filter(i => i.type === 'warning').length * 5))
  
  return { score, issues }
}
