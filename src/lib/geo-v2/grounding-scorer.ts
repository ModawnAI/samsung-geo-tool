/**
 * Grounding Quality Scoring (10pt metric)
 * Evaluates the quality and authority of grounding sources
 *
 * Updated 2026-01-08: Improved tier scoring with configurable weights
 */

import type {
  GroundingQualityScore,
  GroundingSource,
  GroundingMetadata,
  UniqueSellingPoint,
} from '@/types/geo-v2'
import { SOURCE_AUTHORITY_TIERS } from '@/types/geo-v2'
import { GROUNDING_CONFIG, getTierScoreConfig } from '@/lib/scoring/scoring-config'

/**
 * Calculate comprehensive grounding quality score (0-10 points)
 *
 * Breakdown:
 * - Citation Density (0-3pts): % of content with grounding support
 * - Source Authority (0-4pts): Quality of sources (samsung.com = Tier 1)
 * - Coverage (0-3pts): How well grounding covers all sections
 */
export function calculateGroundingQualityScore(params: {
  sources: GroundingSource[]
  usps: UniqueSellingPoint[]
  totalSections: number
  sectionsWithGrounding: number
  contentLength: number
  citedContentLength: number
}): GroundingQualityScore {
  const {
    sources,
    usps,
    totalSections,
    sectionsWithGrounding,
    contentLength,
    citedContentLength,
  } = params

  // Calculate tier counts
  const tier1Sources = sources.filter(s => s.tier === 1).length
  const tier2Sources = sources.filter(s => s.tier === 2).length
  const tier3Sources = sources.filter(s => s.tier === 3).length

  // 1. Citation Density Score (0-3 points)
  const citationPercentage = contentLength > 0
    ? (citedContentLength / contentLength) * 100
    : 0
  const citationDensity = calculateCitationDensityScore(citationPercentage)

  // 2. Source Authority Score (0-4 points)
  const sourceAuthority = calculateSourceAuthorityScore(tier1Sources, tier2Sources, tier3Sources)

  // 3. Coverage Score (0-3 points)
  const coverage = calculateCoverageScore(sectionsWithGrounding, totalSections, usps)

  // Calculate total (0-10)
  const total = Math.min(10, citationDensity + sourceAuthority + coverage)

  return {
    citationDensity: Math.round(citationDensity * 100) / 100,
    sourceAuthority: Math.round(sourceAuthority * 100) / 100,
    coverage: Math.round(coverage * 100) / 100,
    total: Math.round(total * 100) / 100,
    breakdown: {
      citationPercentage: Math.round(citationPercentage * 100) / 100,
      tier1Sources,
      tier2Sources,
      tier3Sources,
      sectionsWithGrounding,
      totalSections,
    },
  }
}

/**
 * Citation Density Score (0-3 points)
 * Based on percentage of content backed by citations
 */
function calculateCitationDensityScore(citationPercentage: number): number {
  // Scale: 0% = 0pts, 33% = 1pt, 66% = 2pts, 100% = 3pts
  if (citationPercentage >= 80) return 3
  if (citationPercentage >= 60) return 2.5
  if (citationPercentage >= 40) return 2
  if (citationPercentage >= 25) return 1.5
  if (citationPercentage >= 10) return 1
  if (citationPercentage > 0) return 0.5
  return 0
}

/**
 * Source Authority Score (0-4 points)
 * Based on quality tier of sources used
 *
 * Updated 2026-01-08: Use configurable tier scores for better balance
 * - Tier 1 (Official Samsung): 1.2pts each, max 2.5pts
 * - Tier 2 (Tech Media): 0.6pts each, max 1.2pts
 * - Tier 3 (Community): 0.3pts each, max 0.5pts
 */
function calculateSourceAuthorityScore(
  tier1Count: number,
  tier2Count: number,
  tier3Count: number
): number {
  const tier1Config = GROUNDING_CONFIG.TIER_SCORES.tier1
  const tier2Config = GROUNDING_CONFIG.TIER_SCORES.tier2
  const tier3Config = GROUNDING_CONFIG.TIER_SCORES.tier3

  let score = 0

  // Tier 1 sources (samsung.com, news.samsung.com)
  const tier1Score = Math.min(tier1Config.maxPoints, tier1Count * tier1Config.pointsPerSource)
  score += tier1Score

  // Tier 2 sources (gsmarena, theverge, etc.)
  const tier2Score = Math.min(tier2Config.maxPoints, tier2Count * tier2Config.pointsPerSource)
  score += tier2Score

  // Tier 3 sources (reddit, youtube, etc.) - now contributes points
  const tier3Score = Math.min(tier3Config.maxPoints, tier3Count * tier3Config.pointsPerSource)
  score += tier3Score

  // Log source breakdown for debugging
  if (tier1Count > 0 || tier2Count > 0 || tier3Count > 0) {
    console.log(`[Grounding] Source Authority: T1=${tier1Count}(${tier1Score.toFixed(1)}pts) T2=${tier2Count}(${tier2Score.toFixed(1)}pts) T3=${tier3Count}(${tier3Score.toFixed(1)}pts) Total=${score.toFixed(1)}pts`)
  }

  // No sources = 0 points
  if (tier1Count === 0 && tier2Count === 0 && tier3Count === 0) {
    score = 0
  }

  return Math.min(4, score)
}

/**
 * Coverage Score (0-3 points)
 * Based on how well grounding covers all content sections
 *
 * Per 2-Stage Strategy: ALL USPs are HIGH confidence (video = ground truth)
 * USP quality bonus now based on evidence coverage instead of confidence tiers
 */
function calculateCoverageScore(
  sectionsWithGrounding: number,
  totalSections: number,
  usps: UniqueSellingPoint[]
): number {
  if (totalSections === 0) return 0

  // Base coverage from sections
  const sectionCoverage = sectionsWithGrounding / totalSections
  let score = sectionCoverage * 2 // Max 2 points from section coverage

  // Per 2-Stage Strategy: ALL USPs are HIGH confidence
  // Bonus now based on evidence coverage (USPs with grounding sources)
  if (usps.length > 0) {
    const uspsWithEvidence = usps.filter(u => u.evidence.sources.length > 0).length
    const evidenceQuality = uspsWithEvidence / usps.length
    score += evidenceQuality // Max 1 point from evidence coverage
  }

  return Math.min(3, score)
}

/**
 * Tier metadata for UI display and transparency
 * Updated 2026-01-08: Reflects new configurable scoring
 */
export const TIER_DESCRIPTIONS = {
  1: {
    label: 'Official Samsung',
    description: 'Direct Samsung sources with highest authority',
    icon: '🏢',
    color: 'green',
    points: `${GROUNDING_CONFIG.TIER_SCORES.tier1.pointsPerSource}pts each (max ${GROUNDING_CONFIG.TIER_SCORES.tier1.maxPoints}pts)`,
  },
  2: {
    label: 'Tech Media',
    description: 'Trusted technology publications and news outlets',
    icon: '📰',
    color: 'blue',
    points: `${GROUNDING_CONFIG.TIER_SCORES.tier2.pointsPerSource}pts each (max ${GROUNDING_CONFIG.TIER_SCORES.tier2.maxPoints}pts)`,
  },
  3: {
    label: 'Community',
    description: 'Social media and community-driven content',
    icon: '👥',
    color: 'yellow',
    points: `${GROUNDING_CONFIG.TIER_SCORES.tier3.pointsPerSource}pts each (max ${GROUNDING_CONFIG.TIER_SCORES.tier3.maxPoints}pts)`,
  },
  4: {
    label: 'Other',
    description: 'Unrecognized sources with unknown authority',
    icon: '❓',
    color: 'gray',
    points: '0pts',
  },
} as const

/**
 * Get tier description for UI display
 */
export function getTierDescription(tier: 1 | 2 | 3 | 4) {
  return TIER_DESCRIPTIONS[tier]
}

/**
 * Determine source tier from URL
 * Enhanced with comprehensive domain matching
 */
export function getSourceTier(uri: string): 1 | 2 | 3 | 4 {
  const urlLower = uri.toLowerCase()

  // Extract hostname for more accurate matching
  let hostname = ''
  try {
    const url = new URL(uri)
    hostname = url.hostname.toLowerCase()
  } catch {
    // If URL parsing fails, fallback to string matching
    hostname = urlLower
  }

  // Check Tier 1 (Official Samsung)
  for (const domain of SOURCE_AUTHORITY_TIERS.tier1) {
    if (hostname.includes(domain) || hostname.endsWith(`.${domain}`)) {
      return 1
    }
  }

  // Check Tier 2 (Tech Media)
  for (const domain of SOURCE_AUTHORITY_TIERS.tier2) {
    if (hostname.includes(domain) || hostname.endsWith(`.${domain}`)) {
      return 2
    }
  }

  // Check Tier 3 (Community)
  for (const domain of SOURCE_AUTHORITY_TIERS.tier3) {
    if (hostname.includes(domain) || hostname.endsWith(`.${domain}`)) {
      return 3
    }
  }

  // Default to Tier 4 (Unknown/Other)
  return 4
}

/**
 * Extract and categorize sources from grounding metadata
 */
export function extractGroundingSources(groundingChunks: Array<{
  web?: { uri: string; title: string }
}>): GroundingSource[] {
  const sourceMap = new Map<string, GroundingSource>()

  for (const chunk of groundingChunks) {
    if (!chunk.web?.uri) continue

    const uri = chunk.web.uri
    const existing = sourceMap.get(uri)

    if (existing) {
      existing.accessCount = (existing.accessCount || 1) + 1
    } else {
      sourceMap.set(uri, {
        uri,
        title: chunk.web.title || extractTitleFromUri(uri),
        usedIn: [],
        accessCount: 1,
        tier: getSourceTier(uri),
      })
    }
  }

  return Array.from(sourceMap.values())
    .sort((a, b) => a.tier - b.tier) // Sort by tier (1 first)
}

/**
 * Extract a readable title from URI if not provided
 */
function extractTitleFromUri(uri: string): string {
  try {
    const url = new URL(uri)
    const hostname = url.hostname.replace('www.', '')
    const path = url.pathname.split('/').filter(Boolean).slice(-1)[0] || ''

    // Clean up the path for title
    const cleanPath = path
      .replace(/[-_]/g, ' ')
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/\b\w/g, l => l.toUpperCase())

    return cleanPath || hostname
  } catch {
    return 'External Source'
  }
}

/**
 * Aggregate grounding metadata from multiple pipeline stages
 */
export function aggregateGroundingMetadata(
  stageMetadata: Array<{
    stage: string
    sources: GroundingSource[]
    searchQueries?: string[]
  }>
): GroundingMetadata {
  const allSources: GroundingSource[] = []
  const allQueries: string[] = []
  const sourceUriMap = new Map<string, GroundingSource>()

  for (const stage of stageMetadata) {
    // Aggregate sources with deduplication
    for (const source of stage.sources) {
      const existing = sourceUriMap.get(source.uri)
      if (existing) {
        // Merge usedIn arrays
        existing.usedIn = [...new Set([...existing.usedIn, stage.stage])]
        existing.accessCount = (existing.accessCount || 1) + (source.accessCount || 1)
      } else {
        sourceUriMap.set(source.uri, {
          ...source,
          usedIn: [stage.stage],
        })
      }
    }

    // Aggregate search queries
    if (stage.searchQueries) {
      allQueries.push(...stage.searchQueries)
    }
  }

  const uniqueSources = Array.from(sourceUriMap.values())
  const totalCitations = uniqueSources.reduce((sum, s) => sum + (s.accessCount || 1), 0)

  // Calculate citation density (as percentage)
  const citationDensity = stageMetadata.length > 0
    ? (stageMetadata.filter(s => s.sources.length > 0).length / stageMetadata.length) * 100
    : 0

  return {
    webSearchQueries: [...new Set(allQueries)],
    sources: uniqueSources.sort((a, b) => a.tier - b.tier),
    citationDensity: Math.round(citationDensity * 100) / 100,
    totalCitations,
    uniqueSources: uniqueSources.length,
  }
}

/**
 * Get human-readable grounding quality description
 */
export function getGroundingQualityDescription(score: GroundingQualityScore): {
  level: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  recommendations: string[]
} {
  const { total, breakdown } = score
  const recommendations: string[] = []

  // Determine level
  let level: 'excellent' | 'good' | 'fair' | 'poor'
  let description: string

  if (total >= 8) {
    level = 'excellent'
    description = 'Strong grounding with authoritative sources and comprehensive coverage'
  } else if (total >= 6) {
    level = 'good'
    description = 'Good grounding with reliable sources covering most content'
  } else if (total >= 4) {
    level = 'fair'
    description = 'Moderate grounding - some areas lack verification'
  } else {
    level = 'poor'
    description = 'Limited grounding - content may need additional verification'
  }

  // Generate recommendations
  if (breakdown.tier1Sources === 0) {
    recommendations.push('Add official Samsung sources (samsung.com) for higher authority')
  }

  if (breakdown.citationPercentage < 50) {
    recommendations.push('Increase citation coverage to improve content verification')
  }

  if (breakdown.sectionsWithGrounding < breakdown.totalSections * 0.7) {
    recommendations.push('Ensure all major sections have grounding support')
  }

  if (breakdown.tier1Sources + breakdown.tier2Sources === 0) {
    recommendations.push('Include tech media sources (gsmarena, theverge) for credibility')
  }

  return { level, description, recommendations }
}

/**
 * Format grounding score for display
 */
export function formatGroundingScore(score: GroundingQualityScore): string {
  const { level } = getGroundingQualityDescription(score)
  const emoji = level === 'excellent' ? '🌟'
    : level === 'good' ? '✅'
    : level === 'fair' ? '⚠️'
    : '❌'

  return `${emoji} Grounding Quality: ${score.total}/10 (${level.toUpperCase()})
├── Citation Density: ${score.citationDensity}/3 (${score.breakdown.citationPercentage}%)
├── Source Authority: ${score.sourceAuthority}/4 (T1:${score.breakdown.tier1Sources} T2:${score.breakdown.tier2Sources} T3:${score.breakdown.tier3Sources})
└── Coverage: ${score.coverage}/3 (${score.breakdown.sectionsWithGrounding}/${score.breakdown.totalSections} sections)`
}
