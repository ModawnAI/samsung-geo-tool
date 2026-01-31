/**
 * GEO Verification Service
 * Main entry point for search engine visibility verification
 */

import { searchGoogle, calculateKeywordMatches as calculateGoogleMatches } from './adapters/google-search'
import { searchYouTube, calculateKeywordMatches as calculateYouTubeMatches } from './adapters/youtube-search'
import { browserManager } from './browser-manager'
import type {
  VerificationResult,
  VerificationRequest,
  VerificationOptions,
  MatchScore,
  PlatformMetrics,
  SearchResult,
} from '@/types/geo-verification'

/**
 * Default verification options
 */
const DEFAULT_OPTIONS: Required<VerificationOptions> = {
  maxResults: 10,
  includeYoutube: true,
  includeGoogle: true,
  timeoutMs: 30000,
}

/**
 * Run GEO verification for generated content
 * Searches Google and YouTube for keywords and analyzes visibility
 */
export async function runVerification(
  request: VerificationRequest
): Promise<VerificationResult> {
  const startTime = Date.now()
  const options = { ...DEFAULT_OPTIONS, ...request.options }

  console.log(`[Verification] Starting verification for: ${request.productName}`)
  console.log(`[Verification] Keywords: ${request.keywords.join(', ')}`)

  try {
    // Build search queries from product name and keywords
    const searchQueries = buildSearchQueries(request.productName, request.keywords)

    // Run searches in parallel
    const [googleResults, youtubeResults] = await Promise.all([
      options.includeGoogle
        ? runGoogleSearches(searchQueries, options.maxResults)
        : Promise.resolve([]),
      options.includeYoutube
        ? runYouTubeSearches(searchQueries, options.maxResults)
        : Promise.resolve([]),
    ])

    // Calculate keyword matches for all results
    const googleWithMatches = googleResults.map((r) =>
      calculateGoogleMatches(r, request.keywords)
    )
    const youtubeWithMatches = youtubeResults.map((r) =>
      calculateYouTubeMatches(r, request.keywords)
    )

    // Calculate match scores
    const matchScore = calculateMatchScore(
      request.keywords,
      request.generatedContent,
      googleWithMatches,
      youtubeWithMatches
    )

    const result: VerificationResult = {
      productName: request.productName,
      keywords: request.keywords,
      googleResults: googleWithMatches,
      youtubeResults: youtubeWithMatches,
      matchScore,
      timestamp: new Date().toISOString(),
      verificationId: generateVerificationId(),
      durationMs: Date.now() - startTime,
    }

    console.log(`[Verification] Complete in ${result.durationMs}ms`)
    console.log(
      `[Verification] Results - Google: ${googleResults.length}, YouTube: ${youtubeResults.length}`
    )
    console.log(`[Verification] Match Score: ${matchScore.total}/100`)

    return result
  } finally {
    // Close browser after verification
    await browserManager.close()
  }
}

/**
 * Build search queries from product name and keywords
 */
function buildSearchQueries(productName: string, keywords: string[]): string[] {
  const queries: string[] = []

  // Primary query: product name
  queries.push(productName)

  // Product + top keywords
  const topKeywords = keywords.slice(0, 3)
  for (const keyword of topKeywords) {
    queries.push(`${productName} ${keyword}`)
  }

  // Samsung + product (if not already in name)
  if (!productName.toLowerCase().includes('samsung')) {
    queries.push(`Samsung ${productName}`)
  }

  return queries.slice(0, 5) // Limit to 5 queries
}

/**
 * Run Google searches for multiple queries
 */
async function runGoogleSearches(
  queries: string[],
  maxResults: number
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = []
  const seenUrls = new Set<string>()

  for (const query of queries) {
    const results = await searchGoogle(query, { maxResults: Math.ceil(maxResults / queries.length) })

    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url)
        allResults.push(result)
      }
    }

    if (allResults.length >= maxResults) break
  }

  return allResults.slice(0, maxResults)
}

/**
 * Run YouTube searches for multiple queries
 */
async function runYouTubeSearches(
  queries: string[],
  maxResults: number
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = []
  const seenUrls = new Set<string>()

  for (const query of queries) {
    const results = await searchYouTube(query, { maxResults: Math.ceil(maxResults / queries.length) })

    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url)
        allResults.push(result)
      }
    }

    if (allResults.length >= maxResults) break
  }

  return allResults.slice(0, maxResults)
}

/**
 * Calculate match score between generated content and search results
 */
function calculateMatchScore(
  keywords: string[],
  generatedContent: VerificationRequest['generatedContent'],
  googleResults: SearchResult[],
  youtubeResults: SearchResult[]
): MatchScore {
  // Calculate keyword coverage
  const allResults = [...googleResults, ...youtubeResults]
  const foundKeywords = new Set<string>()

  for (const result of allResults) {
    for (const keyword of result.matchedKeywords) {
      foundKeywords.add(keyword.toLowerCase())
    }
  }

  const keywordCoverage =
    keywords.length > 0 ? (foundKeywords.size / keywords.length) * 100 : 0

  // Calculate description match (how similar search snippets are to generated content)
  const descriptionMatch = calculateDescriptionMatch(
    generatedContent.description,
    allResults
  )

  // Calculate platform-specific metrics
  const googleMetrics = calculatePlatformMetrics(googleResults)
  const youtubeMetrics = calculatePlatformMetrics(youtubeResults)

  // Calculate Samsung content presence
  const ownContentCount = allResults.filter((r) => r.isOwnContent).length
  const samsungResults = allResults.filter((r) => r.isOwnContent)
  const avgSamsungPosition =
    samsungResults.length > 0
      ? samsungResults.reduce((sum, r) => sum + r.position, 0) / samsungResults.length
      : null

  // Calculate total score (weighted average)
  const total = Math.round(keywordCoverage * 0.6 + descriptionMatch * 0.4)

  return {
    keywordCoverage: Math.round(keywordCoverage),
    descriptionMatch: Math.round(descriptionMatch),
    total,
    breakdown: {
      keywordsFound: foundKeywords.size,
      totalKeywords: keywords.length,
      ownContentCount,
      avgSamsungPosition,
      google: googleMetrics,
      youtube: youtubeMetrics,
    },
  }
}

/**
 * Calculate how well generated description matches search snippets
 */
function calculateDescriptionMatch(
  description: string,
  results: SearchResult[]
): number {
  if (!description || results.length === 0) return 0

  const descWords = new Set(
    description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )

  let totalMatch = 0

  for (const result of results) {
    const snippetWords = new Set(
      `${result.title} ${result.snippet}`
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    )

    // Calculate word overlap
    let matchCount = 0
    for (const word of descWords) {
      if (snippetWords.has(word)) matchCount++
    }

    const matchRatio = descWords.size > 0 ? matchCount / descWords.size : 0
    totalMatch += matchRatio
  }

  return results.length > 0 ? (totalMatch / results.length) * 100 : 0
}

/**
 * Calculate platform-specific metrics
 */
function calculatePlatformMetrics(results: SearchResult[]): PlatformMetrics {
  const relevantResults = results.filter((r) => r.matchedKeywords.length > 0)
  const ownContent = results.filter((r) => r.isOwnContent)

  const avgKeywordMatch =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.matchedKeywords.length, 0) / results.length
      : 0

  return {
    totalResults: results.length,
    relevantResults: relevantResults.length,
    ownContent: ownContent.length,
    avgKeywordMatch,
  }
}

/**
 * Generate unique verification ID
 */
function generateVerificationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ver_${timestamp}_${random}`
}

/**
 * Export index for barrel exports
 */
export { browserManager } from './browser-manager'
export { searchGoogle } from './adapters/google-search'
export { searchYouTube } from './adapters/youtube-search'
