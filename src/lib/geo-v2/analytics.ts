/**
 * Source Click Analytics Tracking
 * Tracks user interaction with grounding sources
 */

import type { SourceClickEvent, AnalyticsData } from '@/types/geo-v2'

// Session storage key for analytics data
const ANALYTICS_STORAGE_KEY = 'geo_v2_analytics'

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return generateSessionId()
  }

  let sessionId = sessionStorage.getItem('geo_session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem('geo_session_id', sessionId)
  }
  return sessionId
}

/**
 * Track a source click event
 */
export function trackSourceClick(
  sourceUri: string,
  sourceTitle: string,
  section: string
): SourceClickEvent {
  const event: SourceClickEvent = {
    sourceUri,
    sourceTitle,
    section,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  }

  // Log to console for development
  console.log('[Analytics] Source click:', {
    source: sourceTitle,
    section,
    uri: sourceUri,
  })

  // Store in session storage
  storeClickEvent(event)

  return event
}

/**
 * Store click event in session storage
 */
function storeClickEvent(event: SourceClickEvent): void {
  if (typeof window === 'undefined') return

  try {
    const stored = sessionStorage.getItem(ANALYTICS_STORAGE_KEY)
    const data: AnalyticsData = stored ? JSON.parse(stored) : createEmptyAnalyticsData()

    // Add event
    data.sourceClicks.push(event)
    data.totalClicks += 1

    // Update click counts
    data.clicksBySource[event.sourceUri] = (data.clicksBySource[event.sourceUri] || 0) + 1
    data.clicksBySection[event.section] = (data.clicksBySection[event.section] || 0) + 1

    sessionStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('[Analytics] Failed to store click event:', error)
  }
}

/**
 * Get current analytics data
 */
export function getAnalyticsData(): AnalyticsData {
  if (typeof window === 'undefined') {
    return createEmptyAnalyticsData()
  }

  try {
    const stored = sessionStorage.getItem(ANALYTICS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : createEmptyAnalyticsData()
  } catch {
    return createEmptyAnalyticsData()
  }
}

/**
 * Create empty analytics data structure
 */
function createEmptyAnalyticsData(): AnalyticsData {
  return {
    sourceClicks: [],
    totalClicks: 0,
    clicksBySource: {},
    clicksBySection: {},
  }
}

/**
 * Get click count for a specific source
 */
export function getSourceClickCount(sourceUri: string): number {
  const data = getAnalyticsData()
  return data.clicksBySource[sourceUri] || 0
}

/**
 * Get click count for a specific section
 */
export function getSectionClickCount(section: string): number {
  const data = getAnalyticsData()
  return data.clicksBySection[section] || 0
}

/**
 * Get top clicked sources
 */
export function getTopClickedSources(limit: number = 5): Array<{
  uri: string
  clicks: number
}> {
  const data = getAnalyticsData()

  return Object.entries(data.clicksBySource)
    .map(([uri, clicks]) => ({ uri, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit)
}

/**
 * Get analytics summary for console logging
 */
export function getAnalyticsSummary(): string {
  const data = getAnalyticsData()

  if (data.totalClicks === 0) {
    return '[Analytics] No source clicks recorded in this session.'
  }

  const topSources = getTopClickedSources(3)
  const sections = Object.entries(data.clicksBySection)
    .sort((a, b) => b[1] - a[1])

  const lines = [
    '═══════════════════════════════════════',
    '📊 GEO v2 Source Click Analytics',
    '═══════════════════════════════════════',
    `Total Clicks: ${data.totalClicks}`,
    '',
    '📌 Top Sources:',
    ...topSources.map((s, i) => `  ${i + 1}. ${s.uri.substring(0, 50)}... (${s.clicks} clicks)`),
    '',
    '📂 By Section:',
    ...sections.map(([section, clicks]) => `  • ${section}: ${clicks} clicks`),
    '═══════════════════════════════════════',
  ]

  return lines.join('\n')
}

/**
 * Log analytics summary to console
 */
export function logAnalyticsSummary(): void {
  console.log(getAnalyticsSummary())
}

/**
 * Clear analytics data (e.g., for new analysis)
 */
export function clearAnalyticsData(): void {
  if (typeof window === 'undefined') return

  sessionStorage.removeItem(ANALYTICS_STORAGE_KEY)
  console.log('[Analytics] Data cleared')
}

/**
 * Export analytics data for external processing
 */
export function exportAnalyticsData(): string {
  const data = getAnalyticsData()
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    ...data,
  }, null, 2)
}

/**
 * Create a click tracker component helper
 * Returns props to spread on clickable source elements
 */
export function createSourceClickHandler(
  sourceUri: string,
  sourceTitle: string,
  section: string
): {
  onClick: () => void
  onAuxClick: () => void // For middle-click
} {
  const handleClick = () => {
    trackSourceClick(sourceUri, sourceTitle, section)
  }

  return {
    onClick: handleClick,
    onAuxClick: handleClick, // Track middle-click opens as well
  }
}

/**
 * React hook helper for tracking source clicks
 * Usage: const trackClick = useSourceClickTracker('faq')
 */
export function createSectionTracker(section: string) {
  return (sourceUri: string, sourceTitle: string) => {
    trackSourceClick(sourceUri, sourceTitle, section)
  }
}
