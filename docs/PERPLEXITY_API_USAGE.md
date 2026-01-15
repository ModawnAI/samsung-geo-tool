# Perplexity Search API Usage in Samsung GEO Tool

## Overview

The Samsung GEO Tool uses the **Perplexity Search API** for **real-time grounding signals** - fetching current user intent data from web searches to inform content generation. This enables the tool to create content that addresses actual user interests and trending topics.

## API Configuration

```env
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx
```

## API Endpoint

```
POST https://api.perplexity.ai/search
```

## Request Format

```typescript
interface PerplexitySearchRequest {
  query: string           // Search query string
  max_results: number     // Maximum number of results (5-10)
  max_tokens_per_page: number  // Token limit per page (512-2048)
}
```

## Usage Locations

The Perplexity API is used in **3 main files**:

| File | Purpose |
|------|---------|
| `src/app/api/grounding/route.ts` | Dedicated grounding endpoint |
| `src/app/api/generate-v2/route.ts` | V2 generation pipeline |
| `src/app/api/generate/route.ts` | V1 generation pipeline |

---

## 1. Grounding API Route (`/api/grounding/route.ts`)

### Full Code

```typescript
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
```

---

## 2. Generate V2 Route (`/api/generate-v2/route.ts`)

### Perplexity Grounding Function

```typescript
/**
 * Fetch grounding signals from Perplexity
 */
async function fetchPerplexityGroundingSignals(
  productName: string,
  keywords: string[]
): Promise<Array<{ title?: string; snippet?: string; url?: string; date?: string }>> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      console.warn('[Perplexity Grounding] No API key')
      return []
    }

    const queries = [
      `${productName} reviews 2024 2025`,
      `${productName} features specifications`,
      `${productName} ${keywords[0] || 'camera'} performance`,
    ]

    const results = await Promise.all(
      queries.map(query =>
        fetch('https://api.perplexity.ai/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            max_results: 5,
            max_tokens_per_page: 512,
          }),
        })
          .then(r => r.ok ? r.json() : { results: [] })
          .then(d => d.results || [])
          .catch(() => [])
      )
    )

    const allResults = results.flat()
    console.log(`[Perplexity Grounding] Fetched ${allResults.length} results`)
    return allResults
  } catch (error) {
    console.error('[Perplexity Grounding] Failed:', error)
    return []
  }
}
```

### Combined Grounding Function (Google + Perplexity)

```typescript
/**
 * Fetch grounding signals from multiple sources (Google + Perplexity)
 * @param enhanced - When true, performs deeper search with more queries for regeneration
 */
async function fetchGroundingSignals(
  productName: string,
  keywords: string[],
  launchDate?: string,
  enhanced?: boolean
): Promise<GroundingSignal[]> {
  try {
    // Enhanced mode: use more keywords and additional search variations
    const searchKeywords = enhanced
      ? [...keywords, `${productName} specifications`, `${productName} features`, `${productName} review`]
      : keywords

    // Fetch from both sources in parallel
    const [googleResults, perplexityResults] = await Promise.all([
      fetchGoogleGroundingSignals(productName, searchKeywords),
      fetchPerplexityGroundingSignals(productName, searchKeywords),
    ])

    const allResults = [...googleResults, ...perplexityResults]

    if (allResults.length === 0) {
      console.warn('[Grounding] No results from any source, using fallback')
      return generateFallbackSignals(productName, keywords)
    }

    console.log(`[Grounding] Combined ${allResults.length} results from Google (${googleResults.length}) + Perplexity (${perplexityResults.length})${enhanced ? ' [ENHANCED]' : ''}`)
    return extractSignalsFromResults(allResults, keywords)
  } catch (error) {
    console.error('[Grounding] Failed:', error)
    return generateFallbackSignals(productName, keywords)
  }
}
```

---

## 3. Generate V1 Route (`/api/generate/route.ts`)

### Main Grounding Function

```typescript
/**
 * Fetch grounding signals from Perplexity Search API
 * ENHANCED: Multiple parallel queries for richer signals
 * Returns user intent signals based on current search trends
 */
async function fetchGroundingSignals(
  productName: string,
  keywords: string[],
  launchDate?: string
): Promise<GroundingSignal[]> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      console.warn('[Grounding] No Perplexity API key, skipping grounding')
      return []
    }

    // ENHANCEMENT: Multiple query types for comprehensive signals
    const groundingQueries = [
      // Core product queries
      `${productName} reviews opinions 2024 2025`,
      // Competitor comparison
      `${productName} vs iPhone vs Pixel comparison`,
      // Trending features
      `${productName} best features what users love`,
      // Common questions (FAQ signals)
      `${productName} common questions problems issues`,
      // Use case queries
      `${productName} ${keywords[0] || 'camera'} real world performance`,
    ]

    // Execute all queries in parallel
    const queryPromises = groundingQueries.map(query =>
      fetchSingleGroundingQuery(apiKey, query).catch(() => [])
    )

    const allResults = await Promise.all(queryPromises)
    const combinedResults = allResults.flat()

    console.log(`[Grounding] Fetched ${combinedResults.length} results from ${groundingQueries.length} queries`)

    // Filter by launch date if provided
    const filteredResults = launchDate
      ? combinedResults.filter((r: { date?: string }) => !r.date || new Date(r.date) >= new Date(launchDate))
      : combinedResults

    // Extract and score signals from search results
    const signals = extractSignalsFromResults(filteredResults, keywords)

    return signals.slice(0, 15) // Top 15 signals (increased from 10)
  } catch (error) {
    console.error('[Grounding] Failed to fetch grounding signals:', error)
    return []
  }
}
```

### Single Query Execution

```typescript
/**
 * Execute a single grounding query
 */
async function fetchSingleGroundingQuery(
  apiKey: string,
  query: string
): Promise<Array<{ title?: string; snippet?: string; url?: string; date?: string }>> {
  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      max_tokens_per_page: 512,
    }),
  })

  if (!response.ok) {
    console.error(`[Grounding] Query failed: "${query.slice(0, 30)}..." - ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.results || []
}
```

### Signal Extraction from Results

```typescript
/**
 * Extract user intent signals from search results
 */
function extractSignalsFromResults(
  results: Array<{ title?: string; snippet?: string; url?: string; date?: string }>,
  userKeywords: string[]
): GroundingSignal[] {
  const signalMap = new Map<string, { count: number; sources: string[]; recency?: string }>()

  // Common intent indicators for Samsung products
  const intentPatterns = [
    'camera', 'battery', 'display', 'screen', 'performance', 'price',
    'AI', 'Galaxy AI', 'design', 'durability', 'charging', 'storage',
    '카메라', '배터리', '디스플레이', '성능', '가격', '디자인',
    'comparison', 'vs', 'review', 'unboxing', 'test'
  ]

  for (const result of results) {
    const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase()

    // Check for intent patterns
    for (const pattern of intentPatterns) {
      if (text.includes(pattern.toLowerCase())) {
        const existing = signalMap.get(pattern) || { count: 0, sources: [] }
        existing.count++
        if (result.url) existing.sources.push(result.url)
        if (result.date && !existing.recency) existing.recency = result.date
        signalMap.set(pattern, existing)
      }
    }

    // Boost user-provided keywords found in results
    for (const keyword of userKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        const existing = signalMap.get(keyword) || { count: 0, sources: [] }
        existing.count += 2 // Double weight for user keywords
        signalMap.set(keyword, existing)
      }
    }
  }

  // Convert to scored signals
  const maxCount = Math.max(...Array.from(signalMap.values()).map(v => v.count), 1)

  return Array.from(signalMap.entries())
    .map(([term, data]) => ({
      term,
      score: Math.round((data.count / maxCount) * 100),
      source: data.sources[0],
      recency: data.recency,
    }))
    .sort((a, b) => b.score - a.score)
}
```

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         User Request                                  │
│              (productName, keywords, launchDate)                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Grounding Signal Fetch                          │
│                                                                       │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐ │
│  │ Query Builder   │ ──▶ │ Perplexity API  │ ──▶ │ Signal Extract │ │
│  │                 │     │                 │     │                │ │
│  │ - Reviews       │     │ POST /search    │     │ - Term count   │ │
│  │ - Comparisons   │     │ - max_results   │     │ - Scoring      │ │
│  │ - Features      │     │ - max_tokens    │     │ - Source track │ │
│  │ - FAQ signals   │     │                 │     │                │ │
│  └─────────────────┘     └─────────────────┘     └────────────────┘ │
│                                                                       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      GroundingSignal[]                               │
│                                                                       │
│  [                                                                   │
│    { term: "camera", score: 95, source: "reddit.com" },              │
│    { term: "Galaxy AI", score: 88, source: "theverge.com" },         │
│    { term: "battery", score: 82, source: "gsmarena.com" },           │
│    ...                                                               │
│  ]                                                                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Content Generation Pipeline                       │
│                                                                       │
│  - Description (uses top signals for relevance)                      │
│  - FAQ (addresses user intent signals as questions)                  │
│  - Keywords (prioritizes high-scoring signals)                       │
│  - Hashtags (includes trending terms)                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Response Format

### Perplexity API Response

```typescript
interface PerplexitySearchResponse {
  results: Array<{
    title?: string
    url?: string
    snippet?: string
    date?: string
  }>
}
```

### Processed Grounding Signal

```typescript
interface GroundingSignal {
  term: string      // Extracted keyword/topic
  score: number     // 0-100 relevance score
  source?: string   // Source URL/domain
  recency?: string  // Publication date if available
}
```

---

## Key Features

### 1. Parallel Query Execution
Multiple queries are executed in parallel for speed:
```typescript
const queryPromises = groundingQueries.map(query =>
  fetchSingleGroundingQuery(apiKey, query).catch(() => [])
)
const allResults = await Promise.all(queryPromises)
```

### 2. Launch Date Filtering
Content before product launch date is filtered out:
```typescript
if (launchDate && result.date) {
  const resultDate = new Date(result.date)
  const filterDate = new Date(launchDate)
  if (resultDate < filterDate) {
    return // Skip content before launch date
  }
}
```

### 3. Caching (24-hour TTL)
Results are cached in Supabase to reduce API calls:
```typescript
const { data } = await supabase
  .from('grounding_cache')
  .select('*')
  .eq('product_name', cacheKey)
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
```

### 4. Graceful Fallback
Mock data is returned if API fails:
```typescript
if (!apiKey) {
  console.warn('Perplexity API key not configured, using mock data')
  return getMockGroundingData(productName)
}
```

### 5. Keyword Boosting
User-provided keywords get double weight:
```typescript
for (const keyword of userKeywords) {
  if (text.includes(keyword.toLowerCase())) {
    const existing = signalMap.get(keyword) || { count: 0, sources: [] }
    existing.count += 2 // Double weight for user keywords
    signalMap.set(keyword, existing)
  }
}
```

---

## Error Handling

```typescript
// Individual query failure handling
const queryPromises = groundingQueries.map(query =>
  fetchSingleGroundingQuery(apiKey, query).catch(() => [])  // Returns empty on failure
)

// API response error handling
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}))
  console.error(`Perplexity Search API error:`, response.status, errorData)
}

// Overall fallback
if (allResults.length === 0) {
  console.warn('No Perplexity results, using mock data')
  return getMockGroundingData(productName)
}
```

---

## Query Templates

| Query Type | Template | Purpose |
|------------|----------|---------|
| Reviews | `{product} reviews opinions 2024 2025` | User sentiment |
| Comparison | `{product} vs iPhone vs Pixel comparison` | Competitive context |
| Features | `{product} best features what users love` | Feature priorities |
| FAQ | `{product} common questions problems issues` | User concerns |
| Performance | `{product} {keyword} real world performance` | Specific feature depth |

---

## Integration with 3-Engine Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   3-Engine GEO Architecture                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │   Gemini     │   │  Perplexity  │   │   Cohere     │       │
│  │  (Content)   │   │  (Grounding) │   │  (RAG/Rerank)│       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│         │                  │                  │                │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────────────────────────────────────────────┐      │
│  │             Content Generation Pipeline              │      │
│  │  - Description                                       │      │
│  │  - USP Extraction                                    │      │
│  │  - FAQ Generation                                    │      │
│  │  - Case Studies                                      │      │
│  │  - Keywords & Hashtags                               │      │
│  └─────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

**Perplexity's Role:** Provides real-time user intent signals that inform all content generation stages, ensuring generated content addresses actual user interests and trending topics.
