/**
 * Anti-Fabrication Guardrails
 * Prevents AI hallucinations and ensures evidence-based content generation
 */

import type { FabricationCheck, ConfidenceLevel } from '@/types/geo-v2'
import { SAFE_LANGUAGE_PATTERNS } from '@/types/geo-v2'

/**
 * Check content for potential fabrications
 * Returns violations and suggested safe alternatives
 */
export function checkForFabrications(content: string): FabricationCheck {
  const violations: string[] = []
  const suggestions: string[] = []

  // Check for forbidden patterns
  for (const pattern of SAFE_LANGUAGE_PATTERNS.forbidden) {
    const matches = content.match(pattern)
    if (matches) {
      violations.push(`Forbidden pattern found: "${matches[0]}"`)
      suggestions.push(getSafeAlternative(matches[0]))
    }
  }

  return {
    hasFabrication: violations.length > 0,
    violations,
    suggestions,
  }
}

/**
 * Get a safe language alternative for a fabrication
 */
function getSafeAlternative(fabrication: string): string {
  const lower = fabrication.toLowerCase()

  // Percentage claims without evidence
  if (/\d+%\s*(faster|better|improved|increase)/i.test(fabrication)) {
    return `Replace "${fabrication}" with "Designed for enhanced performance" or "Optimized for improved efficiency"`
  }

  // Studies/research claims
  if (/studies\s+show|research\s+indicates/i.test(fabrication)) {
    return `Replace "${fabrication}" with "Built to support" or "Engineered to deliver"`
  }

  // Proven claims
  if (/proven\s+to|scientifically\s+verified/i.test(fabrication)) {
    return `Replace "${fabrication}" with "Designed for" or "Created for users who"`
  }

  // Expert claims
  if (/experts\s+agree/i.test(fabrication)) {
    return `Replace "${fabrication}" with "Enables professionals to" or "Crafted for"`
  }

  // User report claims with percentages
  if (/users\s+report\s+\d+%/i.test(fabrication)) {
    return `Replace "${fabrication}" with "Potential improvement in" or "Optimized for"`
  }

  return `Consider using safe language like: ${SAFE_LANGUAGE_PATTERNS.safe.slice(0, 3).join(', ')}`
}

/**
 * Validate and sanitize content by removing fabrications
 * Returns cleaned content with safe language replacements
 */
export function sanitizeContent(content: string): {
  sanitized: string
  wasModified: boolean
  modifications: string[]
} {
  let sanitized = content
  const modifications: string[] = []

  // Replace percentage claims without evidence
  sanitized = sanitized.replace(
    /(\d+)%\s+(faster|better|improved|increase|improvement)/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'significantly enhanced'
    }
  )

  // Replace "studies show" type claims
  sanitized = sanitized.replace(
    /studies\s+show\s+that?/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'Designed to provide'
    }
  )

  // Replace "research indicates" claims
  sanitized = sanitized.replace(
    /research\s+indicates\s+that?/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'Built to support'
    }
  )

  // Replace "proven to" claims
  sanitized = sanitized.replace(
    /proven\s+to\s+/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'Engineered to '
    }
  )

  // Replace "scientifically verified" claims
  sanitized = sanitized.replace(
    /scientifically\s+verified/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'carefully designed'
    }
  )

  // Replace "experts agree" claims
  sanitized = sanitized.replace(
    /experts\s+agree\s+that?/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'Enables professionals to achieve'
    }
  )

  // Replace user report percentage claims
  sanitized = sanitized.replace(
    /users\s+report\s+(\d+)%/gi,
    (match) => {
      modifications.push(`Replaced "${match}" with safe language`)
      return 'users experience potential improvement'
    }
  )

  return {
    sanitized,
    wasModified: modifications.length > 0,
    modifications,
  }
}

/**
 * Determine appropriate confidence level based on available evidence
 */
export function determineConfidenceLevel(params: {
  hasOfficialSources: boolean
  hasTechMediaSources: boolean
  hasCommunitySources: boolean
  hasVideoContent: boolean
  groundingSignalCount: number
}): ConfidenceLevel {
  const {
    hasOfficialSources,
    hasTechMediaSources,
    hasCommunitySources,
    hasVideoContent,
    groundingSignalCount,
  } = params

  // High confidence: Official sources or multiple tier-1/2 sources
  if (hasOfficialSources) {
    return 'high'
  }

  // High confidence: Multiple tech media sources with good signals
  if (hasTechMediaSources && groundingSignalCount >= 3) {
    return 'high'
  }

  // Medium confidence: Tech media or community sources
  if (hasTechMediaSources || (hasCommunitySources && groundingSignalCount >= 2)) {
    return 'medium'
  }

  // Medium confidence: Video content with some grounding signals
  if (hasVideoContent && groundingSignalCount >= 1) {
    return 'medium'
  }

  // Low confidence: Video content only or no verification
  return 'low'
}

/**
 * Generate safe language for low-confidence content
 * For new products without established grounding data
 */
export function generateSafeLanguage(
  claim: string,
  category: string,
  confidence: ConfidenceLevel
): string {
  if (confidence === 'high') {
    return claim // Return as-is for high confidence
  }

  const safePrefix = SAFE_LANGUAGE_PATTERNS.safe[
    Math.floor(Math.random() * SAFE_LANGUAGE_PATTERNS.safe.length)
  ]

  if (confidence === 'medium') {
    // Medium confidence: Slightly softer language
    return `${claim.replace(/^(The|This|It)\s+/i, '')} – ${safePrefix.toLowerCase()} enhanced ${category.toLowerCase()} capabilities`
  }

  // Low confidence: Maximum caution
  return `${safePrefix} ${category.toLowerCase()} performance with ${claim.replace(/\d+%\s*/g, 'potential ').toLowerCase()}`
}

/**
 * Validate case study content for fabrications
 * Case studies are high-risk for hallucinations
 */
export function validateCaseStudy(caseStudy: {
  title: string
  scenario: string
  solution: string
}): {
  isValid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check title
  const titleCheck = checkForFabrications(caseStudy.title)
  if (titleCheck.hasFabrication) {
    issues.push(...titleCheck.violations.map(v => `Title: ${v}`))
    recommendations.push(...titleCheck.suggestions)
  }

  // Check scenario
  const scenarioCheck = checkForFabrications(caseStudy.scenario)
  if (scenarioCheck.hasFabrication) {
    issues.push(...scenarioCheck.violations.map(v => `Scenario: ${v}`))
    recommendations.push(...scenarioCheck.suggestions)
  }

  // Check solution
  const solutionCheck = checkForFabrications(caseStudy.solution)
  if (solutionCheck.hasFabrication) {
    issues.push(...solutionCheck.violations.map(v => `Solution: ${v}`))
    recommendations.push(...solutionCheck.suggestions)
  }

  // Check for invented company names (common hallucination pattern)
  const companyPattern = /(?:at|for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Company|Studios|Productions))?)/g
  const allContent = `${caseStudy.title} ${caseStudy.scenario} ${caseStudy.solution}`
  const companyMatches = allContent.match(companyPattern)

  if (companyMatches && companyMatches.length > 0) {
    issues.push('Potential invented company names detected - verify authenticity')
    recommendations.push('Use generic role descriptions like "content creator" or "professional photographer" instead of specific company names')
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
  }
}

/**
 * Content quality gate for anti-fabrication
 * Returns true if content passes all checks
 */
export function passesQualityGate(
  content: string,
  requiredConfidence: ConfidenceLevel = 'medium'
): boolean {
  const check = checkForFabrications(content)

  // Fail if any fabrications detected
  if (check.hasFabrication) {
    return false
  }

  // Additional strict checks for high confidence requirement
  if (requiredConfidence === 'high') {
    // Check for vague superlatives without specifics
    const vaguePatterns = [
      /best\s+in\s+class/i,
      /industry[\s-]leading/i,
      /world[\s-]?class/i,
      /revolutionary/i,
      /game[\s-]?changing/i,
    ]

    for (const pattern of vaguePatterns) {
      if (pattern.test(content)) {
        return false
      }
    }
  }

  return true
}

/**
 * Get anti-fabrication system prompt for AI generation
 */
export function getAntiFabricationPrompt(confidence: ConfidenceLevel): string {
  const baseRules = `
## ANTI-FABRICATION RULES (MANDATORY)
1. NEVER invent percentages or statistics without evidence
2. NEVER claim "studies show" or "experts agree" without sources
3. NEVER create fake company names or testimonials
4. NEVER use unverified performance claims`

  if (confidence === 'low') {
    return `${baseRules}

## LOW CONFIDENCE MODE - STRICT REQUIREMENTS
- Use ONLY safe language patterns:
  ${SAFE_LANGUAGE_PATTERNS.safe.map(s => `• "${s}..."`).join('\n  ')}
- DO NOT make specific claims about new product features
- Focus on design intent rather than measured outcomes
- Avoid comparative statements without evidence`
  }

  if (confidence === 'medium') {
    return `${baseRules}

## MEDIUM CONFIDENCE MODE
- Use hedging language for unverified claims
- Reference source tier when making claims
- Prefer "designed for" over "proven to"`
  }

  return `${baseRules}

## HIGH CONFIDENCE MODE
- Verified claims can use direct language
- Include source citations where available
- Maintain factual accuracy`
}
