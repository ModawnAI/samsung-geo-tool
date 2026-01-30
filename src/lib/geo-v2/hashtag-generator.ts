/**
 * Enhanced Hashtag Generator
 * Based on GEO Solution Brief Slide 4
 * Order: #GalaxyAI → #ProductName → #ProductSeries → #Samsung
 */

import { GoogleGenAI } from '@google/genai'
import type { 
  EnhancedHashtagResult, 
  ContentType, 
  Platform,
  OFFICIAL_SAMSUNG_HASHTAGS 
} from '@/types/geo-v2'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Official Samsung hashtags (must always include)
const OFFICIAL_HASHTAGS = [
  '#Samsung',
  '#Galaxy',
  '#GalaxyAI',
] as const

// Product-specific hashtags
const PRODUCT_HASHTAGS: Record<string, string[]> = {
  's26': ['#GalaxyS26', '#GalaxyS26Ultra', '#GalaxyS26Plus', '#S26'],
  's25': ['#GalaxyS25', '#GalaxyS25Ultra', '#GalaxyS25Plus', '#S25'],
  'zflip': ['#GalaxyZFlip', '#GalaxyZFlip7', '#ZFlip', '#Foldable'],
  'zfold': ['#GalaxyZFold', '#GalaxyZFold7', '#ZFold', '#Foldable'],
  'ring': ['#GalaxyRing', '#SmartRing', '#Wearable'],
  'watch': ['#GalaxyWatch', '#GalaxyWatch7', '#SmartWatch', '#Wearable'],
  'buds': ['#GalaxyBuds', '#GalaxyBuds3', '#TWS', '#WirelessEarbuds'],
}

// Feature hashtags (GEO-effective based on Strategy)
const FEATURE_HASHTAGS = [
  '#AIPhone',
  '#AICamera',
  '#AIFeatures',
  '#ProCamera',
  '#NightMode',
  '#ProVisualEngine',
  '#NowBar',
  '#NowBrief',
  '#CircleToSearch',
  '#LiveTranslate',
  '#NoteAssist',
  '#BrowsingAssist',
]

// GEO-effective hashtags (high search volume from Strategy p.101)
const GEO_EFFECTIVE_HASHTAGS = [
  '#AIPhone',
  '#GalaxyAI',
  '#SmartphonePhotography',
  '#TechReview',
  '#Unboxing',
  '#AndroidPhone',
  '#FlagshipPhone',
  '#MobilePhotography',
]

// Platform-specific limits
const PLATFORM_LIMITS: Record<Platform, { min: number; max: number; recommended: number }> = {
  youtube: { min: 3, max: 15, recommended: 5 },
  instagram: { min: 3, max: 30, recommended: 10 },
  tiktok: { min: 3, max: 10, recommended: 5 },
}

interface HashtagInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  platform: Platform
  fixedHashtags?: string[]
  useFixedHashtags?: boolean
}

/**
 * Generate GEO-optimized hashtags with proper ordering
 * Order: #GalaxyAI → #ProductName → #ProductSeries → #Samsung (per Strategy)
 */
export async function generateEnhancedHashtags(
  input: HashtagInput
): Promise<EnhancedHashtagResult> {
  const { productName, keywords, contentType, platform, fixedHashtags, useFixedHashtags } = input
  
  // If using fixed hashtags, validate and return
  if (useFixedHashtags && fixedHashtags && fixedHashtags.length > 0) {
    return validateAndOrderHashtags(fixedHashtags, productName, platform)
  }
  
  const limits = PLATFORM_LIMITS[platform]
  
  const prompt = `
## HASHTAG GENERATION (GEO/SEO Optimized)

Generate hashtags for Samsung ${platform} content.

### ORDERING RULE (CRITICAL - GEO Strategy)
1. #GalaxyAI (if AI features present)
2. #ProductName (e.g., #GalaxyS26Ultra)
3. #ProductSeries (e.g., #GalaxyS26)
4. Feature hashtags
5. #Samsung (always last)

### INPUT
Product: ${productName}
Platform: ${platform}
Content Type: ${contentType}
Keywords/Features: ${keywords.join(', ')}
Limit: ${limits.recommended} hashtags (min ${limits.min}, max ${limits.max})

### REQUIREMENTS
1. Always include official hashtags: #Samsung, #Galaxy
2. Include product-specific hashtag
3. Include at least 1-2 GEO-effective hashtags for discoverability
4. Match content type (e.g., #Unboxing for unboxing content)
5. Maintain proper order

### OUTPUT FORMAT (JSON)
{
  "hashtags": ["#GalaxyAI", "#GalaxyS26Ultra", ..., "#Samsung"],
  "official": ["#Samsung", "#Galaxy"],
  "product": ["#GalaxyS26Ultra"],
  "feature": ["#AIPhone"],
  "geoEffective": ["#TechReview"],
  "reasoning": "Brief explanation"
}

Generate hashtags now.
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
    
    let hashtags = parsed.hashtags || []
    
    // Ensure proper formatting
    hashtags = hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`)
    
    // Ensure #Samsung is last
    hashtags = reorderHashtags(hashtags)
    
    // Validate
    const validation = validateHashtags(hashtags, productName)
    
    return {
      hashtags,
      validation,
      recommendations: {
        add: validation.officialIncluded.length < 2 ? ['#Samsung', '#Galaxy'] : [],
        remove: [],
      },
    }
  } catch (error) {
    console.error('Hashtag generation error:', error)
    return generateFallbackHashtags(productName, keywords, contentType, platform)
  }
}

/**
 * Reorder hashtags according to Samsung standard
 * #GalaxyAI → #ProductName → #ProductSeries → Feature → #Samsung
 */
function reorderHashtags(hashtags: string[]): string[] {
  const result: string[] = []
  const remaining = [...hashtags]
  
  // 1. #GalaxyAI first (if present)
  const aiIndex = remaining.findIndex(h => h.toLowerCase() === '#galaxyai')
  if (aiIndex !== -1) {
    result.push(remaining.splice(aiIndex, 1)[0])
  }
  
  // 2. Product name hashtags
  const productHashtags = remaining.filter(h => 
    h.toLowerCase().includes('galaxy') && 
    (h.toLowerCase().includes('s26') || h.toLowerCase().includes('s25') ||
     h.toLowerCase().includes('flip') || h.toLowerCase().includes('fold') ||
     h.toLowerCase().includes('ring') || h.toLowerCase().includes('watch') ||
     h.toLowerCase().includes('buds'))
  )
  for (const ph of productHashtags) {
    const idx = remaining.indexOf(ph)
    if (idx !== -1) {
      result.push(remaining.splice(idx, 1)[0])
    }
  }
  
  // 3. Remove #Samsung from remaining (will add at end)
  const samsungIndex = remaining.findIndex(h => h.toLowerCase() === '#samsung')
  let samsungTag = '#Samsung'
  if (samsungIndex !== -1) {
    samsungTag = remaining.splice(samsungIndex, 1)[0]
  }
  
  // 4. Add remaining tags
  result.push(...remaining)
  
  // 5. Add #Samsung last
  result.push(samsungTag)
  
  return result
}

/**
 * Validate hashtags against requirements
 */
function validateHashtags(
  hashtags: string[],
  productName: string
): EnhancedHashtagResult['validation'] {
  const lowerHashtags = hashtags.map(h => h.toLowerCase())
  
  // Check for official hashtags
  const officialIncluded = OFFICIAL_HASHTAGS.filter(oh => 
    lowerHashtags.includes(oh.toLowerCase())
  ) as string[]
  
  // Check for GEO-effective hashtags
  const geoOptimized = GEO_EFFECTIVE_HASHTAGS.filter(gh =>
    lowerHashtags.some(h => h.toLowerCase() === gh.toLowerCase())
  )
  
  // Check order (Samsung should be last)
  const lastHashtag = hashtags[hashtags.length - 1]
  const orderCorrect = lastHashtag?.toLowerCase() === '#samsung'
  
  return {
    officialIncluded,
    geoOptimized,
    totalCount: hashtags.length,
    orderCorrect,
  }
}

/**
 * Validate and order existing hashtags
 */
function validateAndOrderHashtags(
  hashtags: string[],
  productName: string,
  platform: Platform
): EnhancedHashtagResult {
  const ordered = reorderHashtags(hashtags)
  const validation = validateHashtags(ordered, productName)
  
  const limits = PLATFORM_LIMITS[platform]
  const recommendations: { add: string[]; remove: string[] } = { add: [], remove: [] }
  
  // Check if missing official hashtags
  if (!validation.officialIncluded.includes('#Samsung')) {
    recommendations.add.push('#Samsung')
  }
  if (!validation.officialIncluded.includes('#Galaxy')) {
    recommendations.add.push('#Galaxy')
  }
  
  // Check if over limit
  if (ordered.length > limits.max) {
    recommendations.remove.push(...ordered.slice(limits.max))
  }
  
  return {
    hashtags: ordered.slice(0, limits.max),
    validation,
    recommendations,
  }
}

/**
 * Generate fallback hashtags
 */
function generateFallbackHashtags(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  platform: Platform
): EnhancedHashtagResult {
  const hashtags: string[] = []
  const limits = PLATFORM_LIMITS[platform]
  
  // 1. #GalaxyAI if AI-related keywords
  if (keywords.some(k => k.toLowerCase().includes('ai'))) {
    hashtags.push('#GalaxyAI')
  }
  
  // 2. Product hashtag
  const lowerProduct = productName.toLowerCase()
  for (const [key, tags] of Object.entries(PRODUCT_HASHTAGS)) {
    if (lowerProduct.includes(key)) {
      hashtags.push(tags[0])
      break
    }
  }
  if (hashtags.length < 2) {
    hashtags.push(`#${productName.replace(/\s+/g, '')}`)
  }
  
  // 3. #Galaxy
  hashtags.push('#Galaxy')
  
  // 4. Content type specific
  if (contentType === 'unboxing') hashtags.push('#Unboxing')
  if (contentType === 'how_to') hashtags.push('#HowTo')
  
  // 5. Feature hashtags
  hashtags.push('#AIPhone')
  
  // 6. GEO-effective
  hashtags.push('#SmartphonePhotography')
  
  // 7. #Samsung last
  hashtags.push('#Samsung')
  
  // Trim to limit
  const finalHashtags = hashtags.slice(0, limits.recommended)
  
  return {
    hashtags: finalHashtags,
    validation: validateHashtags(finalHashtags, productName),
    recommendations: { add: [], remove: [] },
  }
}

/**
 * Get platform-specific hashtag recommendations
 */
export function getPlatformHashtagGuide(platform: Platform): {
  limits: typeof PLATFORM_LIMITS[Platform]
  tips: string[]
} {
  const limits = PLATFORM_LIMITS[platform]
  
  const tips: string[] = []
  
  switch (platform) {
    case 'youtube':
      tips.push(
        'Use 3-5 hashtags in the description',
        'Place primary hashtags at the beginning',
        '#Samsung should be included for brand consistency',
      )
      break
    case 'instagram':
      tips.push(
        'Use 8-15 hashtags for optimal reach',
        'Mix popular and niche hashtags',
        'Place hashtags at the end of caption or in first comment',
        '#GalaxyAI should be first if content features AI',
      )
      break
    case 'tiktok':
      tips.push(
        'Use 3-5 hashtags maximum',
        'Focus on trending and discoverable hashtags',
        'Include product-specific hashtag',
      )
      break
  }
  
  return { limits, tips }
}
