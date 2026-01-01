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
  // Guard against undefined/null input
  if (!content) {
    return {
      sanitized: '',
      wasModified: false,
      modifications: [],
    }
  }

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
 *
 * Per 2-Stage Content Prioritization Strategy:
 * - Video content = GROUND TRUTH = ALWAYS HIGH confidence
 * - Grounding = Supplementary only, never downgrades confidence
 *
 * ALL USPs must be HIGH confidence. The 2-Stage approach means:
 * 1. If extracted from video → HIGH (video is authoritative)
 * 2. If supplemented by grounding → HIGH (grounding adds evidence, doesn't reduce)
 */
export function determineConfidenceLevel(params: {
  hasOfficialSources: boolean
  hasTechMediaSources: boolean
  hasCommunitySources: boolean
  hasVideoContent: boolean
  groundingSignalCount: number
}): ConfidenceLevel {
  // Per 2-Stage Strategy: ALL content derived from video + grounding is HIGH confidence
  // Video content is treated as ground truth
  // Grounding sources only supplement - they never downgrade confidence
  return 'high'
}

/**
 * Generate safe language for content generation
 *
 * Per 2-Stage Content Prioritization Strategy:
 * ALL USPs are HIGH confidence (video = ground truth)
 * Safe language is still used for Anti-Fabrication compliance
 * but confidence parameter no longer changes output behavior
 */
export function generateSafeLanguage(
  claim: string,
  category: string,
  confidence: ConfidenceLevel
): string {
  // Per 2-Stage Strategy: All content is HIGH confidence
  // Return claim as-is - safe language patterns are now enforced
  // at the prompt level with Anti-Fabrication Rules
  return claim
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
 *
 * Per 2-Stage Content Prioritization Strategy:
 * ALL content is HIGH confidence (video = ground truth)
 * Anti-fabrication rules remain mandatory to prevent hallucinations
 */
export function getAntiFabricationPrompt(confidence: ConfidenceLevel): string {
  // Per 2-Stage Strategy: ALL USPs are HIGH confidence
  // Anti-fabrication rules remain essential regardless of confidence level
  return `
## ANTI-FABRICATION RULES (MANDATORY)
1. NEVER invent percentages or statistics without evidence
2. NEVER claim "studies show" or "experts agree" without sources
3. NEVER create fake company names or testimonials
4. NEVER use unverified performance claims

## 2-STAGE CONTENT PRIORITIZATION - HIGH CONFIDENCE MODE
Per 2-Stage Strategy: Video content = Ground truth (HIGH confidence)
Grounding = Supplementary evidence only

### SAFE LANGUAGE PATTERNS (Use when grounding is insufficient):
${SAFE_LANGUAGE_PATTERNS.safe.map(s => `• "${s}..."`).join('\n')}

### QUALITY STANDARDS:
- Verified claims can use direct language
- Include source citations where available
- Maintain factual accuracy
- Video-derived content is authoritative`
}
