import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

interface GroundingKeyword {
  term: string
  score: number
  sources: string[]
}

interface PerplexitySearchResult {
  title: string
  url: string
  snippet: string
  date?: string
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
      return NextResponse.json({ keywords: cached.keywords })
    }

    // Perform grounding search with Perplexity
    const keywords = await performPerplexitySearch(productName, launchDate)

    // Cache the results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('grounding_cache') as any).insert({
      product_name: cacheKey,
      keywords,
      sources: keywords.flatMap((k: GroundingKeyword) => k.sources),
    })

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('Grounding error:', error)
    return NextResponse.json(
      { error: 'Failed to perform grounding search' },
      { status: 500 }
    )
  }
}

async function performPerplexitySearch(
  productName: string,
  launchDate?: string
): Promise<GroundingKeyword[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    console.warn('Perplexity API key not configured, using mock data')
    return getMockGroundingData(productName)
  }

  try {
    // Search queries for different user intent signals
    const queries = [
      `${productName} review reddit opinions`,
      `${productName} best features highlights`,
      `${productName} comparison vs competitors`,
      `${productName} worth buying user experience`,
    ]

    const allResults: PerplexitySearchResult[] = []
    const allSources = new Set<string>()

    // Execute searches in parallel using Perplexity Search API (NOT Sonar)
    const searchPromises = queries.map(async (query) => {
      try {
        // Use proper Search API endpoint per user request
        const requestBody: Record<string, unknown> = {
          query: query,
          max_results: 10,
          max_tokens_per_page: 2048,
        }

        const response = await fetch('https://api.perplexity.ai/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (response.ok) {
          const data = await response.json()
          const results = data.results || []

          // Process search results
          results.forEach((result: { title?: string; url?: string; snippet?: string; date?: string }) => {
            // Filter by launch date if specified - only include content after launch
            if (launchDate && result.date) {
              const resultDate = new Date(result.date)
              const filterDate = new Date(launchDate)
              if (resultDate < filterDate) {
                return // Skip content before launch date
              }
            }

            if (result.url) {
              try {
                const domain = new URL(result.url).hostname.replace('www.', '')
                allSources.add(domain)
                allResults.push({
                  title: result.title || query,
                  url: result.url,
                  snippet: result.snippet || '',
                  date: result.date,
                })
              } catch {
                // Ignore invalid URLs
              }
            }
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error(`Perplexity Search API error:`, response.status, errorData)
        }
      } catch (searchError) {
        console.error(`Search error for query "${query}":`, searchError)
      }
    })

    await Promise.all(searchPromises)

    if (allResults.length === 0) {
      console.warn('No Perplexity results, using mock data')
      return getMockGroundingData(productName)
    }

    // Extract and rank keywords from search results
    const keywords = extractKeywordsFromResults(
      allResults,
      productName,
      Array.from(allSources)
    )

    return keywords
  } catch (error) {
    console.error('Perplexity search error:', error)
    return getMockGroundingData(productName)
  }
}

function extractKeywordsFromResults(
  results: PerplexitySearchResult[],
  productName: string,
  sources: string[]
): GroundingKeyword[] {
  const keywordCounts = new Map<string, { count: number; sources: Set<string> }>()

  // Common product-related terms to look for
  const relevantTerms = [
    'camera', 'battery', 'display', 'screen', 'performance', 'design',
    'ai', 'processor', 'storage', 'price', 'value', 'quality', 'speed',
    'durability', 'weight', 'size', 'features', 'software', 'ecosystem',
    'charging', 'wireless', 'audio', 'speaker', 'microphone', 'gaming',
    'premium', 'compact', 'slim', 'powerful', 'efficient', 'smart',
    'innovative', 'flagship', 'budget', 'affordable', 'waterproof',
    'foldable', 'flexible', 'durable', 'lightweight', 'portable',
  ]

  results.forEach((result) => {
    const combinedText = `${result.title} ${result.snippet}`.toLowerCase()

    relevantTerms.forEach((term) => {
      if (combinedText.includes(term.toLowerCase())) {
        const existing = keywordCounts.get(term) || { count: 0, sources: new Set<string>() }
        existing.count++

        // Add source domain
        if (result.url) {
          try {
            const domain = new URL(result.url).hostname.replace('www.', '')
            existing.sources.add(domain)
          } catch {
            // Ignore invalid URLs
          }
        }

        keywordCounts.set(term, existing)
      }
    })
  })

  // Convert to array and sort by count
  const sorted = Array.from(keywordCounts.entries())
    .map(([term, data]) => ({
      term: term.charAt(0).toUpperCase() + term.slice(1),
      score: Math.min(data.count * 12, 100),
      sources: Array.from(data.sources).slice(0, 3),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return sorted.length > 0 ? sorted : getMockGroundingData(productName)
}

function getMockGroundingData(productName: string): GroundingKeyword[] {
  // Mock data based on common Samsung product interests
  const mockData: Record<string, GroundingKeyword[]> = {
    default: [
      { term: 'Camera', score: 95, sources: ['reddit.com', 'youtube.com'] },
      { term: 'Battery Life', score: 88, sources: ['reddit.com', 'gsmarena.com'] },
      { term: 'Display Quality', score: 82, sources: ['youtube.com', 'techradar.com'] },
      { term: 'AI Features', score: 78, sources: ['reddit.com', 'theverge.com'] },
      { term: 'Performance', score: 75, sources: ['gsmarena.com', 'youtube.com'] },
      { term: 'Design', score: 70, sources: ['reddit.com', 'cnet.com'] },
      { term: 'One UI', score: 65, sources: ['reddit.com', 'xda-developers.com'] },
      { term: 'Charging Speed', score: 60, sources: ['youtube.com', 'androidauthority.com'] },
    ],
  }

  // Customize based on product type
  if (productName.toLowerCase().includes('watch')) {
    return [
      { term: 'Health Tracking', score: 95, sources: ['reddit.com', 'wareable.com'] },
      { term: 'Battery Life', score: 90, sources: ['youtube.com', 'techradar.com'] },
      { term: 'Sleep Tracking', score: 85, sources: ['reddit.com', 'wareable.com'] },
      { term: 'Design', score: 80, sources: ['youtube.com', 'cnet.com'] },
      { term: 'Fitness Features', score: 75, sources: ['reddit.com', 'tomsguide.com'] },
    ]
  }

  if (productName.toLowerCase().includes('buds')) {
    return [
      { term: 'Sound Quality', score: 95, sources: ['reddit.com', 'rtings.com'] },
      { term: 'ANC', score: 90, sources: ['youtube.com', 'soundguys.com'] },
      { term: 'Battery Life', score: 85, sources: ['reddit.com', 'techradar.com'] },
      { term: 'Comfort', score: 80, sources: ['youtube.com', 'cnet.com'] },
      { term: 'Call Quality', score: 75, sources: ['reddit.com', 'tomsguide.com'] },
    ]
  }

  return mockData.default
}
