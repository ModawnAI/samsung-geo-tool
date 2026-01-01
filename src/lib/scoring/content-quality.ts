/**
 * Content Quality Scoring
 * Calculates semantic similarity and anti-fabrication scores
 * Based on actual content analysis, not hardcoded values
 */

import { checkForFabrications } from '@/lib/geo-v2/anti-fabrication'

// ==========================================
// TYPES
// ==========================================

export interface SemanticSimilarityResult {
  score: number // 0-1 scale
  termOverlap: number // Percentage of source terms found in generated content
  keyPhraseMatch: number // Key phrase coverage
  topicAlignment: number // Topic consistency score
  details: {
    sourceTermCount: number
    matchedTermCount: number
    generatedTermCount: number
  }
}

export interface AntiFabricationResult {
  score: number // 0-1 scale (1 = no fabrications)
  violationCount: number
  totalCheckPoints: number
  violationDetails: string[]
  passedChecks: string[]
}

export interface ContentQualityScores {
  semanticSimilarity: SemanticSimilarityResult
  antiFabrication: AntiFabricationResult
  keywordDensity?: KeywordDensityResult
}

export interface KeywordDensityResult {
  score: number // 0-1 scale
  densityPercentage: number // Actual density as percentage
  totalKeywordOccurrences: number
  totalWordCount: number
  keywordBreakdown: {
    keyword: string
    occurrences: number
    variants: string[]
  }[]
  distribution: {
    description: number
    faq: number
    caseStudies: number
    usps: number
  }
}

// ==========================================
// TEXT PROCESSING UTILITIES
// ==========================================

/**
 * Tokenize and normalize text for comparison
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2) // Remove very short words
    .filter(word => !STOP_WORDS.has(word))
}

/**
 * Extract n-grams from tokens
 */
function extractNgrams(tokens: string[], n: number): Set<string> {
  const ngrams = new Set<string>()
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '))
  }
  return ngrams
}

/**
 * Extract key phrases (bigrams and trigrams)
 */
function extractKeyPhrases(text: string): Set<string> {
  const tokens = tokenize(text)
  const bigrams = extractNgrams(tokens, 2)
  const trigrams = extractNgrams(tokens, 3)
  return new Set([...bigrams, ...trigrams])
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0

  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])

  return intersection.size / union.size
}

/**
 * Calculate term frequency weighted overlap
 */
function weightedTermOverlap(sourceTokens: string[], generatedTokens: string[]): number {
  const sourceTermFreq = new Map<string, number>()
  const generatedTermSet = new Set(generatedTokens)

  // Build source term frequency
  for (const token of sourceTokens) {
    sourceTermFreq.set(token, (sourceTermFreq.get(token) || 0) + 1)
  }

  // Calculate weighted match
  let matchedWeight = 0
  let totalWeight = 0

  for (const [term, freq] of sourceTermFreq) {
    const weight = Math.log(freq + 1) // Log weighting for term frequency
    totalWeight += weight
    if (generatedTermSet.has(term)) {
      matchedWeight += weight
    }
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0
}

// Stop words to filter out common words
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'also', 'like', 'well', 'even',
  'new', 'way', 'may', 'use', 'one', 'two', 'make', 'get', 'see', 'your',
  'you', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
  'its', 'has', 'have', 'had', 'been', 'being', 'are', 'was', 'were', 'is',
])

// ==========================================
// SEMANTIC SIMILARITY CALCULATION
// ==========================================

/**
 * Calculate semantic similarity between source content and generated content
 * Uses multiple signals: term overlap, key phrase matching, and topic alignment
 */
export function calculateSemanticSimilarity(
  sourceContent: string,
  generatedContent: string,
  additionalContext?: string[]
): SemanticSimilarityResult {
  // Combine source content with any additional context (like grounding data)
  const fullSourceContent = additionalContext
    ? [sourceContent, ...additionalContext].join(' ')
    : sourceContent

  // Tokenize both contents
  const sourceTokens = tokenize(fullSourceContent)
  const generatedTokens = tokenize(generatedContent)

  // Calculate term overlap (weighted)
  const termOverlap = weightedTermOverlap(sourceTokens, generatedTokens)

  // Calculate key phrase match
  const sourceKeyPhrases = extractKeyPhrases(fullSourceContent)
  const generatedKeyPhrases = extractKeyPhrases(generatedContent)
  const keyPhraseMatch = jaccardSimilarity(sourceKeyPhrases, generatedKeyPhrases)

  // Calculate topic alignment using unique term sets
  const sourceUniqueTerms = new Set(sourceTokens)
  const generatedUniqueTerms = new Set(generatedTokens)
  const topicAlignment = jaccardSimilarity(sourceUniqueTerms, generatedUniqueTerms)

  // Calculate matched term count
  const matchedTerms = [...sourceUniqueTerms].filter(t => generatedUniqueTerms.has(t))

  // Weighted combination of all signals
  // Term overlap: 40%, Key phrases: 35%, Topic alignment: 25%
  const combinedScore = (
    termOverlap * 0.40 +
    keyPhraseMatch * 0.35 +
    topicAlignment * 0.25
  )

  // Apply minimum floor and cap at 1.0
  const finalScore = Math.min(1.0, Math.max(0.1, combinedScore))

  return {
    score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
    termOverlap: Math.round(termOverlap * 100) / 100,
    keyPhraseMatch: Math.round(keyPhraseMatch * 100) / 100,
    topicAlignment: Math.round(topicAlignment * 100) / 100,
    details: {
      sourceTermCount: sourceUniqueTerms.size,
      matchedTermCount: matchedTerms.length,
      generatedTermCount: generatedUniqueTerms.size,
    },
  }
}

// ==========================================
// ANTI-FABRICATION SCORING
// ==========================================

/**
 * Additional fabrication patterns beyond the existing checker
 */
const ADDITIONAL_FABRICATION_PATTERNS = [
  // Unverified statistics
  { pattern: /\b\d{1,3}(?:,\d{3})*\s*(?:users?|customers?|people|professionals?)\s+(?:use|prefer|love|trust)/gi, name: 'unverified_user_count' },
  { pattern: /\b(?:millions?|thousands?|hundreds?)\s+of\s+(?:users?|customers?|people)/gi, name: 'vague_user_claims' },

  // Time-based claims
  { pattern: /\bin\s+(?:just\s+)?(?:\d+|a few|several)\s+(?:seconds?|minutes?|hours?|days?)\b/gi, name: 'time_claims' },

  // Award/recognition claims without source
  { pattern: /\b(?:award[- ]?winning|award[- ]?nominated|best[- ]?selling|top[- ]?rated)\b/gi, name: 'unverified_awards' },

  // First/only/best claims
  { pattern: /\b(?:world'?s?\s+)?(?:first|only|best|leading|#1|number\s+one)\b/gi, name: 'superlative_claims' },

  // Invented testimonial patterns
  { pattern: /[""][^""]{20,}[""]\s*[-–—]\s*[A-Z][a-z]+(?:\s+[A-Z]\.?)?/g, name: 'possible_fake_testimonial' },
]

/**
 * Check all content sections for fabrications
 */
function checkAllSectionsForFabrications(sections: { name: string; content: string }[]): {
  violations: { section: string; issue: string }[]
  passedChecks: string[]
} {
  const violations: { section: string; issue: string }[] = []
  const passedChecks: string[] = []

  for (const section of sections) {
    // Use existing fabrication checker
    const baseCheck = checkForFabrications(section.content)
    if (baseCheck.hasFabrication) {
      for (const violation of baseCheck.violations) {
        violations.push({ section: section.name, issue: violation })
      }
    } else {
      passedChecks.push(`${section.name}: Base patterns clean`)
    }

    // Check additional patterns
    for (const { pattern, name } of ADDITIONAL_FABRICATION_PATTERNS) {
      const matches = section.content.match(pattern)
      if (matches && matches.length > 0) {
        violations.push({
          section: section.name,
          issue: `${name}: "${matches[0].substring(0, 50)}${matches[0].length > 50 ? '...' : ''}"`,
        })
      }
    }
  }

  return { violations, passedChecks }
}

/**
 * Calculate anti-fabrication score based on actual content analysis
 */
export function calculateAntiFabricationScore(
  descriptionContent: string,
  faqContent: string[],
  caseStudyContent: string[],
  uspContent: string[]
): AntiFabricationResult {
  // Prepare all content sections
  const sections = [
    { name: 'description', content: descriptionContent },
    ...faqContent.map((faq, i) => ({ name: `faq_${i + 1}`, content: faq })),
    ...caseStudyContent.map((cs, i) => ({ name: `case_study_${i + 1}`, content: cs })),
    ...uspContent.map((usp, i) => ({ name: `usp_${i + 1}`, content: usp })),
  ]

  const { violations, passedChecks } = checkAllSectionsForFabrications(sections)

  // Calculate total check points (each section checked against base + additional patterns)
  const patternCount = 1 + ADDITIONAL_FABRICATION_PATTERNS.length // 1 for base check
  const totalCheckPoints = sections.length * patternCount

  // Score calculation: start at 1.0 and reduce for each violation
  // Each violation reduces score, with diminishing returns for many violations
  const violationPenalty = violations.length > 0
    ? Math.min(0.6, violations.length * 0.08) // Max 60% penalty, 8% per violation
    : 0

  const score = Math.max(0.4, 1.0 - violationPenalty) // Minimum score of 0.4

  return {
    score: Math.round(score * 100) / 100,
    violationCount: violations.length,
    totalCheckPoints,
    violationDetails: violations.map(v => `[${v.section}] ${v.issue}`),
    passedChecks,
  }
}

// ==========================================
// KEYWORD DENSITY CALCULATION
// ==========================================

/**
 * Generate keyword variants for matching
 * Includes plural forms, common suffixes, and case variations
 */
function generateKeywordVariants(keyword: string): string[] {
  const base = keyword.toLowerCase().trim()
  const variants = [base]

  // Handle multi-word keywords
  const words = base.split(/\s+/)
  if (words.length > 1) {
    // Add the phrase as-is
    variants.push(words.join(' '))
  }

  // Generate variants for each word
  for (const word of words) {
    // Plural forms
    if (!word.endsWith('s')) {
      variants.push(word + 's')
      variants.push(word + 'es')
    }
    // Remove trailing 's' for singular
    if (word.endsWith('s') && word.length > 2) {
      variants.push(word.slice(0, -1))
    }
    if (word.endsWith('es') && word.length > 3) {
      variants.push(word.slice(0, -2))
    }
    // Common suffixes
    if (word.endsWith('ing')) {
      variants.push(word.slice(0, -3))
      variants.push(word.slice(0, -3) + 'e')
    }
    if (word.endsWith('ed')) {
      variants.push(word.slice(0, -2))
      variants.push(word.slice(0, -1))
    }
    if (word.endsWith('tion')) {
      variants.push(word.slice(0, -4) + 'te')
    }
  }

  // Remove duplicates
  return [...new Set(variants)].filter(v => v.length > 1)
}

/**
 * Count keyword occurrences in text, including variants
 */
function countKeywordOccurrences(
  text: string,
  keyword: string
): { count: number; matchedVariants: string[] } {
  const lowerText = text.toLowerCase()
  const variants = generateKeywordVariants(keyword)
  let totalCount = 0
  const matchedVariants: string[] = []

  for (const variant of variants) {
    // Use word boundary matching
    const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const matches = lowerText.match(regex)
    if (matches && matches.length > 0) {
      totalCount += matches.length
      if (!matchedVariants.includes(variant)) {
        matchedVariants.push(variant)
      }
    }
  }

  return { count: totalCount, matchedVariants }
}

/**
 * Count total words in text
 */
function countWords(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length
}

/**
 * Calculate keyword density score based on actual occurrences
 * Optimal density is typically 1-3% for SEO content
 */
export function calculateKeywordDensity(
  keywords: string[],
  descriptionContent: string,
  faqContent: string[],
  caseStudyContent: string[],
  uspContent: string[]
): KeywordDensityResult {
  // Combine all content
  const allFaqContent = faqContent.join(' ')
  const allCaseStudyContent = caseStudyContent.join(' ')
  const allUspContent = uspContent.join(' ')
  const allContent = [
    descriptionContent,
    allFaqContent,
    allCaseStudyContent,
    allUspContent,
  ].join(' ')

  // Count total words
  const totalWordCount = countWords(allContent)

  // Count occurrences per keyword
  const keywordBreakdown: KeywordDensityResult['keywordBreakdown'] = []
  let totalKeywordOccurrences = 0

  for (const keyword of keywords) {
    const { count, matchedVariants } = countKeywordOccurrences(allContent, keyword)
    keywordBreakdown.push({
      keyword,
      occurrences: count,
      variants: matchedVariants,
    })
    totalKeywordOccurrences += count
  }

  // Calculate distribution across content sections
  const distribution = {
    description: keywords.reduce((sum, kw) =>
      sum + countKeywordOccurrences(descriptionContent, kw).count, 0),
    faq: keywords.reduce((sum, kw) =>
      sum + countKeywordOccurrences(allFaqContent, kw).count, 0),
    caseStudies: keywords.reduce((sum, kw) =>
      sum + countKeywordOccurrences(allCaseStudyContent, kw).count, 0),
    usps: keywords.reduce((sum, kw) =>
      sum + countKeywordOccurrences(allUspContent, kw).count, 0),
  }

  // Calculate density percentage
  const densityPercentage = totalWordCount > 0
    ? (totalKeywordOccurrences / totalWordCount) * 100
    : 0

  // Calculate score based on optimal density range
  // Optimal: 1-3% density, with diminishing returns above 3%
  // Score formula:
  // - 0% density = 0.2 (minimum)
  // - 0.5% density = 0.5
  // - 1% density = 0.7
  // - 2% density = 0.9
  // - 3% density = 1.0
  // - >3% density = starts decreasing (keyword stuffing penalty)
  let score: number
  if (densityPercentage <= 0) {
    score = 0.2
  } else if (densityPercentage <= 1) {
    // 0-1%: linear from 0.4 to 0.7
    score = 0.4 + (densityPercentage * 0.3)
  } else if (densityPercentage <= 2) {
    // 1-2%: linear from 0.7 to 0.9
    score = 0.7 + ((densityPercentage - 1) * 0.2)
  } else if (densityPercentage <= 3) {
    // 2-3%: linear from 0.9 to 1.0
    score = 0.9 + ((densityPercentage - 2) * 0.1)
  } else if (densityPercentage <= 5) {
    // 3-5%: slight penalty, decreasing from 1.0 to 0.8
    score = 1.0 - ((densityPercentage - 3) * 0.1)
  } else {
    // >5%: keyword stuffing penalty
    score = Math.max(0.5, 0.8 - ((densityPercentage - 5) * 0.1))
  }

  // Bonus for even distribution across sections
  const sectionCount = [
    distribution.description > 0,
    distribution.faq > 0,
    distribution.caseStudies > 0,
    distribution.usps > 0,
  ].filter(Boolean).length

  // Distribution bonus: up to 10% extra for appearing in all 4 sections
  const distributionBonus = (sectionCount / 4) * 0.1
  score = Math.min(1.0, score + distributionBonus)

  // Bonus for using multiple keywords (if provided)
  const keywordsWithOccurrences = keywordBreakdown.filter(k => k.occurrences > 0).length
  const keywordCoverageBonus = keywords.length > 0
    ? (keywordsWithOccurrences / keywords.length) * 0.1
    : 0
  score = Math.min(1.0, score + keywordCoverageBonus)

  return {
    score: Math.round(score * 100) / 100,
    densityPercentage: Math.round(densityPercentage * 100) / 100,
    totalKeywordOccurrences,
    totalWordCount,
    keywordBreakdown,
    distribution,
  }
}

// ==========================================
// COMBINED QUALITY SCORING
// ==========================================

/**
 * Calculate all content quality scores
 */
export function calculateContentQualityScores(params: {
  srtContent: string
  generatedDescription: string
  faqAnswers: string[]
  caseStudies: string[]
  usps: string[]
  groundingData?: string[]
  keywords?: string[]
}): ContentQualityScores {
  const {
    srtContent,
    generatedDescription,
    faqAnswers,
    caseStudies,
    usps,
    groundingData,
    keywords,
  } = params

  // Calculate semantic similarity
  const allGeneratedContent = [
    generatedDescription,
    ...faqAnswers,
    ...caseStudies,
    ...usps,
  ].join(' ')

  const semanticSimilarity = calculateSemanticSimilarity(
    srtContent,
    allGeneratedContent,
    groundingData
  )

  // Calculate anti-fabrication score
  const antiFabrication = calculateAntiFabricationScore(
    generatedDescription,
    faqAnswers,
    caseStudies,
    usps
  )

  // Calculate keyword density if keywords provided
  const keywordDensity = keywords && keywords.length > 0
    ? calculateKeywordDensity(
        keywords,
        generatedDescription,
        faqAnswers,
        caseStudies,
        usps
      )
    : undefined

  return {
    semanticSimilarity,
    antiFabrication,
    keywordDensity,
  }
}
