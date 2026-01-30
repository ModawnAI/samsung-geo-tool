/**
 * YouTube Title Generator
 * Based on GEO Strategy p.100 - Samsung Title Structure
 * 
 * Structure: [Primary Keyword] | [Feature/Benefit] | [Product Name] | Samsung
 * Max: 60 characters
 */

import { GoogleGenAI } from '@google/genai'
import type { 
  YouTubeTitleResult, 
  ContentType, 
  SAMSUNG_TITLE_TEMPLATES 
} from '@/types/geo-v2'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Samsung title templates based on content type (GEO Strategy p.100)
const TITLE_TEMPLATES: Record<ContentType, string> = {
  intro: '[Product Name] | [Key Feature] | Samsung',
  unboxing: '[Product Name] Unboxing | [Highlight] | Samsung',
  how_to: 'How to [Action] on [Product Name] | Samsung',
  shorts: '[Hook] | [Product Name]',  // Shorts don't need Samsung suffix
  teaser: '[Product Name] | Coming Soon | Samsung',
  brand: '[Campaign Message] | [Product Name] | Samsung',
  esg: '[ESG Topic] | Samsung Sustainability',
  documentary: '[Documentary Title] | [Product Name] | Samsung',
  official_replay: '[Event Name] Replay | [Product Name] | Samsung',
}

// Primary keywords from GEO Strategy
const PRIMARY_KEYWORDS = [
  'Galaxy AI',
  'AI Phone',
  'Galaxy S26',
  'Galaxy S26 Ultra',
  'Galaxy Z Flip',
  'Galaxy Z Fold',
  'Galaxy Ring',
  'Galaxy Watch',
  'Galaxy Buds',
]

interface TitleGenerationInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  srtContent?: string
  briefUsps?: string[]
}

/**
 * Generate GEO-optimized YouTube title
 * Based on Brief Slide 3: "영상/링크 및 카피 입력 시 적절한 타이틀 제안 가능 여부"
 */
export async function generateYouTubeTitle(
  input: TitleGenerationInput
): Promise<YouTubeTitleResult> {
  const { productName, keywords, contentType, srtContent, briefUsps } = input
  
  const template = TITLE_TEMPLATES[contentType]
  
  const prompt = `
## YOUTUBE TITLE GENERATION (Samsung Standard)

You are generating a GEO-optimized YouTube title for Samsung content.

### SAMSUNG TITLE STRUCTURE (CRITICAL - from GEO Strategy p.100)
${template}

### RULES
1. Maximum 60 characters for optimal display
2. Place primary keyword (product name or feature) at the BEGINNING
3. Include at least one key feature/benefit
4. End with "Samsung" for brand consistency (except Shorts)
5. Use "|" as separator (with spaces around it)
6. Make it compelling and click-worthy while staying factual

### INPUT DATA
Product: ${productName}
Content Type: ${contentType}
Key Features/USPs: ${briefUsps?.join(', ') || keywords.join(', ')}
${srtContent ? `Content Context (from SRT): ${srtContent.slice(0, 500)}...` : ''}

### OUTPUT FORMAT (JSON)
{
  "primary": "Main recommended title (≤60 chars)",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "keywords": ["keyword1", "keyword2"],
  "reasoning": "Brief explanation of keyword placement"
}

Generate the title now. Be creative but follow Samsung's brand guidelines.
`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text || ''
    const parsed = JSON.parse(text)
    
    const primary = parsed.primary || ''
    const alternatives = parsed.alternatives || []
    const extractedKeywords = parsed.keywords || keywords
    
    // Validate the title
    const validation = validateTitle(primary, productName, contentType)
    
    return {
      primary,
      alternatives,
      keywords: extractedKeywords,
      charCount: primary.length,
      validation,
    }
  } catch (error) {
    console.error('Title generation error:', error)
    
    // Fallback: Generate a simple title based on template
    const fallbackTitle = generateFallbackTitle(productName, keywords, contentType)
    
    return {
      primary: fallbackTitle,
      alternatives: [],
      keywords,
      charCount: fallbackTitle.length,
      validation: validateTitle(fallbackTitle, productName, contentType),
    }
  }
}

/**
 * Validate title against Samsung standards
 */
function validateTitle(
  title: string, 
  productName: string, 
  contentType: ContentType
): YouTubeTitleResult['validation'] {
  const lowerTitle = title.toLowerCase()
  const lowerProduct = productName.toLowerCase()
  
  // Check keyword position
  let keywordPosition: 'front' | 'middle' | 'back' = 'middle'
  const firstSection = title.split('|')[0]?.trim() || ''
  
  if (
    firstSection.toLowerCase().includes(lowerProduct) ||
    PRIMARY_KEYWORDS.some(kw => firstSection.toLowerCase().includes(kw.toLowerCase()))
  ) {
    keywordPosition = 'front'
  } else if (title.split('|').pop()?.toLowerCase().includes(lowerProduct)) {
    keywordPosition = 'back'
  }
  
  // Check if ends with Samsung (not required for Shorts)
  const hasBrandSuffix = contentType === 'shorts' || lowerTitle.includes('samsung')
  
  // Check structure (should have at least 2 sections)
  const sections = title.split('|')
  const structureValid = sections.length >= 2 && (contentType === 'shorts' || sections.length >= 3)
  
  return {
    structureValid,
    keywordPosition,
    hasBrandSuffix,
    withinLimit: title.length <= 60,
  }
}

/**
 * Generate fallback title if AI fails
 */
function generateFallbackTitle(
  productName: string,
  keywords: string[],
  contentType: ContentType
): string {
  const feature = keywords[0] || 'Features'
  
  switch (contentType) {
    case 'intro':
      return `${productName} | ${feature} | Samsung`.slice(0, 60)
    case 'unboxing':
      return `${productName} Unboxing | ${feature} | Samsung`.slice(0, 60)
    case 'how_to':
      return `How to Use ${feature} | ${productName} | Samsung`.slice(0, 60)
    case 'shorts':
      return `${feature} | ${productName}`.slice(0, 60)
    default:
      return `${productName} | ${feature} | Samsung`.slice(0, 60)
  }
}

/**
 * Generate multiple title variations for A/B testing
 */
export async function generateTitleVariations(
  input: TitleGenerationInput,
  count: number = 3
): Promise<YouTubeTitleResult[]> {
  const results: YouTubeTitleResult[] = []
  
  // Generate primary title
  const primary = await generateYouTubeTitle(input)
  results.push(primary)
  
  // Return primary with its alternatives as additional results
  for (const alt of primary.alternatives.slice(0, count - 1)) {
    results.push({
      primary: alt,
      alternatives: [],
      keywords: primary.keywords,
      charCount: alt.length,
      validation: validateTitle(alt, input.productName, input.contentType),
    })
  }
  
  return results
}
