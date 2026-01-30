/**
 * TikTok Cover Text Generator
 * Based on GEO Solution Brief Slide 5
 * "영상 표지에 키워드형 문구 직접 삽입 여부"
 * "영상/링크 및 카피 입력 시 썸네일/커버 텍스트 제안 가능 여부"
 */

import { GoogleGenAI } from '@google/genai'
import type { TikTokCoverTextResult, ContentType } from '@/types/geo-v2'
import { safeJsonParse } from '@/lib/utils'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// TikTok cover text specific guidelines (Brief Slide 5)
const TIKTOK_COVER_GUIDELINES = {
  maxCharacters: 30,         // Very short for mobile
  maxLines: 2,               // 2 lines max
  style: 'bold, trendy, Gen-Z',
  keywords: 'must include product or feature keyword',
  placement: 'center of cover frame',
}

// TikTok trending text styles
const TIKTOK_TEXT_STYLES = {
  // Emoji-heavy style
  emoji: ['✨', '🔥', '💯', '🤯', '👀', '⚡', '💥', '🚀'],
  // Text patterns that perform well
  patterns: [
    'POV:',
    'When you',
    'This is what',
    'Wait for it...',
    'The',
    'How I',
  ],
  // Trending phrases
  trending: [
    'game changer',
    'hits different',
    'main character energy',
    'living rent free',
    'the way this',
  ],
}

interface TikTokCoverInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  srtContent?: string
  briefUsps?: string[]
  hook?: string             // Optional hook from the video
}

/**
 * Generate GEO-optimized TikTok cover text
 * Based on Brief Slide 5: "TT도 솔루션 적용 가능한지 확인 필요"
 */
export async function generateTikTokCoverText(
  input: TikTokCoverInput
): Promise<TikTokCoverTextResult> {
  const {
    productName,
    keywords,
    contentType,
    srtContent,
    briefUsps,
    hook,
  } = input

  console.log(`[TikTokCover] Generating cover text for: ${productName}`)

  const prompt = buildTikTokCoverPrompt(
    productName,
    keywords,
    contentType,
    srtContent,
    briefUsps,
    hook
  )

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.9, // High creativity for TikTok
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    })

    const responseText = response.text || ''
    const parsed = safeJsonParse<{
      text?: string
      alternatives?: string[]
      keywords?: string[]
    }>(responseText, {}, 'TikTokCoverGenerator')

    const text = parsed.text || ''
    const extractedKeywords = parsed.keywords || keywords.slice(0, 2)

    return {
      text: text.slice(0, 30),
      keywords: extractedKeywords,
      charCount: text.length,
    }
  } catch (error) {
    console.error('[TikTokCover] Generation failed:', error)
    return generateFallbackCoverText(productName, keywords, contentType)
  }
}

/**
 * Build the prompt for TikTok cover text generation
 */
function buildTikTokCoverPrompt(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  srtContent?: string,
  briefUsps?: string[],
  hook?: string
): string {
  return `You are a TikTok content expert for Samsung.
Generate cover text that will make users stop scrolling.

## GEO REQUIREMENT (Brief Slide 5)
- Cover text must include KEYWORD (product or feature)
- Maximum 30 characters (CRITICAL - must fit on mobile)
- Must be visually impactful
- Must match TikTok's trendy, Gen-Z aesthetic

## TIKTOK COVER TEXT RULES
- VERY short (2-3 words ideal)
- Use emojis strategically: ${TIKTOK_TEXT_STYLES.emoji.join(' ')}
- Trending patterns: ${TIKTOK_TEXT_STYLES.patterns.slice(0, 4).join(', ')}
- All caps or sentence case (both work)
- Create curiosity or FOMO

## INPUT
Product: ${productName}
Content Type: ${contentType}
Key Features: ${briefUsps?.join(', ') || keywords.join(', ')}
${hook ? `Video Hook: ${hook}` : ''}
${srtContent ? `Content: ${srtContent.slice(0, 150)}...` : ''}

## CONTENT TYPE GUIDANCE
${contentType === 'intro' ? '- Use: "NEW ✨", "JUST DROPPED", product name' : ''}
${contentType === 'unboxing' ? '- Use: "UNBOX 📦", "WHAT I GOT", "REVEAL"' : ''}
${contentType === 'how_to' ? '- Use: "HACK 🔥", "TIP", "DID YOU KNOW"' : ''}
${contentType === 'shorts' ? '- Ultra short: 1-2 words + emoji' : ''}

## GOOD EXAMPLES
- "Galaxy AI 🔥"
- "THIS camera tho"
- "POV: New phone"
- "Wait for it ✨"
- "S26 ULTRA"

## OUTPUT FORMAT (JSON)
{
  "text": "Cover text (max 30 chars)",
  "alternatives": ["Alt 1", "Alt 2", "Alt 3"],
  "keywords": ["keyword1"]
}

Generate viral-worthy cover text now. Think like a Gen-Z creator.`
}

/**
 * Generate fallback cover text
 */
function generateFallbackCoverText(
  productName: string,
  keywords: string[],
  contentType: ContentType
): TikTokCoverTextResult {
  const feature = keywords[0] || 'AI'
  let text: string

  switch (contentType) {
    case 'intro':
      text = `${productName} ✨`
      break
    case 'unboxing':
      text = 'UNBOX 📦'
      break
    case 'how_to':
      text = `${feature} hack 🔥`
      break
    case 'shorts':
      text = '👀'
      break
    default:
      text = `${productName}`
  }

  // Ensure max 30 characters
  text = text.slice(0, 30)

  return {
    text,
    keywords: keywords.slice(0, 1),
    charCount: text.length,
  }
}

/**
 * Extended TikTok cover result with more options
 */
export interface ExtendedTikTokCoverResult extends TikTokCoverTextResult {
  alternatives: string[]
  styleRecommendation: {
    font: string
    color: string
    position: string
    effect: string
  }
  hashtagSuggestions: string[]
}

/**
 * Generate extended cover text with styling recommendations
 */
export async function generateExtendedTikTokCover(
  input: TikTokCoverInput
): Promise<ExtendedTikTokCoverResult> {
  const baseResult = await generateTikTokCoverText(input)

  // Generate alternatives
  const alternatives = generateAlternatives(input.productName, input.keywords, input.contentType)

  // Style recommendations based on content type
  const styleRecommendation = getStyleRecommendation(input.contentType)

  // Hashtag suggestions
  const hashtagSuggestions = generateHashtagSuggestions(input.productName, input.keywords)

  return {
    ...baseResult,
    alternatives,
    styleRecommendation,
    hashtagSuggestions,
  }
}

/**
 * Generate alternative cover texts
 */
function generateAlternatives(
  productName: string,
  keywords: string[],
  contentType: ContentType
): string[] {
  const feature = keywords[0] || 'AI'
  const alternatives: string[] = []

  // Pattern-based alternatives
  switch (contentType) {
    case 'intro':
      alternatives.push(
        `NEW ${productName} 🔥`.slice(0, 30),
        `${productName} DROP ✨`.slice(0, 30),
        `IT'S HERE 👀`.slice(0, 30)
      )
      break
    case 'unboxing':
      alternatives.push(
        'What I got 📦',
        'REVEAL TIME ✨',
        'Open with me 👀'
      )
      break
    case 'how_to':
      alternatives.push(
        `${feature} tip 💡`.slice(0, 30),
        'GAME CHANGER 🔥',
        'Try this hack ✨'
      )
      break
    default:
      alternatives.push(
        `${feature} ✨`.slice(0, 30),
        'Watch this 👀',
        '🔥🔥🔥'
      )
  }

  return alternatives.slice(0, 3)
}

/**
 * Get style recommendation based on content type
 */
function getStyleRecommendation(contentType: ContentType): ExtendedTikTokCoverResult['styleRecommendation'] {
  switch (contentType) {
    case 'intro':
      return {
        font: 'TikTok Classic Bold',
        color: '#FFFFFF with drop shadow',
        position: 'Center',
        effect: 'Glow or Neon',
      }
    case 'unboxing':
      return {
        font: 'TikTok Classic Bold',
        color: '#FFD700 (Gold)',
        position: 'Center-Bottom',
        effect: 'Sparkle overlay',
      }
    case 'how_to':
      return {
        font: 'TikTok Classic',
        color: '#FFFFFF',
        position: 'Top-Center',
        effect: 'None (clean look)',
      }
    default:
      return {
        font: 'TikTok Classic Bold',
        color: '#FFFFFF',
        position: 'Center',
        effect: 'Subtle glow',
      }
  }
}

/**
 * Generate hashtag suggestions for TikTok
 */
function generateHashtagSuggestions(productName: string, keywords: string[]): string[] {
  const productTag = `#${productName.replace(/\s+/g, '')}`.slice(0, 30)
  const featureTag = keywords[0] ? `#${keywords[0].replace(/\s+/g, '')}` : '#tech'

  return [
    '#fyp',
    '#tech',
    '#Samsung',
    '#GalaxyAI',
    productTag,
    featureTag,
    '#phonereview',
    '#newphone',
  ].slice(0, 6)
}

export { TIKTOK_COVER_GUIDELINES, TIKTOK_TEXT_STYLES }
