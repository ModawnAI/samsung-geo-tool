import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { getSourceTier } from '@/lib/geo-v2/grounding-scorer'

interface GroundingKeyword {
  term: string
  score: number
  sources: Array<{
    uri: string
    title: string
    tier: 1 | 2 | 3 | 4
  }>
}

interface PerplexityCitation {
  url: string
  title?: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  citations?: string[] | PerplexityCitation[]
}

type GroundingCacheRow = Tables<'grounding_cache'>

export async function POST(request: NextRequest) {
  try {
    const { productName, launchDate } = await request.json()

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check cache first (include launchDate in cache key logic)
    const cacheKey = launchDate
      ? `${productName}_${new Date(launchDate).toISOString().split('T')[0]}`
      : productName

    const { data } = await supabase
      .from('grounding_cache')
      .select('*')
      .eq('product_name', cacheKey)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const cached = data as GroundingCacheRow | null

    if (cached) {
      console.log(`[Grounding] 캐시 HIT: ${cacheKey}`)
      return NextResponse.json({
        keywords: cached.keywords,
        sources: cached.sources,
        cached: true,
      })
    }

    console.log(`[Grounding] 캐시 MISS - Perplexity API 호출 중: ${productName}`)

    // Perform grounding search with Perplexity Sonar
    const result = await performPerplexitySonarSearch(productName, launchDate)

    // Cache the results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('grounding_cache') as any).insert({
      product_name: cacheKey,
      keywords: result.keywords,
      sources: result.allSources,
    })

    return NextResponse.json({
      keywords: result.keywords,
      sources: result.allSources,
      cached: false,
    })
  } catch (error) {
    console.error('[Grounding] 오류:', error)
    return NextResponse.json(
      { error: 'Failed to perform grounding search' },
      { status: 500 }
    )
  }
}

/**
 * Perform grounding search using Perplexity Sonar API (chat/completions)
 * Sonar models have built-in web search and return citations
 */
async function performPerplexitySonarSearch(
  productName: string,
  launchDate?: string
): Promise<{
  keywords: GroundingKeyword[]
  allSources: Array<{ uri: string; title: string; tier: 1 | 2 | 3 | 4 }>
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    console.warn('[Grounding] Perplexity API 키 미설정, 목 데이터 사용')
    return {
      keywords: getMockGroundingData(productName),
      allSources: [],
    }
  }

  try {
    // Search queries for different user intent signals
    const queries = [
      `What are users saying about ${productName}? What are the most discussed features and topics in reviews and forums?`,
      `What are the main highlights and concerns about ${productName} from tech reviews and user feedback?`,
      `What are the key comparisons between ${productName} and its competitors? What features stand out?`,
    ]

    const allSources: Array<{ uri: string; title: string; tier: 1 | 2 | 3 | 4 }> = []
    const seenUrls = new Set<string>()
    const keywordCounts = new Map<string, { count: number; sources: Array<{ uri: string; title: string; tier: 1 | 2 | 3 | 4 }> }>()

    // Execute searches in parallel using Perplexity chat/completions with Sonar
    const searchPromises = queries.map(async (query) => {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar', // Sonar model with built-in web search
            messages: [
              {
                role: 'system',
                content: `You are a product research analyst. Extract key topics, features, and user interests about the product. Focus on identifying what users care about most. Be concise and factual.${launchDate ? ` Only consider content from after ${launchDate}.` : ''}`,
              },
              {
                role: 'user',
                content: query,
              },
            ],
            max_tokens: 1024,
            temperature: 0.2,
            return_citations: true, // Request citations to be returned
            search_recency_filter: launchDate ? 'month' : 'year', // Filter by recency
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Grounding] Perplexity API 오류 (${response.status}):`, errorText)
          return null
        }

        const data: PerplexityResponse = await response.json()

        // Extract citations/sources
        if (data.citations && Array.isArray(data.citations)) {
          for (const citation of data.citations) {
            let url: string
            let title: string

            if (typeof citation === 'string') {
              url = citation
              title = extractTitleFromUrl(citation)
            } else {
              url = citation.url
              title = citation.title || extractTitleFromUrl(citation.url)
            }

            if (!seenUrls.has(url)) {
              seenUrls.add(url)
              const tier = getSourceTier(url)
              allSources.push({ uri: url, title, tier })
            }
          }
        }

        // Extract content for keyword analysis
        const content = data.choices?.[0]?.message?.content || ''
        return { content, citations: data.citations || [] }
      } catch (searchError) {
        console.error(`[Grounding] 검색 오류:`, searchError)
        return null
      }
    })

    const results = await Promise.all(searchPromises)
    const validResults = results.filter((r): r is { content: string; citations: string[] | PerplexityCitation[] } => r !== null)

    console.log(`[Grounding] Perplexity 응답 ${validResults.length}/${queries.length}개, 소스 ${allSources.length}개`)

    if (validResults.length === 0) {
      console.warn('[Grounding] Perplexity 결과 없음, 목 데이터 사용')
      return {
        keywords: getMockGroundingData(productName),
        allSources: [],
      }
    }

    // Extract keywords from all content
    const combinedContent = validResults.map(r => r.content).join(' ')
    extractKeywordsFromContent(combinedContent, productName, allSources, keywordCounts)

    // Convert to sorted keywords array
    const keywords = Array.from(keywordCounts.entries())
      .map(([term, data]) => ({
        term: term.charAt(0).toUpperCase() + term.slice(1),
        score: Math.min(data.count * 15, 100),
        sources: data.sources.slice(0, 5),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)

    // Sort allSources by tier (best first)
    allSources.sort((a, b) => a.tier - b.tier)

    return {
      keywords: keywords.length > 0 ? keywords : getMockGroundingData(productName),
      allSources,
    }
  } catch (error) {
    console.error('[Grounding] Perplexity 검색 오류:', error)
    return {
      keywords: getMockGroundingData(productName),
      allSources: [],
    }
  }
}

/**
 * Extract keywords from content and associate with sources
 */
function extractKeywordsFromContent(
  content: string,
  productName: string,
  sources: Array<{ uri: string; title: string; tier: 1 | 2 | 3 | 4 }>,
  keywordCounts: Map<string, { count: number; sources: Array<{ uri: string; title: string; tier: 1 | 2 | 3 | 4 }> }>
): void {
  // Common product-related terms to look for (English and Korean)
  const relevantTerms = [
    // Hardware
    'camera', 'battery', 'display', 'screen', 'performance', 'design',
    'processor', 'storage', 'charging', 'wireless', 'audio', 'speaker',
    'durability', 'weight', 'size', 'build quality',
    // Software/Features
    'ai', 'galaxy ai', 'software', 'one ui', 'features', 'update',
    // Value
    'price', 'value', 'premium', 'flagship', 'budget', 'affordable',
    // Use cases
    'gaming', 'photography', 'video', 'productivity', 'multitasking',
    // Comparison terms
    'comparison', 'vs', 'better', 'best', 'improvement', 'upgrade',
    // Form factors
    'foldable', 'compact', 'slim', 'lightweight', 'portable',
    // Korean terms
    '카메라', '배터리', '디스플레이', '성능', '가격', '디자인',
    '폴더블', 'AI 기능', '갤럭시 AI',
  ]

  const lowerContent = content.toLowerCase()

  for (const term of relevantTerms) {
    const termLower = term.toLowerCase()
    const occurrences = (lowerContent.match(new RegExp(termLower, 'gi')) || []).length

    if (occurrences > 0) {
      const existing = keywordCounts.get(term) || { count: 0, sources: [] }
      existing.count += occurrences

      // Associate top sources with this keyword (prefer higher tier)
      const sortedSources = [...sources].sort((a, b) => a.tier - b.tier)
      for (const source of sortedSources.slice(0, 3)) {
        if (!existing.sources.some(s => s.uri === source.uri)) {
          existing.sources.push(source)
        }
      }

      keywordCounts.set(term, existing)
    }
  }

  // Also check for product-specific terms in the product name
  const productTerms = productName.toLowerCase().split(/\s+/)
  for (const term of productTerms) {
    if (term.length > 2 && !['the', 'and', 'for'].includes(term)) {
      const occurrences = (lowerContent.match(new RegExp(term, 'gi')) || []).length
      if (occurrences > 2) {
        const existing = keywordCounts.get(term) || { count: 0, sources: [] }
        existing.count += Math.floor(occurrences / 2) // Lower weight for product terms
        keywordCounts.set(term, existing)
      }
    }
  }
}

/**
 * Extract a readable title from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    const path = urlObj.pathname.split('/').filter(Boolean).slice(0, 2).join(' - ')
    return path ? `${hostname}: ${path}` : hostname
  } catch {
    return url
  }
}

/**
 * Mock data for when API is unavailable
 */
function getMockGroundingData(productName: string): GroundingKeyword[] {
  const baseSources = [
    { uri: 'https://www.gsmarena.com', title: 'GSMArena Review', tier: 2 as const },
    { uri: 'https://www.reddit.com/r/GalaxyS', title: 'Reddit Galaxy Community', tier: 3 as const },
    { uri: 'https://www.youtube.com/watch', title: 'YouTube Tech Review', tier: 3 as const },
  ]

  // Mock data based on common Samsung product interests
  const mockData: Record<string, GroundingKeyword[]> = {
    default: [
      { term: 'Camera', score: 95, sources: baseSources },
      { term: 'Battery Life', score: 88, sources: baseSources },
      { term: 'Display Quality', score: 82, sources: baseSources },
      { term: 'AI Features', score: 78, sources: baseSources },
      { term: 'Performance', score: 75, sources: baseSources },
      { term: 'Design', score: 70, sources: baseSources },
      { term: 'One UI', score: 65, sources: baseSources },
      { term: 'Charging Speed', score: 60, sources: baseSources },
    ],
  }

  // Customize based on product type
  if (productName.toLowerCase().includes('watch')) {
    return [
      { term: 'Health Tracking', score: 95, sources: baseSources },
      { term: 'Battery Life', score: 90, sources: baseSources },
      { term: 'Sleep Tracking', score: 85, sources: baseSources },
      { term: 'Design', score: 80, sources: baseSources },
      { term: 'Fitness Features', score: 75, sources: baseSources },
    ]
  }

  if (productName.toLowerCase().includes('buds')) {
    return [
      { term: 'Sound Quality', score: 95, sources: baseSources },
      { term: 'ANC', score: 90, sources: baseSources },
      { term: 'Battery Life', score: 85, sources: baseSources },
      { term: 'Comfort', score: 80, sources: baseSources },
      { term: 'Call Quality', score: 75, sources: baseSources },
    ]
  }

  if (productName.toLowerCase().includes('fold') || productName.toLowerCase().includes('flip')) {
    return [
      { term: 'Foldable Display', score: 95, sources: baseSources },
      { term: 'Durability', score: 90, sources: baseSources },
      { term: 'Camera', score: 85, sources: baseSources },
      { term: 'Multitasking', score: 80, sources: baseSources },
      { term: 'Battery Life', score: 75, sources: baseSources },
      { term: 'Portability', score: 70, sources: baseSources },
    ]
  }

  return mockData.default
}
