/**
 * YouTube Search Adapter - Parse YouTube search results
 */

import { browserManager } from '../browser-manager'
import type { SearchResult } from '@/types/geo-verification'

/**
 * Samsung official YouTube channels
 */
const SAMSUNG_CHANNELS = [
  'samsung',
  'samsungmobile',
  'samsungglobal',
  'samsungkorea',
  '삼성전자',
  'samsungindia',
  'samsungus',
]

/**
 * Search YouTube for a query and parse results
 */
export async function searchYouTube(
  query: string,
  options?: { maxResults?: number; language?: 'ko' | 'en' }
): Promise<SearchResult[]> {
  const maxResults = options?.maxResults || 10
  const language = options?.language || 'ko'

  // Build YouTube search URL
  const params = new URLSearchParams({
    search_query: query,
    hl: language,
    gl: language === 'ko' ? 'KR' : 'US',
  })

  const searchUrl = `https://www.youtube.com/results?${params.toString()}`

  console.log(`[YouTubeSearch] Searching: ${query}`)

  try {
    const { html } = await browserManager.search(searchUrl, {
      waitForSelector: 'ytd-video-renderer, ytd-search',
      timeout: 20000,
    })

    const results = parseYouTubeResults(html, maxResults)
    console.log(`[YouTubeSearch] Found ${results.length} results`)

    return results
  } catch (error) {
    console.error('[YouTubeSearch] Search failed:', error)
    return []
  }
}

/**
 * Parse YouTube search results HTML
 */
function parseYouTubeResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // YouTube renders content via JavaScript, so we need to find the initial data
  // Look for ytInitialData JSON embedded in the page

  const dataMatch = html.match(/var ytInitialData = ({.*?});/)
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1])
      const videoRenderers = findVideoRenderers(data)

      for (const renderer of videoRenderers.slice(0, maxResults)) {
        const result = extractVideoInfo(renderer)
        if (result) {
          results.push({
            ...result,
            position: results.length + 1,
          })
        }
      }

      if (results.length > 0) {
        return results
      }
    } catch (e) {
      console.warn('[YouTubeSearch] Failed to parse ytInitialData:', e)
    }
  }

  // Fallback: Try to parse HTML directly
  // Look for video links and titles

  // Pattern for video URLs
  const videoRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g
  const seenIds = new Set<string>()

  let matches
  while ((matches = videoRegex.exec(html)) !== null && results.length < maxResults) {
    const videoId = matches[1]

    if (seenIds.has(videoId)) continue
    seenIds.add(videoId)

    // Try to find title near this video ID
    const context = html.slice(
      Math.max(0, matches.index - 500),
      Math.min(html.length, matches.index + 1000)
    )

    const title = extractVideoTitle(context)
    const channelInfo = extractChannelInfo(context)

    if (title) {
      results.push({
        position: results.length + 1,
        title,
        snippet: channelInfo.name || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        matchedKeywords: [],
        isOwnContent: isSamsungChannel(channelInfo.name || channelInfo.handle),
      })
    }
  }

  return results
}

/**
 * Recursively find video renderers in YouTube data structure
 */
function findVideoRenderers(obj: Record<string, unknown>, depth = 0): unknown[] {
  if (depth > 15) return []
  const renderers: unknown[] = []

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        renderers.push(...findVideoRenderers(item as Record<string, unknown>, depth + 1))
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    // Check if this is a video renderer
    if ('videoRenderer' in obj) {
      renderers.push(obj.videoRenderer)
    }
    if ('compactVideoRenderer' in obj) {
      renderers.push(obj.compactVideoRenderer)
    }

    // Recurse into object properties
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        renderers.push(...findVideoRenderers(value as Record<string, unknown>, depth + 1))
      }
    }
  }

  return renderers
}

/**
 * Extract video information from a renderer object
 */
function extractVideoInfo(renderer: unknown): Omit<SearchResult, 'position'> | null {
  try {
    const r = renderer as Record<string, unknown>

    // Get video ID
    const videoId = r.videoId as string
    if (!videoId) return null

    // Get title
    const titleObj = r.title as Record<string, unknown>
    const title =
      (titleObj?.simpleText as string) ||
      ((titleObj?.runs as Array<{ text: string }>)?.[0]?.text) ||
      ''

    if (!title) return null

    // Get channel name
    const ownerText = r.ownerText as Record<string, unknown>
    const channelName =
      ((ownerText?.runs as Array<{ text: string }>)?.[0]?.text) ||
      ((r.shortBylineText as Record<string, unknown>)?.runs as Array<{ text: string }>)?.[0]
        ?.text ||
      ''

    // Get description/snippet
    const descSnippet = r.descriptionSnippet as Record<string, unknown>
    const snippet =
      ((descSnippet?.runs as Array<{ text: string }>)?.map((run) => run.text).join('')) || ''

    return {
      title,
      snippet: snippet || channelName,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      matchedKeywords: [],
      isOwnContent: isSamsungChannel(channelName),
    }
  } catch {
    return null
  }
}

/**
 * Extract video title from HTML context
 */
function extractVideoTitle(context: string): string {
  // Try various patterns for title extraction
  const patterns = [
    /title="([^"]{10,100})"/i,
    /aria-label="([^"]{10,100})"/i,
    /"title":\s*{\s*"runs":\s*\[\s*{\s*"text":\s*"([^"]+)"/i,
    /"title":\s*"([^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = context.match(pattern)
    if (match && match[1]) {
      const title = match[1]
      // Filter out generic navigation labels
      if (
        !title.includes('Search') &&
        !title.includes('menu') &&
        !title.includes('navigate')
      ) {
        return cleanHtmlText(title)
      }
    }
  }

  return ''
}

/**
 * Extract channel information from HTML context
 */
function extractChannelInfo(context: string): { name: string; handle: string } {
  const nameMatch = context.match(/"ownerText"[^}]*"text":\s*"([^"]+)"/i)
  const handleMatch = context.match(/@([a-zA-Z0-9_]+)/i)

  return {
    name: nameMatch ? nameMatch[1] : '',
    handle: handleMatch ? handleMatch[1] : '',
  }
}

/**
 * Check if channel is a Samsung official channel
 */
function isSamsungChannel(channelNameOrHandle: string): boolean {
  if (!channelNameOrHandle) return false
  const normalized = channelNameOrHandle.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
  return SAMSUNG_CHANNELS.some(
    (channel) => normalized.includes(channel) || channel.includes(normalized)
  )
}

/**
 * Clean HTML entities from text
 */
function cleanHtmlText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, '&')
    .replace(/\\n/g, ' ')
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
