/**
 * Stage Dependencies Configuration
 * Defines which stages depend on previous stage results
 */

import type { PromptStage } from '@/types/prompt-studio'

export interface StageDependencyConfig {
  dependsOn: PromptStage[]
  requiredFields: string[]
  fieldMapping: Record<string, string> // Maps dependency output field to test input field
}

/**
 * Stage dependency map
 *
 * Flow:
 * grounding (independent - web search for user intent signals)
 *      ↓
 * description ← needs grounding result (keywords, sources)
 *      ↓
 * usp ← needs description result (groundingSources, descriptionContent)
 *      ↓
 * faq ← needs usp result (usps) + grounding data
 * case_studies ← needs usp result (usps) + grounding data
 * keywords ← needs description result
 *      ↓
 * hashtags ← needs usp + keywords results
 *
 * chapters is independent (uses video/SRT data directly)
 */
export const STAGE_DEPENDENCIES: Record<PromptStage, StageDependencyConfig> = {
  grounding: {
    dependsOn: [],
    requiredFields: [],
    fieldMapping: {},
  },
  description: {
    dependsOn: ['grounding'],
    requiredFields: ['grounding_keywords', 'grounding_sources'],
    fieldMapping: {
      // grounding output → description input
      grounding_keywords: 'groundingData.keywords',
      grounding_sources: 'groundingData.sources',
    },
  },
  usp: {
    dependsOn: ['description'],
    requiredFields: ['full_description'],
    fieldMapping: {
      // description output → usp input
      full_description: 'previousStageResult',
    },
  },
  faq: {
    dependsOn: ['usp', 'grounding'],
    requiredFields: ['usps', 'grounding_keywords'],
    fieldMapping: {
      // usp output → faq input
      usps: 'usps',
      // grounding output → faq input
      grounding_keywords: 'groundingData.keywords',
      grounding_sources: 'groundingData.sources',
    },
  },
  chapters: {
    dependsOn: [],
    requiredFields: [],
    fieldMapping: {},
  },
  case_studies: {
    dependsOn: ['usp', 'grounding'],
    requiredFields: ['usps', 'grounding_keywords'],
    fieldMapping: {
      // usp output → case_studies input
      usps: 'usps',
      // grounding output → case_studies input
      grounding_keywords: 'groundingData.keywords',
      grounding_sources: 'groundingData.sources',
    },
  },
  keywords: {
    dependsOn: ['description'],
    requiredFields: ['full_description'],
    fieldMapping: {
      // description output → keywords input
      full_description: 'previousStageResult',
    },
  },
  hashtags: {
    dependsOn: ['usp', 'keywords'],
    requiredFields: ['usps', 'product_keywords', 'generic_keywords'],
    fieldMapping: {
      // Multiple stage outputs → hashtags input
      usps: 'usps',
      product_keywords: 'previousStageResult.product_keywords',
      generic_keywords: 'previousStageResult.generic_keywords',
    },
  },
}

/**
 * Get human-readable dependency info for a stage
 */
export function getDependencyInfo(stage: PromptStage): {
  hasDependencies: boolean
  dependencyNames: string[]
  description: string
} {
  const config = STAGE_DEPENDENCIES[stage]
  const hasDependencies = config.dependsOn.length > 0

  const stageLabels: Record<PromptStage, string> = {
    grounding: 'Grounding',
    description: 'Description',
    usp: 'USP',
    faq: 'FAQ',
    chapters: 'Chapters',
    case_studies: 'Case Studies',
    keywords: 'Keywords',
    hashtags: 'Hashtags',
  }

  const dependencyNames = config.dependsOn.map(s => stageLabels[s])

  let description = ''
  if (hasDependencies) {
    if (config.dependsOn.length === 1) {
      description = `Requires ${dependencyNames[0]} result`
    } else {
      const lastDep = [...dependencyNames].pop()
      const otherDeps = dependencyNames.slice(0, -1)
      description = `Requires ${otherDeps.join(', ')} and ${lastDep} results`
    }
  } else {
    description = 'No dependencies (independent stage)'
  }

  return {
    hasDependencies,
    dependencyNames: config.dependsOn.map(s => stageLabels[s]),
    description,
  }
}

/**
 * Check if all required dependencies have test results
 */
export function checkDependenciesReady(
  stage: PromptStage,
  availableResults: Record<PromptStage, boolean>
): {
  ready: boolean
  missing: PromptStage[]
  available: PromptStage[]
} {
  const config = STAGE_DEPENDENCIES[stage]
  const missing: PromptStage[] = []
  const available: PromptStage[] = []

  for (const dep of config.dependsOn) {
    if (availableResults[dep]) {
      available.push(dep)
    } else {
      missing.push(dep)
    }
  }

  return {
    ready: missing.length === 0,
    missing,
    available,
  }
}

/**
 * Extract required fields from stage output for next stage input
 */
export function extractFieldsForNextStage(
  sourceStage: PromptStage,
  targetStage: PromptStage,
  outputData: Record<string, unknown>
): Record<string, unknown> {
  const targetConfig = STAGE_DEPENDENCIES[targetStage]

  // Check if source stage is a dependency of target
  if (!targetConfig.dependsOn.includes(sourceStage)) {
    return {}
  }

  const extracted: Record<string, unknown> = {}

  // Extract mapped fields based on source stage
  for (const [outputField, inputField] of Object.entries(targetConfig.fieldMapping)) {
    // Only extract fields that come from this source stage
    const isGroundingField = outputField.startsWith('grounding_')
    const isFromGrounding = sourceStage === 'grounding'

    if (isGroundingField !== isFromGrounding) {
      continue // Skip fields from other stages
    }

    if (outputData[outputField] !== undefined) {
      // Handle nested field mapping (e.g., 'groundingData.keywords')
      if (inputField.includes('.')) {
        const [parent, child] = inputField.split('.')
        if (!extracted[parent]) {
          extracted[parent] = {}
        }
        (extracted[parent] as Record<string, unknown>)[child] = outputData[outputField]
      } else {
        extracted[inputField] = outputData[outputField]
      }
    }
  }

  return extracted
}
