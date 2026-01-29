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
 * description (independent)
 *      ↓
 * usp ← needs description result (groundingSources, descriptionContent)
 *      ↓
 * faq ← needs usp result (usps)
 * case_studies ← needs usp result (usps)
 * keywords ← needs description result
 *      ↓
 * hashtags ← needs usp + keywords results
 *
 * chapters is independent (uses video/SRT data directly)
 */
export const STAGE_DEPENDENCIES: Record<PromptStage, StageDependencyConfig> = {
  description: {
    dependsOn: [],
    requiredFields: [],
    fieldMapping: {},
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
    dependsOn: ['usp'],
    requiredFields: ['usps'],
    fieldMapping: {
      // usp output → faq input
      usps: 'usps',
    },
  },
  chapters: {
    dependsOn: [],
    requiredFields: [],
    fieldMapping: {},
  },
  case_studies: {
    dependsOn: ['usp'],
    requiredFields: ['usps'],
    fieldMapping: {
      // usp output → case_studies input
      usps: 'usps',
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
      const last = dependencyNames.pop()
      description = `Requires ${dependencyNames.join(', ')} and ${last} results`
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

  // Extract mapped fields
  for (const [outputField, inputField] of Object.entries(targetConfig.fieldMapping)) {
    if (outputData[outputField] !== undefined) {
      // Handle nested field mapping (e.g., 'previousStageResult.product_keywords')
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
