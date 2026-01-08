/**
 * Scoring Configuration Constants
 * Centralized configuration for GEO scoring system
 *
 * Updated 2026-01-08: Adjusted for better USP priority over grounding
 */

// ==========================================
// USP EXTRACTION CONFIGURATION
// ==========================================

export const USP_CONFIG = {
  /**
   * Minimum confidence level for USP to be included
   * Options: 'high' | 'medium' | 'low'
   *
   * 'high' - Only video-confirmed USPs (strictest)
   * 'medium' - Video + supplementary grounding USPs (recommended)
   * 'low' - All extracted USPs including weak evidence
   */
  MIN_CONFIDENCE_LEVEL: 'medium' as const,

  /**
   * USP extraction limits
   */
  MIN_USPS: 2,
  MAX_USPS: 8,

  /**
   * Stage priority weights (Stage 1 = Video, Stage 2 = Grounding)
   * Higher value = more priority
   */
  VIDEO_CONTENT_PRIORITY: 0.7,     // Stage 1: Video is primary source
  GROUNDING_PRIORITY: 0.3,         // Stage 2: Grounding supplements only

  /**
   * Safe language patterns for fallback USPs
   */
  SAFE_LANGUAGE_PATTERNS: [
    'Designed for',
    'Built to support',
    'Optimized for',
    'Engineered to deliver',
    'Features enhanced',
  ] as const,
} as const

// ==========================================
// GROUNDING QUALITY CONFIGURATION
// ==========================================

export const GROUNDING_CONFIG = {
  /**
   * Source authority tier scoring (0-4 points total)
   * Adjusted for more balanced scoring
   */
  TIER_SCORES: {
    tier1: {
      pointsPerSource: 1.2,     // Official Samsung (reduced from 1.5)
      maxPoints: 2.5,           // Max from Tier 1 (reduced from 3)
    },
    tier2: {
      pointsPerSource: 0.6,     // Tech Media (increased from 0.5)
      maxPoints: 1.2,           // Max from Tier 2 (increased from 1)
    },
    tier3: {
      pointsPerSource: 0.3,     // Community sources (new)
      maxPoints: 0.5,           // Max from Tier 3 (increased from 0.5 fallback only)
    },
  },

  /**
   * Citation density thresholds (percentage of content with citations)
   */
  CITATION_THRESHOLDS: {
    excellent: 80,    // 3 points
    good: 60,         // 2.5 points
    fair: 40,         // 2 points
    acceptable: 25,   // 1.5 points
    minimal: 10,      // 1 point
    poor: 0,          // 0.5 points
  },

  /**
   * Source authority tier definitions
   * Domains categorized by authority level
   */
  TIER_DOMAINS: {
    tier1: [
      'samsung.com',
      'news.samsung.com',
      'samsungmobilepress.com',
      'developer.samsung.com',
    ],
    tier2: [
      'gsmarena.com',
      'theverge.com',
      'techradar.com',
      'cnet.com',
      'engadget.com',
      'androidauthority.com',
      'tomsguide.com',
      'phonearena.com',
      'androidcentral.com',
      'xda-developers.com',
    ],
    tier3: [
      'reddit.com',
      'youtube.com',
      'twitter.com',
      'x.com',
      'facebook.com',
      'quora.com',
    ],
  },
} as const

// ==========================================
// KEYWORD DENSITY CONFIGURATION
// ==========================================

export const KEYWORD_CONFIG = {
  /**
   * Optimal keyword density range (percentage)
   * 1-3% is industry standard for SEO
   */
  OPTIMAL_DENSITY: {
    min: 1.0,         // Minimum optimal
    target: 2.0,      // Target optimal
    max: 3.0,         // Maximum optimal before penalty
    stuffingThreshold: 5.0,  // Keyword stuffing penalty threshold
  },

  /**
   * Density score mapping
   */
  DENSITY_SCORES: {
    zero: 0.2,            // 0% density
    belowMin: 0.5,        // < 1% density
    atMin: 0.7,           // 1% density
    atTarget: 0.9,        // 2% density
    atMax: 1.0,           // 3% density
    aboveMax: 0.8,        // 3-5% density (slight penalty)
    stuffing: 0.5,        // >5% density (stuffing penalty)
  },

  /**
   * Bonus points for distribution across sections
   */
  DISTRIBUTION_BONUS: 0.1,        // Max 10% bonus
  COVERAGE_BONUS: 0.1,            // Max 10% bonus for keyword coverage
} as const

// ==========================================
// ANTI-FABRICATION CONFIGURATION
// ==========================================

export const ANTI_FABRICATION_CONFIG = {
  /**
   * Violation penalty calculation
   */
  PENALTY_PER_VIOLATION: 0.08,    // 8% penalty per violation
  MAX_PENALTY: 0.6,               // Maximum 60% penalty
  MIN_SCORE: 0.4,                 // Minimum score floor

  /**
   * Severity multipliers for different violation types
   */
  SEVERITY_MULTIPLIERS: {
    fake_statistic: 2.0,          // Fake statistics are severe
    superlative_claim: 1.5,       // "Best", "First", "Only" claims
    unverified_testimonial: 1.5,  // Fake testimonials
    time_claim: 1.0,              // Time-based claims
    vague_user_count: 1.0,        // Vague user counts
  },
} as const

// ==========================================
// SEMANTIC SIMILARITY CONFIGURATION
// ==========================================

export const SEMANTIC_CONFIG = {
  /**
   * Component weights for combined score
   */
  WEIGHTS: {
    termOverlap: 0.40,          // 40% weight
    keyPhraseMatch: 0.35,       // 35% weight
    topicAlignment: 0.25,       // 25% weight
  },

  /**
   * Score bounds
   */
  MIN_SCORE: 0.1,               // Minimum floor
  MAX_SCORE: 1.0,               // Maximum cap
} as const

// ==========================================
// OVERALL GEO SCORE CONFIGURATION
// ==========================================

export const GEO_SCORE_CONFIG = {
  /**
   * Raw score normalization denominators
   * Used to convert raw scores to 0-1 scale
   */
  NORMALIZATION: {
    keywordDensity: 20,         // Max 20 points
    aiExposure: 30,             // Max 30 points
    groundingQuality: 20,       // Max 20 points
    questionPatterns: 20,       // Max 20 points
    sentenceStructure: 15,      // Max 15 points
    lengthCompliance: 15,       // Max 15 points
  },

  /**
   * Default estimates when actual scores unavailable
   * Used for graceful degradation
   */
  DEFAULT_ESTIMATES: {
    uspCoverage: 0.7,           // 70% default
    semanticSimilarity: 0.75,   // 75% default
    antiFabrication: 0.8,       // 80% default (high due to guardrails)
  },

  /**
   * Final score output scale
   */
  OUTPUT_SCALE: 100,            // 0-100 final score
} as const

// ==========================================
// TYPE EXPORTS
// ==========================================

export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type SourceTier = 1 | 2 | 3 | 4

/**
 * Helper to check if confidence level meets minimum threshold
 */
export function meetsConfidenceThreshold(
  level: ConfidenceLevel,
  minLevel: ConfidenceLevel = USP_CONFIG.MIN_CONFIDENCE_LEVEL
): boolean {
  const hierarchy: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }
  return hierarchy[level] >= hierarchy[minLevel]
}

/**
 * Get tier score configuration for a given tier
 */
export function getTierScoreConfig(tier: SourceTier) {
  switch (tier) {
    case 1:
      return GROUNDING_CONFIG.TIER_SCORES.tier1
    case 2:
      return GROUNDING_CONFIG.TIER_SCORES.tier2
    case 3:
      return GROUNDING_CONFIG.TIER_SCORES.tier3
    default:
      return { pointsPerSource: 0, maxPoints: 0 }
  }
}
