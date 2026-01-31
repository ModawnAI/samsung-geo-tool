/**
 * Google Search Adapter - Parse Google SERP results
 */

import { browserManager } from '../browser-manager'
import type { SearchResult } from '@/types/geo-verification'

/**
 * Samsung-owned domains for identifying own content
 */
const SAMSUNG_DOMAINS = [
  'samsung.com',
  'news.samsung.com',
  'samsungmobilepress.com',
  'samsungdisplay.com',
  'semiconductor.samsung.com',
]

/**
 * Search Google for a query and parse results
 */
export async function searchGoogle(
  query: string,
  options?: { maxResults?: number; language?: 'ko' | 'en' }
): Promise<SearchResult[]> {
  const maxResults = options?.maxResults || 10
  const language = options?.language || 'ko'

  // Build Google search URL
  const params = new URLSearchParams({
    q: query,
    hl: language,
    gl: language === 'ko' ? 'kr' : 'us',
    num: maxResults.toString(),
  })

  const searchUrl = `https://www.google.com/search?${params.toString()}`

  console.log(`[GoogleSearch] Searching: ${query}`)

  try {
    const { html } = await browserManager.search(searchUrl, {
      waitForSelector: '#search',
      timeout: 20000,
    })

    const results = parseGoogleResults(html, maxResults)
    console.log(`[GoogleSearch] Found ${results.length} results`)

    return results
  } catch (error) {
    console.error('[GoogleSearch] Search failed:', error)
    return []
  }
}

/**
 * Parse Google search results HTML
 */
function parseGoogleResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // Strategy: Find anchor tags with h3 titles (common Google result pattern)
  const simpleRegex =
    /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi

  let matches
  while ((matches = simpleRegex.exec(html)) !== null && results.length < maxResults) {
    const url = matches[1]
    const title = cleanHtmlText(matches[2])

    // Skip Google's own pages
    if (url.includes('google.com/') || url.includes('accounts.google')) {
      continue
    }

    // Extract snippet around this result
    const snippet = extractSnippet(html, matches.index)

    results.push({
      position: results.length + 1,
      title,
      snippet,
      url,
      matchedKeywords: [],
      isOwnContent: isSamsungDomain(url),
    })
  }

  // If no results from simple pattern, try fallback
  if (results.length === 0) {
    // Fallback: extract any external URLs with meaningful context
    const urlRegex = /href="(https?:\/\/(?!www\.google)[^"]+)"/gi
    const seenUrls = new Set<string>()

    while ((matches = urlRegex.exec(html)) !== null && results.length < maxResults) {
      const url = matches[1]

      // Skip duplicates and internal links
      if (
        seenUrls.has(url) ||
        url.includes('google.com') ||
        url.includes('gstatic.com') ||
        url.includes('accounts.google')
      ) {
        continue
      }

      seenUrls.add(url)

      // Try to extract title from nearby text
      const titleMatch = html.slice(Math.max(0, matches.index - 200), matches.index + 500)
      const titleExtract = titleMatch.match(/<h3[^>]*>([^<]+)<\/h3>/i)
      const title = titleExtract ? cleanHtmlText(titleExtract[1]) : extractDomainTitle(url)

      results.push({
        position: results.length + 1,
        title,
        snippet: '',
        url,
        matchedKeywords: [],
        isOwnContent: isSamsungDomain(url),
      })
    }
  }

  return results
}

/**
 * Extract snippet text around a result position
 */
function extractSnippet(html: string, position: number): string {
  // Look for snippet text in the area after the position
  const searchArea = html.slice(position, position + 2000)

  // Try various snippet patterns
  const patterns = [
    /<span[^>]*>([^<]{50,300})<\/span>/i,
    /<div[^>]*>([^<]{50,300})<\/div>/i,
    />([^<>]{50,300})</,
  ]

  for (const pattern of patterns) {
    const match = searchArea.match(pattern)
    if (match) {
      const text = cleanHtmlText(match[1])
      if (text.length > 40 && !text.includes('google') && !text.includes('javascript')) {
        return text
      }
    }
  }

  return ''
}

/**
 * Check if URL is a Samsung-owned domain
 */
function isSamsungDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return SAMSUNG_DOMAINS.some((domain) => hostname.includes(domain))
  } catch {
    return false
  }
}

/**
 * Extract a title from URL if no proper title found
 */
function extractDomainTitle(url: string): string {
  try {
    const urlObj = new URL(url)
    const parts = urlObj.pathname.split('/').filter(Boolean)
    if (parts.length > 0) {
      return parts[parts.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '')
        .slice(0, 100)
    }
    return urlObj.hostname
  } catch {
    return 'Unknown'
  }
}

/**
 * Clean HTML entities and tags from text
 */
function cleanHtmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate keyword matches for a search result
 */
export function calculateKeywordMatches(
  result: SearchResult,
  keywords: string[]
): SearchResult {
  const text = `${result.title} ${result.snippet}`.toLowerCase()
  const matchedKeywords = keywords.filter((keyword) =>
    text.includes(keyword.toLowerCase())
  )

  return {
    ...result,
    matchedKeywords,
  }
}
