/**
 * Image Alt Text Generator
 * Generates SEO-optimized, accessible alt text templates for Samsung product images
 */

import { GoogleGenAI } from '@google/genai'
import type {
  ImageAltResult,
  ImageAltTemplate,
  ImageCategory,
  UniqueSellingPoint,
} from '@/types/geo-v2'
import { IMAGE_CATEGORY_LABELS } from '@/types/geo-v2'
import { safeJsonParse } from '@/lib/utils'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Best practices for alt text
const ALT_TEXT_GUIDELINES = {
  maxCharacters: 125,      // Recommended max for screen readers
  minCharacters: 30,       // Minimum for meaningful description
  includeProductName: true,
  includeAction: true,     // What's shown/happening
  avoidRedundancy: true,   // Don't say "image of" or "picture of"
}

// Response schema for image alt generation
const imageAltSchema = {
  type: 'object',
  properties: {
    templates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: Object.keys(IMAGE_CATEGORY_LABELS),
            description: 'Image category type',
          },
          altTextKo: {
            type: 'string',
            description: 'Korean alt text (max 125 characters)',
          },
          altTextEn: {
            type: 'string',
            description: 'English alt text (max 125 characters)',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords naturally included in the alt text',
          },
        },
        required: ['category', 'altTextKo', 'altTextEn', 'keywords'],
      },
    },
  },
  required: ['templates'],
}

export interface ImageAltGeneratorInput {
  productName: string
  productDescription?: string
  usps?: UniqueSellingPoint[]
  keywords?: string[]
  language?: 'ko' | 'en' | 'both'
}

/**
 * Generate image alt text templates for a Samsung product
 */
export async function generateImageAltTexts(
  input: ImageAltGeneratorInput
): Promise<ImageAltResult> {
  const {
    productName,
    productDescription = '',
    usps = [],
    keywords = [],
    language = 'both',
  } = input

  console.log(`[ImageAlt] Generating alt texts for: ${productName}`)

  // Extract key features from USPs for context
  const uspFeatures = usps.slice(0, 5).map(usp => usp.feature).join(', ')
  const uspCategories = [...new Set(usps.map(usp => usp.category))].join(', ')

  // Build the prompt
  const prompt = buildImageAltPrompt(productName, productDescription, uspFeatures, uspCategories, keywords)

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: imageAltSchema,
        temperature: 0.3, // Lower temperature for consistent, factual output
      },
    })

    const responseText = response.text || ''
    const parsed = safeJsonParse<{ templates?: unknown[] }>(responseText, { templates: [] }, 'ImageAltGenerator')

    if (!parsed || !parsed.templates || !Array.isArray(parsed.templates) || parsed.templates.length === 0) {
      console.error('[ImageAlt] Invalid response structure:', responseText.slice(0, 200))
      return createFallbackResult(productName, keywords)
    }

    // Process and score templates
    interface RawTemplate {
      category: ImageCategory
      altTextKo: string
      altTextEn: string
      keywords: string[]
    }
    const templates: ImageAltTemplate[] = (parsed.templates as RawTemplate[]).map((template) => {
      const altTextKo = template.altTextKo || ''
      const altTextEn = template.altTextEn || ''

      return {
        category: template.category,
        altTextKo,
        altTextEn,
        keywords: template.keywords || [],
        characterCount: {
          ko: altTextKo.length,
          en: altTextEn.length,
        },
        seoScore: calculateSeoScore(altTextKo, altTextEn, productName, keywords),
        accessibilityScore: calculateAccessibilityScore(altTextKo, altTextEn),
      }
    })

    // Calculate metadata
    const avgCharCount = templates.reduce((sum, t) => sum + t.characterCount.ko, 0) / templates.length
    const avgSeoScore = templates.reduce((sum, t) => sum + t.seoScore, 0) / templates.length

    const result: ImageAltResult = {
      productName,
      templates,
      generatedAt: new Date().toISOString(),
      totalTemplates: templates.length,
      metadata: {
        uspsIncorporated: usps.slice(0, 5).map(u => u.feature),
        keywordsIncorporated: keywords.slice(0, 10),
        avgCharCount: Math.round(avgCharCount),
        avgSeoScore: Math.round(avgSeoScore),
      },
    }

    console.log(`[ImageAlt] Generated ${templates.length} templates, avg SEO score: ${avgSeoScore.toFixed(1)}`)

    return result
  } catch (error) {
    console.error('[ImageAlt] Generation failed:', error)
    return createFallbackResult(productName, keywords)
  }
}

/**
 * Build the prompt for image alt text generation
 */
function buildImageAltPrompt(
  productName: string,
  description: string,
  uspFeatures: string,
  uspCategories: string,
  keywords: string[]
): string {
  const categoryDescriptions = Object.entries(IMAGE_CATEGORY_LABELS)
    .map(([key, value]) => `- ${key}: ${value.ko} (${value.en}) - ${value.description}`)
    .join('\n')

  return `You are an expert in SEO and accessibility, specializing in image alt text for Samsung products.

Generate optimized alt text templates for the following Samsung product:

PRODUCT: ${productName}
DESCRIPTION: ${description || 'N/A'}
KEY FEATURES: ${uspFeatures || 'N/A'}
FEATURE CATEGORIES: ${uspCategories || 'N/A'}
TARGET KEYWORDS: ${keywords.slice(0, 10).join(', ') || 'N/A'}

IMAGE CATEGORIES TO GENERATE:
${categoryDescriptions}

REQUIREMENTS:
1. Generate alt text for ALL ${Object.keys(IMAGE_CATEGORY_LABELS).length} image categories
2. Each alt text MUST be under 125 characters (Korean) / 125 characters (English)
3. DO NOT start with "이미지" or "사진" or "Image of" or "Picture of"
4. INCLUDE the product name naturally
5. DESCRIBE what's shown in the image type
6. INTEGRATE 1-2 relevant keywords naturally (don't force if unnatural)
7. Be SPECIFIC to Samsung product context
8. Korean alt text should be natural Korean, not translations

EXAMPLES OF GOOD ALT TEXT:
- Front view: "갤럭시 S25 울트라 티타늄 블랙, 6.9인치 다이내믹 아몰레드 디스플레이 정면"
- Camera: "갤럭시 S25 울트라 후면 200MP 쿼드 카메라 시스템 클로즈업"
- Lifestyle: "갤럭시 S25 울트라로 야경 촬영하는 모습, AI 카메라 기능 시연"

Generate templates in JSON format with both Korean (altTextKo) and English (altTextEn) versions.`
}

/**
 * Calculate SEO score for alt text
 */
function calculateSeoScore(
  altTextKo: string,
  altTextEn: string,
  productName: string,
  keywords: string[]
): number {
  let score = 50 // Base score

  // Check if product name is included (both languages)
  const productNameLower = productName.toLowerCase()
  if (altTextKo.toLowerCase().includes(productNameLower) || altTextEn.toLowerCase().includes(productNameLower)) {
    score += 20
  }

  // Check keyword integration
  const combinedText = (altTextKo + ' ' + altTextEn).toLowerCase()
  const keywordsFound = keywords.filter(kw => combinedText.includes(kw.toLowerCase()))
  score += Math.min(keywordsFound.length * 5, 15) // Max 15 points for keywords

  // Length optimization (not too short, not too long)
  const avgLength = (altTextKo.length + altTextEn.length) / 2
  if (avgLength >= 40 && avgLength <= 100) {
    score += 10
  } else if (avgLength >= 30 && avgLength <= 120) {
    score += 5
  }

  // Penalize if starts with redundant words
  const redundantStarts = ['image', 'picture', 'photo', '이미지', '사진', '그림']
  const startsWithRedundant = redundantStarts.some(word =>
    altTextKo.toLowerCase().startsWith(word) || altTextEn.toLowerCase().startsWith(word)
  )
  if (startsWithRedundant) {
    score -= 10
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Calculate accessibility score for alt text
 */
function calculateAccessibilityScore(altTextKo: string, altTextEn: string): number {
  let score = 60 // Base score

  // Length check (screen readers work best with 125 chars or less)
  if (altTextKo.length <= 125 && altTextEn.length <= 125) {
    score += 20
  } else if (altTextKo.length <= 150 && altTextEn.length <= 150) {
    score += 10
  }

  // Check for descriptive content (has Korean characters for Korean version)
  const hasKoreanChars = /[가-힣]/.test(altTextKo)
  if (hasKoreanChars && altTextKo.length >= 20) {
    score += 10
  }

  // Check for meaningful content (not just product name)
  if (altTextKo.length >= 30 && altTextEn.length >= 20) {
    score += 10
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Create fallback result when generation fails
 */
function createFallbackResult(productName: string, keywords: string[]): ImageAltResult {
  const categories: ImageCategory[] = [
    'front_view', 'back_view', 'side_view', 'camera_closeup', 'display_closeup',
    'lifestyle', 'color_options', 'package_contents', 'feature_highlight',
    'comparison', 'accessories'
  ]

  const fallbackTemplates: ImageAltTemplate[] = categories.map(category => {
    const label = IMAGE_CATEGORY_LABELS[category]
    const altTextKo = `${productName} ${label.ko}`
    const altTextEn = `${productName} ${label.en}`

    return {
      category,
      altTextKo,
      altTextEn,
      keywords: keywords.slice(0, 2),
      characterCount: {
        ko: altTextKo.length,
        en: altTextEn.length,
      },
      seoScore: 40, // Lower score for fallback
      accessibilityScore: 50,
    }
  })

  return {
    productName,
    templates: fallbackTemplates,
    generatedAt: new Date().toISOString(),
    totalTemplates: fallbackTemplates.length,
    metadata: {
      uspsIncorporated: [],
      keywordsIncorporated: keywords.slice(0, 5),
      avgCharCount: Math.round(fallbackTemplates.reduce((sum, t) => sum + t.characterCount.ko, 0) / fallbackTemplates.length),
      avgSeoScore: 40,
    },
  }
}

/**
 * Export utilities
 */
export { ALT_TEXT_GUIDELINES, IMAGE_CATEGORY_LABELS }
