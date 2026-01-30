/**
 * Meta Tags Generator
 * Based on GEO Solution Brief Slide 3
 * "영상/링크 및 카피 입력 시 메타태그 제안 가능 여부"
 */

import { GoogleGenAI } from '@google/genai'
import type { MetaTagsResult, ContentType } from '@/types/geo-v2'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Official Samsung meta tags (always include)
const OFFICIAL_BRAND_TAGS = [
  'Samsung',
  'Galaxy',
  'Samsung Galaxy',
  'Samsung Electronics',
]

// Product line tags
const PRODUCT_LINE_TAGS: Record<string, string[]> = {
  's26': ['Galaxy S26', 'Galaxy S26 Ultra', 'Galaxy S26 Plus', 'S26 Series'],
  'zflip': ['Galaxy Z Flip', 'Z Flip', 'Foldable Phone', 'Flip Phone'],
  'zfold': ['Galaxy Z Fold', 'Z Fold', 'Foldable Phone', 'Fold Phone'],
  'ring': ['Galaxy Ring', 'Smart Ring', 'Wearable'],
  'watch': ['Galaxy Watch', 'Smart Watch', 'Wearable'],
  'buds': ['Galaxy Buds', 'Wireless Earbuds', 'TWS'],
}

// Feature tags based on GEO Strategy
const FEATURE_TAGS = [
  'Galaxy AI',
  'AI Phone',
  'AI Camera',
  'AI Features',
  'Pro Camera',
  'Night Mode',
  'ProVisual Engine',
  'Now Bar',
  'Now Brief',
  'Circle to Search',
  'Live Translate',
  'Note Assist',
  'Browsing Assist',
]

// Generic tech tags
const GENERIC_TAGS = [
  'smartphone',
  'mobile phone',
  'Android phone',
  'flagship phone',
  'premium smartphone',
  'technology',
  'tech review',
  'unboxing',
  'how to',
]

interface MetaTagsInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  description?: string
  briefUsps?: string[]
}

/**
 * Generate SEO/GEO optimized meta tags
 */
export async function generateMetaTags(
  input: MetaTagsInput
): Promise<MetaTagsResult> {
  const { productName, keywords, contentType, description, briefUsps } = input
  
  const prompt = `
## META TAGS GENERATION (YouTube SEO/GEO)

Generate optimized meta tags for Samsung YouTube content.

### INPUT
Product: ${productName}
Content Type: ${contentType}
Keywords: ${keywords.join(', ')}
USPs: ${briefUsps?.join(', ') || 'N/A'}
${description ? `Description: ${description.slice(0, 300)}...` : ''}

### REQUIREMENTS
1. Include brand tags: Samsung, Galaxy
2. Include product-specific tags
3. Include feature tags based on content
4. Include generic tech tags for discoverability
5. Total: 10-15 tags recommended
6. Order: Brand → Product → Feature → Generic

### OUTPUT FORMAT (JSON)
{
  "brand": ["Samsung", "Galaxy", ...],
  "product": ["Galaxy S26 Ultra", "S26 Series", ...],
  "feature": ["Galaxy AI", "AI Phone", ...],
  "generic": ["smartphone", "tech review", ...]
}

Generate relevant meta tags now.
`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.5,
        topP: 0.8,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text || ''
    const parsed = JSON.parse(text)
    
    const categories = {
      brand: parsed.brand || OFFICIAL_BRAND_TAGS,
      product: parsed.product || [],
      feature: parsed.feature || [],
      generic: parsed.generic || [],
    }
    
    // Combine all tags
    const allTags = [
      ...categories.brand,
      ...categories.product,
      ...categories.feature,
      ...categories.generic,
    ]
    
    // Calculate SEO score based on tag quality
    const seoScore = calculateSeoScore(categories, productName, keywords)
    
    return {
      tags: allTags,
      categories,
      totalCount: allTags.length,
      seoScore,
    }
  } catch (error) {
    console.error('Meta tags generation error:', error)
    
    // Fallback: Generate basic tags
    return generateFallbackMetaTags(productName, keywords, contentType)
  }
}

/**
 * Calculate SEO score for meta tags
 */
function calculateSeoScore(
  categories: MetaTagsResult['categories'],
  productName: string,
  keywords: string[]
): number {
  let score = 0
  
  // Brand presence (20 points)
  if (categories.brand.length > 0) score += 20
  
  // Product tags (25 points)
  if (categories.product.length > 0) score += 15
  if (categories.product.some(t => t.toLowerCase().includes(productName.toLowerCase()))) {
    score += 10
  }
  
  // Feature tags (25 points)
  if (categories.feature.length > 0) score += 15
  if (categories.feature.some(t => 
    keywords.some(k => t.toLowerCase().includes(k.toLowerCase()))
  )) {
    score += 10
  }
  
  // Generic tags (15 points)
  if (categories.generic.length >= 2) score += 15
  
  // Total count bonus (15 points)
  const totalCount = Object.values(categories).flat().length
  if (totalCount >= 10 && totalCount <= 15) score += 15
  else if (totalCount >= 5) score += 10
  
  return Math.min(100, score)
}

/**
 * Generate fallback meta tags
 */
function generateFallbackMetaTags(
  productName: string,
  keywords: string[],
  contentType: ContentType
): MetaTagsResult {
  // Detect product line
  const lowerProduct = productName.toLowerCase()
  let productTags: string[] = [productName]
  
  for (const [key, tags] of Object.entries(PRODUCT_LINE_TAGS)) {
    if (lowerProduct.includes(key)) {
      productTags = [...productTags, ...tags.slice(0, 2)]
      break
    }
  }
  
  // Get feature tags from keywords
  const featureTags = keywords.filter(k => 
    FEATURE_TAGS.some(ft => ft.toLowerCase().includes(k.toLowerCase()))
  ).slice(0, 4)
  
  if (featureTags.length === 0) {
    featureTags.push('Galaxy AI', 'AI Phone')
  }
  
  // Content-type specific generic tags
  const genericTags = contentType === 'unboxing' 
    ? ['unboxing', 'smartphone', 'tech review']
    : contentType === 'how_to'
    ? ['how to', 'tutorial', 'guide']
    : ['smartphone', 'mobile phone', 'technology']
  
  const categories = {
    brand: OFFICIAL_BRAND_TAGS.slice(0, 2),
    product: productTags.slice(0, 3),
    feature: featureTags,
    generic: genericTags,
  }
  
  return {
    tags: [...categories.brand, ...categories.product, ...categories.feature, ...categories.generic],
    categories,
    totalCount: Object.values(categories).flat().length,
    seoScore: 70, // Base fallback score
  }
}

/**
 * Validate and enhance existing meta tags
 */
export function validateMetaTags(
  existingTags: string[],
  productName: string
): { valid: boolean; missing: string[]; suggestions: string[] } {
  const lowerTags = existingTags.map(t => t.toLowerCase())
  
  const missing: string[] = []
  const suggestions: string[] = []
  
  // Check for Samsung brand
  if (!lowerTags.some(t => t.includes('samsung'))) {
    missing.push('Samsung')
  }
  
  // Check for Galaxy
  if (!lowerTags.some(t => t.includes('galaxy'))) {
    missing.push('Galaxy')
  }
  
  // Check for product name
  if (!lowerTags.some(t => t.includes(productName.toLowerCase()))) {
    missing.push(productName)
  }
  
  // Check for AI tags (GEO Strategy emphasis)
  if (!lowerTags.some(t => t.includes('ai') || t.includes('galaxy ai'))) {
    suggestions.push('Galaxy AI', 'AI Phone')
  }
  
  return {
    valid: missing.length === 0,
    missing,
    suggestions,
  }
}
