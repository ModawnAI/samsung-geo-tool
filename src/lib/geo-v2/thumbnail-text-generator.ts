/**
 * Thumbnail Text Generator
 * Based on GEO Solution Brief Slide 3 & 5
 * "영상/링크 입력시 썸네일 제안 가능 여부"
 * "핵심주체를 노출하는 이미지와 함께 크고 명확한 텍스트 사용 여부"
 * "썸네일 이미지 파일 이름에 핵심 키워드 포함 여부"
 */

import { GoogleGenAI } from '@google/genai'
import type { ContentType, Platform } from '@/types/geo-v2'
import { safeJsonParse } from '@/lib/utils'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Thumbnail text guidelines based on GEO Strategy p.100
const THUMBNAIL_GUIDELINES = {
  youtube: {
    maxTextLength: 50,       // Short, punchy text
    maxWords: 5,             // Maximum 5 words
    fontSize: 'large',       // Large, clear text
    style: 'bold, high-contrast',
    placement: 'center or lower-third',
  },
  tiktok: {
    maxTextLength: 30,
    maxWords: 4,
    fontSize: 'large',
    style: 'bold, trendy',
    placement: 'center',
  },
}

export interface ThumbnailTextResult {
  primaryText: string           // Main thumbnail text
  alternativeTexts: string[]    // 2-3 alternatives
  keywords: string[]            // Keywords in the text
  suggestedFileName: string     // SEO-optimized file name
  validation: {
    isShort: boolean           // ≤5 words
    hasKeyword: boolean        // Contains product/feature keyword
    isClickworthy: boolean     // Uses power words
    fileNameOptimized: boolean // File name has keywords
  }
  styleRecommendations: {
    fontSize: string
    fontWeight: string
    color: string
    placement: string
    background: string
  }
}

interface ThumbnailTextInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  platform: Platform
  srtContent?: string
  briefUsps?: string[]
  mainHook?: string           // Optional main hook/message
}

// Power words that increase click-through (proven by YouTube data)
const POWER_WORDS = [
  // Action/urgency
  'NEW', 'NOW', 'FIRST', 'EXCLUSIVE', 'REVEALED',
  // Emotion
  'WOW', 'AMAZING', 'INCREDIBLE', 'INSANE', 'CRAZY',
  // Curiosity
  'SECRET', 'HIDDEN', 'TRUTH', 'FINALLY', 'WHY',
  // Benefit
  'FREE', 'BEST', 'ULTIMATE', 'PERFECT', 'EASY',
  // Technology
  'AI', 'PRO', 'ULTRA', 'MAX', 'PLUS',
]

/**
 * Generate GEO-optimized thumbnail text
 * Based on Brief: "영상/링크 입력시 썸네일 제안 가능 여부"
 */
export async function generateThumbnailText(
  input: ThumbnailTextInput
): Promise<ThumbnailTextResult> {
  const {
    productName,
    keywords,
    contentType,
    platform,
    srtContent,
    briefUsps,
    mainHook,
  } = input

  const guidelines = THUMBNAIL_GUIDELINES[platform as keyof typeof THUMBNAIL_GUIDELINES] 
    || THUMBNAIL_GUIDELINES.youtube

  console.log(`[ThumbnailText] Generating for: ${productName} (${platform})`)

  const prompt = buildThumbnailPrompt(
    productName,
    keywords,
    contentType,
    platform,
    srtContent,
    briefUsps,
    mainHook,
    guidelines
  )

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.85, // Higher creativity for catchy thumbnails
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text || ''
    const parsed = safeJsonParse<{
      primaryText?: string
      alternativeTexts?: string[]
      keywords?: string[]
      suggestedFileName?: string
      styleRecommendations?: ThumbnailTextResult['styleRecommendations']
    }>(text, {}, 'ThumbnailTextGenerator')

    const primaryText = parsed.primaryText || ''
    const alternativeTexts = parsed.alternativeTexts || []
    const extractedKeywords = parsed.keywords || keywords.slice(0, 2)
    const suggestedFileName = parsed.suggestedFileName || generateFileName(productName, keywords)

    // Validate the thumbnail text
    const validation = validateThumbnailText(primaryText, suggestedFileName, keywords)

    return {
      primaryText,
      alternativeTexts,
      keywords: extractedKeywords,
      suggestedFileName,
      validation,
      styleRecommendations: parsed.styleRecommendations || getDefaultStyleRecommendations(contentType),
    }
  } catch (error) {
    console.error('[ThumbnailText] Generation failed:', error)
    return generateFallbackThumbnailText(productName, keywords, contentType, platform)
  }
}

/**
 * Build the prompt for thumbnail text generation
 */
function buildThumbnailPrompt(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  platform: Platform,
  srtContent?: string,
  briefUsps?: string[],
  mainHook?: string,
  guidelines?: typeof THUMBNAIL_GUIDELINES.youtube
): string {
  return `You are a YouTube/TikTok thumbnail optimization expert for Samsung.
Generate click-worthy thumbnail text that maximizes CTR while staying on-brand.

## GEO REQUIREMENTS (Brief Slide 3 & 5)
1. Use LARGE, CLEAR text that's readable on mobile
2. Include at least ONE keyword (product name or feature)
3. Create a sense of curiosity or urgency
4. File name must contain SEO keywords

## THUMBNAIL TEXT GUIDELINES
- Maximum ${guidelines?.maxWords || 5} words
- Maximum ${guidelines?.maxTextLength || 50} characters
- Use POWER WORDS: ${POWER_WORDS.slice(0, 10).join(', ')}
- ALL CAPS or Title Case (both acceptable)
- No clickbait - stay factual to Samsung brand

## INPUT
Product: ${productName}
Platform: ${platform}
Content Type: ${contentType}
Key Features: ${briefUsps?.join(', ') || keywords.join(', ')}
${mainHook ? `Main Hook: ${mainHook}` : ''}
${srtContent ? `Content Context: ${srtContent.slice(0, 200)}...` : ''}

## CONTENT TYPE GUIDANCE
${contentType === 'intro' ? '- Focus on "NEW", "REVEALED", product name' : ''}
${contentType === 'unboxing' ? '- Focus on "UNBOXING", "FIRST LOOK", excitement' : ''}
${contentType === 'how_to' ? '- Focus on "HOW TO", the benefit, problem solved' : ''}
${contentType === 'shorts' ? '- Keep it VERY short (2-3 words), punchy' : ''}

## OUTPUT FORMAT (JSON)
{
  "primaryText": "MAIN THUMBNAIL TEXT",
  "alternativeTexts": ["Alternative 1", "Alternative 2"],
  "keywords": ["keyword1", "keyword2"],
  "suggestedFileName": "samsung-${productName.toLowerCase().replace(/\s+/g, '-')}-thumbnail-keyword.jpg",
  "styleRecommendations": {
    "fontSize": "72px or larger",
    "fontWeight": "800 (Extra Bold)",
    "color": "#FFFFFF",
    "placement": "center-bottom",
    "background": "gradient overlay for readability"
  }
}

Generate compelling thumbnail text now. Think like a top YouTuber.`
}

/**
 * Validate thumbnail text against GEO requirements
 */
function validateThumbnailText(
  text: string,
  fileName: string,
  keywords: string[]
): ThumbnailTextResult['validation'] {
  const words = text.split(/\s+/)
  const lowerText = text.toLowerCase()
  const lowerFileName = fileName.toLowerCase()

  // Check word count
  const isShort = words.length <= 5

  // Check for keyword inclusion
  const hasKeyword = keywords.some(kw => 
    lowerText.includes(kw.toLowerCase())
  ) || lowerText.includes('galaxy') || lowerText.includes('samsung')

  // Check for power words (clickworthy)
  const isClickworthy = POWER_WORDS.some(pw => 
    text.toUpperCase().includes(pw)
  )

  // Check file name optimization
  const fileNameOptimized = keywords.some(kw =>
    lowerFileName.includes(kw.toLowerCase().replace(/\s+/g, '-'))
  ) || lowerFileName.includes('samsung') || lowerFileName.includes('galaxy')

  return {
    isShort,
    hasKeyword,
    isClickworthy,
    fileNameOptimized,
  }
}

/**
 * Generate SEO-optimized file name
 */
function generateFileName(productName: string, keywords: string[]): string {
  const baseProduct = productName.toLowerCase().replace(/\s+/g, '-')
  const mainKeyword = keywords[0]?.toLowerCase().replace(/\s+/g, '-') || 'feature'
  const timestamp = new Date().toISOString().split('T')[0]

  return `samsung-${baseProduct}-${mainKeyword}-thumbnail-${timestamp}.jpg`
}

/**
 * Get default style recommendations based on content type
 */
function getDefaultStyleRecommendations(
  contentType: ContentType
): ThumbnailTextResult['styleRecommendations'] {
  const baseStyle = {
    fontSize: '72px',
    fontWeight: '800',
    color: '#FFFFFF',
    placement: 'center-bottom',
    background: 'dark gradient overlay (50% opacity)',
  }

  switch (contentType) {
    case 'intro':
      return {
        ...baseStyle,
        color: '#FFFFFF',
        background: 'Samsung Blue (#1428A0) gradient',
      }
    case 'unboxing':
      return {
        ...baseStyle,
        color: '#FFD700', // Gold for excitement
        background: 'dark overlay',
      }
    case 'how_to':
      return {
        ...baseStyle,
        color: '#FFFFFF',
        background: 'subtle product blur',
      }
    case 'shorts':
      return {
        ...baseStyle,
        fontSize: '96px', // Larger for shorts
        placement: 'center',
      }
    default:
      return baseStyle
  }
}

/**
 * Generate fallback thumbnail text
 */
function generateFallbackThumbnailText(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  platform: Platform
): ThumbnailTextResult {
  const feature = keywords[0] || 'AI'
  let primaryText: string
  let alternativeTexts: string[]

  switch (contentType) {
    case 'intro':
      primaryText = `${productName.toUpperCase()} REVEALED`
      alternativeTexts = [
        `NEW ${productName.toUpperCase()}`,
        `${productName} IS HERE`,
      ]
      break
    case 'unboxing':
      primaryText = `UNBOXING ${productName.toUpperCase()}`
      alternativeTexts = [
        `${productName} FIRST LOOK`,
        `INSIDE THE BOX`,
      ]
      break
    case 'how_to':
      primaryText = `${feature.toUpperCase()} GUIDE`
      alternativeTexts = [
        `HOW TO USE ${feature.toUpperCase()}`,
        `${feature} TIPS`,
      ]
      break
    case 'shorts':
      primaryText = feature.toUpperCase()
      alternativeTexts = [
        `WOW 😮`,
        `THIS ${feature.toUpperCase()}`,
      ]
      break
    default:
      primaryText = productName.toUpperCase()
      alternativeTexts = [
        `${feature.toUpperCase()} DEMO`,
        `GALAXY AI`,
      ]
  }

  const suggestedFileName = generateFileName(productName, keywords)
  const validation = validateThumbnailText(primaryText, suggestedFileName, keywords)

  return {
    primaryText,
    alternativeTexts,
    keywords: keywords.slice(0, 2),
    suggestedFileName,
    validation,
    styleRecommendations: getDefaultStyleRecommendations(contentType),
  }
}

/**
 * Generate multiple thumbnail variations for A/B testing
 */
export async function generateThumbnailVariations(
  input: ThumbnailTextInput,
  count: number = 3
): Promise<ThumbnailTextResult[]> {
  const results: ThumbnailTextResult[] = []

  // Generate primary
  const primary = await generateThumbnailText(input)
  results.push(primary)

  // Add alternatives as separate results
  for (const alt of primary.alternativeTexts.slice(0, count - 1)) {
    results.push({
      ...primary,
      primaryText: alt,
      alternativeTexts: [],
      validation: validateThumbnailText(alt, primary.suggestedFileName, primary.keywords),
    })
  }

  return results
}

export { THUMBNAIL_GUIDELINES, POWER_WORDS }
