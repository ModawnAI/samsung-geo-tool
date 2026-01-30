/**
 * Instagram Description Generator
 * Based on GEO Solution Brief Slide 4
 * "첫 125글자에 핵심메시지와 키워드(제품명/기능/브랜드명 등), CTA가 포함되는 구성"
 */

import { GoogleGenAI } from '@google/genai'
import type { InstagramDescriptionResult, ContentType } from '@/types/geo-v2'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// CTA templates based on GEO Strategy
const CTA_TEMPLATES = {
  general: [
    'Learn more at the link in bio 👆',
    'Tap the link in bio for more',
    'Discover more → link in bio',
    'Get yours → link in bio',
    'Experience it yourself 🔗',
  ],
  product_launch: [
    'Available now → link in bio',
    'Pre-order now 🚀',
    'Shop now at the link in bio',
  ],
  how_to: [
    'Try it yourself! Full guide in bio',
    'Step-by-step guide → link in bio',
  ],
  engagement: [
    'What feature are you most excited about? 💬',
    'Drop a 🔥 if you love this!',
    'Tag someone who needs to see this!',
  ],
}

// Official Samsung Instagram hashtags (Brief Slide 4)
const OFFICIAL_HASHTAGS = {
  brand: ['#Samsung', '#Galaxy'],
  ai: ['#GalaxyAI', '#AIPhone'],
  product_series: {
    s: ['#GalaxyS26', '#GalaxyS'],
    z: ['#GalaxyZ', '#GalaxyZFlip', '#GalaxyZFold'],
    ring: ['#GalaxyRing'],
    watch: ['#GalaxyWatch'],
    buds: ['#GalaxyBuds'],
  },
}

interface InstagramDescriptionInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  srtContent?: string
  briefUsps?: string[]
}

/**
 * Generate GEO-optimized Instagram description
 * First 125 characters are critical - shown before "more"
 */
export async function generateInstagramDescription(
  input: InstagramDescriptionInput
): Promise<InstagramDescriptionResult> {
  const { productName, keywords, contentType, srtContent, briefUsps } = input
  
  const prompt = `
## INSTAGRAM DESCRIPTION GENERATION (GEO Optimized)

Generate an Instagram description following Samsung's GEO guidelines.

### CRITICAL REQUIREMENT (GEO Solution Brief Slide 4)
First 125 characters MUST include:
1. Core message (hook/value prop)
2. Product name (${productName})
3. At least one feature/keyword
4. Brand mention (Samsung or Galaxy)
5. CTA (Call to Action)

This is because Instagram truncates descriptions after ~125 chars with "...more"

### INPUT
Product: ${productName}
Content Type: ${contentType}
Key Features: ${briefUsps?.join(', ') || keywords.join(', ')}
${srtContent ? `Content Context: ${srtContent.slice(0, 300)}...` : ''}

### STRUCTURE
[First 125 chars: Hook + Product + Feature + Brand + CTA]
[Extended: Detailed benefits, story, additional info]
[Hashtags at the end]

### OUTPUT FORMAT (JSON)
{
  "primary": "First 125 characters with all required elements",
  "extended": "Full description without hashtags (will be added separately)",
  "cta": "The CTA used",
  "keywordsIncluded": ["keyword1", "keyword2"]
}

Generate the description now. Make it engaging and Gen-Z friendly while staying professional.
`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text || ''
    const parsed = JSON.parse(text)
    
    const primary = parsed.primary || ''
    const extended = parsed.extended || primary
    const keywordsIncluded = parsed.keywordsIncluded || keywords
    
    // Validate the description
    const validation = validateInstagramDescription(primary, productName, keywords)
    
    return {
      primary: primary.slice(0, 125), // Ensure within limit
      extended,
      charCount: primary.length,
      validation,
    }
  } catch (error) {
    console.error('Instagram description generation error:', error)
    
    // Fallback: Generate a simple description
    return generateFallbackDescription(productName, keywords, contentType)
  }
}

/**
 * Validate Instagram description against GEO requirements
 */
function validateInstagramDescription(
  description: string,
  productName: string,
  keywords: string[]
): InstagramDescriptionResult['validation'] {
  const lowerDesc = description.toLowerCase()
  const first125 = description.slice(0, 125).toLowerCase()
  
  // Check for core message (has some engaging content)
  const hasCoreMessage = description.length >= 50 && (
    lowerDesc.includes('introducing') ||
    lowerDesc.includes('discover') ||
    lowerDesc.includes('experience') ||
    lowerDesc.includes('meet') ||
    lowerDesc.includes('new') ||
    description.includes('🔥') ||
    description.includes('✨')
  )
  
  // Check for product name in first 125
  const hasProductName = first125.includes(productName.toLowerCase()) ||
    first125.includes('galaxy') ||
    first125.includes('s26') ||
    first125.includes('z flip') ||
    first125.includes('z fold')
  
  // Check for feature/keyword in first 125
  const hasFeatureName = keywords.some(k => 
    first125.includes(k.toLowerCase())
  ) || first125.includes('ai') || first125.includes('camera')
  
  // Check for brand mention in first 125
  const hasBrandName = first125.includes('samsung') || first125.includes('galaxy')
  
  // Check for CTA
  const hasCTA = 
    lowerDesc.includes('link in bio') ||
    lowerDesc.includes('tap') ||
    lowerDesc.includes('click') ||
    lowerDesc.includes('discover') ||
    lowerDesc.includes('learn more') ||
    lowerDesc.includes('get yours') ||
    lowerDesc.includes('shop now') ||
    lowerDesc.includes('?') || // Questions are engagement CTAs
    description.includes('👆') ||
    description.includes('🔗')
  
  // Find which keywords were included
  const keywordsFound = keywords.filter(k => 
    lowerDesc.includes(k.toLowerCase())
  )
  
  return {
    hasCoreMessage,
    hasProductName,
    hasFeatureName,
    hasBrandName,
    hasCTA,
    keywordsFound,
  }
}

/**
 * Generate fallback description
 */
function generateFallbackDescription(
  productName: string,
  keywords: string[],
  contentType: ContentType
): InstagramDescriptionResult {
  const feature = keywords[0] || 'Galaxy AI'
  
  let primary: string
  let extended: string
  
  switch (contentType) {
    case 'intro':
      primary = `Meet the ${productName} with ${feature}. Samsung's latest innovation is here. Tap the link in bio 👆`
      extended = `${primary}\n\nExperience the future of mobile technology with ${productName}. ${feature} takes everything you love about Galaxy to the next level.`
      break
    case 'unboxing':
      primary = `Unboxing the ${productName}! 📦 ${feature} and more inside. What do you want to see? 👇`
      extended = `${primary}\n\nFirst impressions of the new ${productName}. Everything from the premium packaging to the ${feature} that makes this a game-changer.`
      break
    case 'how_to':
      primary = `How to use ${feature} on ${productName} 🎯 Full guide → link in bio!`
      extended = `${primary}\n\nStep-by-step guide to mastering ${feature} on your ${productName}. These tips will change how you use your phone.`
      break
    default:
      primary = `${productName} with ${feature} ✨ Samsung innovation at its finest. Learn more → bio 🔗`
      extended = `${primary}\n\nDiscover what makes ${productName} special. ${feature} is just the beginning.`
  }
  
  return {
    primary: primary.slice(0, 125),
    extended,
    charCount: primary.length,
    validation: validateInstagramDescription(primary, productName, keywords),
  }
}

/**
 * Generate engagement-optimized captions for different post types
 */
export function generateEngagementCaptions(
  productName: string,
  contentType: ContentType
): string[] {
  const captions = []
  
  switch (contentType) {
    case 'intro':
      captions.push(
        `The wait is over. Meet ${productName}. Which feature are you most excited about? 👇`,
        `${productName} is here and it's everything. What's your first reaction? 💬`,
      )
      break
    case 'how_to':
      captions.push(
        `Save this for later! 🔖 The ${productName} tip you didn't know you needed.`,
        `Did you know your ${productName} could do THIS? Mind = blown 🤯`,
      )
      break
    default:
      captions.push(
        `${productName} things ✨ Drop a 🔥 if you're loving this!`,
        `Galaxy AI + ${productName} = unmatched. Agree? 👀`,
      )
  }
  
  return captions
}
