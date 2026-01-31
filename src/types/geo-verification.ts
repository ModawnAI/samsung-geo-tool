/**
 * GEO Verification Types
 * Types for search engine visibility verification service
 */

/**
 * Result from running GEO verification
 */
export interface VerificationResult {
  productName: string
  keywords: string[]
  googleResults: SearchResult[]
  youtubeResults: SearchResult[]
  matchScore: MatchScore
  timestamp: string
  verificationId: string
  durationMs: number
}

/**
 * Individual search result from Google or YouTube
 */
export interface SearchResult {
  position: number
  title: string
  snippet: string
  url: string
  matchedKeywords: string[]
  isOwnContent?: boolean // True if URL is samsung.com or official Samsung channel
}

/**
 * Match score calculation result
 */
export interface MatchScore {
  /** Percentage of keywords found in search results (0-100) */
  keywordCoverage: number
  /** How well generated description matches search snippets (0-100) */
  descriptionMatch: number
  /** Combined overall score (0-100) */
  total: number
  /** Detailed breakdown */
  breakdown: MatchScoreBreakdown
}

/**
 * Detailed breakdown of match scoring
 */
export interface MatchScoreBreakdown {
  /** Number of keywords found in results */
  keywordsFound: number
  /** Total keywords searched */
  totalKeywords: number
  /** Number of Samsung-owned results found */
  ownContentCount: number
  /** Average position of Samsung content (lower is better) */
  avgSamsungPosition: number | null
  /** Google visibility metrics */
  google: PlatformMetrics
  /** YouTube visibility metrics */
  youtube: PlatformMetrics
}

/**
 * Platform-specific visibility metrics
 */
export interface PlatformMetrics {
  /** Total results analyzed */
  totalResults: number
  /** Results containing target keywords */
  relevantResults: number
  /** Samsung-owned content count */
  ownContent: number
  /** Average keyword match score across results */
  avgKeywordMatch: number
}

/**
 * API request for running verification
 */
export interface VerificationRequest {
  productName: string
  keywords: string[]
  generatedContent: {
    description: string
    hashtags?: string[]
    faq?: Array<{ question: string; answer: string }>
  }
  options?: VerificationOptions
}

/**
 * Options for verification
 */
export interface VerificationOptions {
  /** Max results to check per platform (default: 10) */
  maxResults?: number
  /** Include YouTube search (default: true) */
  includeYoutube?: boolean
  /** Include Google search (default: true) */
  includeGoogle?: boolean
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number
}

/**
 * API response for verification
 */
export interface VerificationResponse {
  success: boolean
  verificationId: string
  result?: VerificationResult
  error?: string
}

/**
 * Status during verification process
 */
export type VerificationStatus =
  | 'idle'
  | 'searching_google'
  | 'searching_youtube'
  | 'analyzing'
  | 'complete'
  | 'error'

/**
 * Progress update during verification
 */
export interface VerificationProgress {
  status: VerificationStatus
  message: string
  progress: number // 0-100
}
