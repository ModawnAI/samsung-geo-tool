/**
 * Instagram Alt Text Generator
 * Based on GEO Solution Brief Slide 4
 * "제품명+장면설명+키워드 포함, 150자 이내"
 * 
 * Different from image-alt-generator.ts which is for product images.
 * This is specifically for Instagram post/reel alt text.
 */

import { GoogleGenAI } from '@google/genai'
import type { ContentType, UniqueSellingPoint } from '@/types/geo-v2'
import { safeJsonParse } from '@/lib/utils'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Instagram Alt Text specific constraints (GEO Brief Slide 4)
const INSTAGRAM_ALT_CONSTRAINTS = {
  maxCharacters: 150,
  minCharacters: 50,
  mustInclude: ['product_name', 'scene_description', 'keyword'],
}

export interface InstagramAltTextResult {
  text: string              // Generated alt text
  textKo: string            // Korean version
  charCount: number
  charCountKo: number
  keywords: string[]        // Keywords included
  visualElements: string[]  // Visual elements described
  validation: {
    hasProductName: boolean
    hasSceneDescription: boolean
    hasKeyword: boolean
    withinLimit: boolean
    accessibilityScore: number // 0-100
  }
}

interface InstagramAltTextInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  srtContent?: string
  briefUsps?: string[]
  mediaType?: 'image' | 'video' | 'carousel'
  sceneDescription?: string // Optional manual scene description
}

/**
 * Generate GEO-optimized Instagram alt text
 * Based on Brief: "영상/링크 및 카피 입력 시 Alt text 제안 가능 여부"
 */
export async function generateInstagramAltText(
  input: InstagramAltTextInput
): Promise<InstagramAltTextResult> {
  const {
    productName,
    keywords,
    contentType,
    srtContent,
    briefUsps,
    mediaType = 'video',
    sceneDescription,
  } = input

  console.log(`[InstagramAltText] Generating alt text for: ${productName} (${mediaType})`)

  const prompt = buildInstagramAltPrompt(
    productName,
    keywords,
    contentType,
    srtContent,
    briefUsps,
    mediaType,
    sceneDescription
  )

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.3, // Lower for consistency
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text || ''
    const parsed = safeJsonParse<{
      text?: string
      textKo?: string
      keywords?: string[]
      visualElements?: string[]
    }>(text, {}, 'InstagramAltTextGenerator')

    const altText = parsed.text || ''
    const altTextKo = parsed.textKo || ''
    const extractedKeywords = parsed.keywords || keywords.slice(0, 3)
    const visualElements = parsed.visualElements || []

    // Validate the alt text
    const validation = validateInstagramAltText(altText, altTextKo, productName, keywords)

    return {
      text: altText.slice(0, 150),
      textKo: altTextKo.slice(0, 150),
      charCount: altText.length,
      charCountKo: altTextKo.length,
      keywords: extractedKeywords,
      visualElements,
      validation,
    }
  } catch (error) {
    console.error('[InstagramAltText] Generation failed:', error)
    return generateFallbackAltText(productName, keywords, contentType, mediaType)
  }
}

/**
 * Build the prompt for Instagram alt text generation
 */
function buildInstagramAltPrompt(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  srtContent?: string,
  briefUsps?: string[],
  mediaType: string = 'video',
  sceneDescription?: string
): string {
  return `You are an accessibility and SEO expert for Samsung Instagram content.
Generate optimized alt text following Instagram's accessibility guidelines.

## GEO REQUIREMENT (Brief Slide 4)
Alt text MUST include:
1. **Product name** (${productName})
2. **Scene description** (what's shown/happening)
3. **At least 1 keyword** from: ${keywords.join(', ')}

## CONSTRAINTS
- Maximum 150 characters (CRITICAL - Instagram limit)
- Do NOT start with "Image of" or "Video of" or "사진" or "영상"
- Be descriptive but concise
- Make it meaningful for screen reader users

## INPUT
Product: ${productName}
Media Type: ${mediaType}
Content Type: ${contentType}
Key Features: ${briefUsps?.join(', ') || keywords.join(', ')}
${sceneDescription ? `Scene Description: ${sceneDescription}` : ''}
${srtContent ? `Content Context: ${srtContent.slice(0, 200)}...` : ''}

## GOOD EXAMPLES
- "${productName}로 Galaxy AI 번역 기능을 사용해 여행 중인 모습"
- "Person using ${productName} AI camera to capture night cityscape"
- "${productName}의 200MP 카메라로 촬영한 야경, AI 저조도 모드 적용"

## OUTPUT FORMAT (JSON)
{
  "text": "English alt text (max 150 chars)",
  "textKo": "한국어 대체 텍스트 (최대 150자)",
  "keywords": ["included", "keywords"],
  "visualElements": ["element1", "element2"]
}

Generate accessible, SEO-optimized alt text now.`
}

/**
 * Validate Instagram alt text against GEO requirements
 */
function validateInstagramAltText(
  text: string,
  textKo: string,
  productName: string,
  keywords: string[]
): InstagramAltTextResult['validation'] {
  const lowerText = text.toLowerCase()
  const lowerTextKo = textKo.toLowerCase()

  // Check for product name
  const hasProductName = 
    lowerText.includes(productName.toLowerCase()) ||
    lowerTextKo.includes(productName.toLowerCase()) ||
    lowerText.includes('galaxy') ||
    lowerTextKo.includes('갤럭시')

  // Check for scene description (has action/descriptive words)
  const sceneWords = ['using', 'showing', 'capturing', 'demonstrating', 'holding', 
    '사용', '촬영', '보여주는', '시연', '들고']
  const hasSceneDescription = sceneWords.some(word => 
    lowerText.includes(word) || lowerTextKo.includes(word)
  ) || text.length > 50 // Assume longer text has description

  // Check for keyword inclusion
  const hasKeyword = keywords.some(kw => 
    lowerText.includes(kw.toLowerCase()) || lowerTextKo.includes(kw.toLowerCase())
  )

  // Check character limit
  const withinLimit = text.length <= 150 && textKo.length <= 150

  // Calculate accessibility score
  let accessibilityScore = 50

  if (hasProductName) accessibilityScore += 15
  if (hasSceneDescription) accessibilityScore += 15
  if (hasKeyword) accessibilityScore += 10
  if (withinLimit) accessibilityScore += 10

  // Penalize if starts with redundant words
  const redundantStarts = ['image', 'video', 'photo', 'picture', '이미지', '사진', '영상']
  if (redundantStarts.some(w => lowerText.startsWith(w) || lowerTextKo.startsWith(w))) {
    accessibilityScore -= 15
  }

  return {
    hasProductName,
    hasSceneDescription,
    hasKeyword,
    withinLimit,
    accessibilityScore: Math.min(100, Math.max(0, accessibilityScore)),
  }
}

/**
 * Generate fallback alt text when AI fails
 */
function generateFallbackAltText(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  mediaType: string
): InstagramAltTextResult {
  const feature = keywords[0] || 'Galaxy AI'
  let text: string
  let textKo: string

  switch (contentType) {
    case 'intro':
      text = `${productName} showcasing ${feature} capabilities in a lifestyle setting`
      textKo = `${productName}의 ${feature} 기능을 보여주는 라이프스타일 장면`
      break
    case 'unboxing':
      text = `Unboxing ${productName}, revealing ${feature} and premium packaging`
      textKo = `${productName} 언박싱, ${feature}와 프리미엄 패키징 공개`
      break
    case 'how_to':
      text = `Step-by-step demonstration of ${feature} on ${productName}`
      textKo = `${productName}에서 ${feature} 사용법 단계별 시연`
      break
    default:
      text = `${productName} featuring ${feature} in action`
      textKo = `${productName}의 ${feature} 기능 시연 장면`
  }

  const validation = validateInstagramAltText(text, textKo, productName, keywords)

  return {
    text: text.slice(0, 150),
    textKo: textKo.slice(0, 150),
    charCount: text.length,
    charCountKo: textKo.length,
    keywords: keywords.slice(0, 2),
    visualElements: ['product', 'feature demo'],
    validation,
  }
}

/**
 * Generate alt text variations for A/B testing
 */
export async function generateAltTextVariations(
  input: InstagramAltTextInput,
  count: number = 3
): Promise<InstagramAltTextResult[]> {
  const results: InstagramAltTextResult[] = []

  for (let i = 0; i < count; i++) {
    const result = await generateInstagramAltText({
      ...input,
      // Slightly vary the context to get different results
      briefUsps: input.briefUsps?.slice(i % (input.briefUsps?.length || 1)),
    })
    results.push(result)
  }

  return results
}

export { INSTAGRAM_ALT_CONSTRAINTS }
