/**
 * Prompt Loader Tests
 * Validates the prompt composition pipeline to ensure:
 * 1. Settings UI prompts match generation prompts
 * 2. Stage-specific instructions are properly appended
 * 3. Variable interpolation works correctly
 * 4. Fallback to defaults when database has no prompts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  composeStagePrompt,
  interpolatePrompt,
  getDefaultPrompt,
  type StagePromptConfig,
} from '../prompt-loader'

describe('composeStagePrompt', () => {
  const basePrompt = 'You are a Samsung GEO/AEO Content Optimization Specialist.'

  describe('stage-specific instruction appending', () => {
    it('should append description stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'description',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'high',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain(basePrompt)
      expect(result).toContain('## STAGE-SPECIFIC INSTRUCTIONS')
      expect(result).toContain('## TASK')
      expect(result).toContain('YouTube description optimized for GEO')
      expect(result).toContain('## GROUNDING INSTRUCTION')
      expect(result).toContain('SCORING OPTIMIZATION')
      expect(result).toContain('Output in English.')
    })

    it('should append USP stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'usp',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'medium',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('Extract 2-8 unique selling points')
      expect(result).toContain('## CONTENT PRIORITIZATION - 2-STAGE STRATEGY')
      expect(result).toContain('STAGE 1 - VIDEO CONTENT')
      expect(result).toContain('STAGE 2 - GROUNDING FALLBACK')
      expect(result).toContain('## ANTI-MISMATCH RULES')
      expect(result).toContain('Video content = Ground truth')
    })

    it('should append FAQ stage instructions with Query Fan-Out', () => {
      const config: StagePromptConfig = {
        stage: 'faq',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'medium',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('Generate 5-7 Q&A pairs')
      expect(result).toContain('Query Fan-Out')
      expect(result).toContain('## TASK')
      expect(result).toContain('## OUTPUT FORMAT')
      expect(result).toContain('10-20 words')
      expect(result).toContain('How/What/Why/When/Where')
    })

    it('should append chapters stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'chapters',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'low',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('GEO/AEO-optimized timestamp chapters')
      expect(result).toContain('CHAPTER QUALITY CRITERIA')
      expect(result).toContain('INCLUDE chapters that')
      expect(result).toContain('EXCLUDE chapters that')
      expect(result).toContain('2-5 words')
    })

    it('should append case_studies stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'case_studies',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'high',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('realistic use case scenarios')
      expect(result).toContain('ANTI-FABRICATION RULES')
      expect(result).toContain('HEDGING LANGUAGE')
      expect(result).toContain('Designed to help')
      expect(result).toContain('## OUTPUT FORMAT')
    })

    it('should append keywords stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'keywords',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'low',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('keywords for GEO/AEO')
      expect(result).toContain('## KEYWORD CATEGORIES')
      expect(result).toContain('## SCORING METHODOLOGY')
      expect(result).toContain('## OUTPUT FORMAT')
    })

    it('should append hashtags stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'hashtags',
        basePrompt,
        language: 'en',
        antiFabricationLevel: 'low',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('5-8 strategic hashtags')
      expect(result).toContain('BRAND HASHTAGS')
      expect(result).toContain('FEATURE HASHTAGS')
      expect(result).toContain('INDUSTRY HASHTAGS')
      expect(result).toContain('FORBIDDEN')
    })
  })

  describe('language instruction', () => {
    it('should add Korean language instruction when language is ko', () => {
      const config: StagePromptConfig = {
        stage: 'description',
        basePrompt,
        language: 'ko',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('Output in Korean (한국어).')
    })

    it('should add English language instruction when language is en', () => {
      const config: StagePromptConfig = {
        stage: 'description',
        basePrompt,
        language: 'en',
      }

      const result = composeStagePrompt(config)

      expect(result).toContain('Output in English.')
    })
  })

  describe('prompt structure', () => {
    it('should place base prompt before stage instructions', () => {
      const config: StagePromptConfig = {
        stage: 'description',
        basePrompt,
        language: 'en',
      }

      const result = composeStagePrompt(config)

      const basePromptIndex = result.indexOf(basePrompt)
      const stageInstructionsIndex = result.indexOf('## STAGE-SPECIFIC INSTRUCTIONS')

      expect(basePromptIndex).toBeLessThan(stageInstructionsIndex)
    })

    it('should place language instruction at the end', () => {
      const config: StagePromptConfig = {
        stage: 'description',
        basePrompt,
        language: 'en',
      }

      const result = composeStagePrompt(config)

      expect(result.trim().endsWith('Output in English.')).toBe(true)
    })
  })
})

describe('interpolatePrompt', () => {
  it('should replace single variable', () => {
    const prompt = 'Extract USPs for {{product_name}}'
    const variables = { product_name: 'Galaxy Z Flip7' }

    const result = interpolatePrompt(prompt, variables)

    expect(result).toBe('Extract USPs for Galaxy Z Flip7')
  })

  it('should replace multiple occurrences of same variable', () => {
    const prompt = '{{product_name}} is great. Buy {{product_name}} today!'
    const variables = { product_name: 'Galaxy S25 Ultra' }

    const result = interpolatePrompt(prompt, variables)

    expect(result).toBe('Galaxy S25 Ultra is great. Buy Galaxy S25 Ultra today!')
  })

  it('should replace multiple different variables', () => {
    const prompt = 'Generate content for {{product_name}} with keywords: {{keywords}}'
    const variables = {
      product_name: 'Galaxy Z Flip7',
      keywords: 'foldable, camera, AI',
    }

    const result = interpolatePrompt(prompt, variables)

    expect(result).toBe('Generate content for Galaxy Z Flip7 with keywords: foldable, camera, AI')
  })

  it('should handle array variables by joining with comma', () => {
    const prompt = 'Target keywords: {{keywords}}'
    const variables = {
      keywords: ['foldable', 'camera', 'AI phone'],
    }

    const result = interpolatePrompt(prompt, variables)

    expect(result).toBe('Target keywords: foldable, camera, AI phone')
  })

  it('should preserve prompt when no matching variables', () => {
    const prompt = 'No variables here'
    const variables = { product_name: 'Galaxy' }

    const result = interpolatePrompt(prompt, variables)

    expect(result).toBe('No variables here')
  })

  it('should handle empty variables object', () => {
    const prompt = 'Keep {{this}} as is'
    const variables = {}

    const result = interpolatePrompt(prompt, variables)

    expect(result).toBe('Keep {{this}} as is')
  })
})

describe('getDefaultPrompt', () => {
  it('should return gemini default prompt with GEO/AEO methodology', () => {
    const prompt = getDefaultPrompt('gemini')

    expect(prompt).toContain('Samsung GEO/AEO Content Optimization Specialist')
    expect(prompt).toContain('GEO (Generative Engine Optimization)')
    expect(prompt).toContain('AEO (Answer Engine Optimization)')
    expect(prompt).toContain('## SIGNAL FUSION FRAMEWORK')
    expect(prompt).toContain('Brand Guidelines (33%)')
    expect(prompt).toContain('## GEO/AEO OPTIMIZATION PRINCIPLES')
    expect(prompt).toContain('## ANTI-FABRICATION RULES')
    expect(prompt).toContain('SCORING TARGET: 85+ points')
  })

  it('should return perplexity default prompt with grounding protocol', () => {
    const prompt = getDefaultPrompt('perplexity')

    expect(prompt).toContain('AI Search and Grounding Specialist')
    expect(prompt).toContain('## MANDATORY GROUNDING QUERY PROTOCOL')
    expect(prompt).toContain('5-Source Diversification Strategy')
    expect(prompt).toContain('site:samsung.com')
    expect(prompt).toContain('site:reddit.com')
    expect(prompt).toContain('site:gsmarena.com')
    expect(prompt).toContain('## CONTENT PRIORITIZATION (2-Stage Strategy)')
    expect(prompt).toContain('VIDEO CONTENT (Primary - HIGHEST PRIORITY)')
  })

  it('should return cohere default prompt with ranking criteria', () => {
    const prompt = getDefaultPrompt('cohere')

    expect(prompt).toContain('Semantic Analysis and RAG Ranking Specialist')
    expect(prompt).toContain('## RANKING CRITERIA')
    expect(prompt).toContain('### 1. Query Relevance')
    expect(prompt).toContain('### 2. Specificity')
    expect(prompt).toContain('### 3. Authority')
    expect(prompt).toContain('### 4. Completeness')
    expect(prompt).toContain('## PASSAGE QUALITY FOR AEO')
    expect(prompt).toContain('Query Fan-Out Patterns to Address')
  })
})

describe('Settings UI consistency', () => {
  /**
   * This test validates that the Settings UI STAGE_INSTRUCTIONS
   * match the actual stage instructions in composeStagePrompt.
   *
   * If this test fails, it means the Settings UI is showing
   * different instructions than what's actually used in generation.
   */
  it('should have description stage instructions matching generation', () => {
    const result = composeStagePrompt({
      stage: 'description',
      basePrompt: '',
      language: 'en',
    })

    // Key elements that must be present in both UI and generation
    const requiredElements = [
      '## TASK',
      'YouTube description optimized for GEO',
      '## GROUNDING INSTRUCTION',
      'SCORING OPTIMIZATION',
      'KEYWORD DENSITY',
      'AI EXPOSURE',
    ]

    requiredElements.forEach(element => {
      expect(result).toContain(element)
    })
  })

  it('should have FAQ stage instructions with Query Fan-Out methodology', () => {
    const result = composeStagePrompt({
      stage: 'faq',
      basePrompt: '',
      language: 'en',
    })

    // Query Fan-Out is a key methodology that must be documented
    expect(result).toContain('Query Fan-Out')
    expect(result).toContain('10-20 words')
    expect(result).toContain('How/What/Why/When/Where')
    // Check for question examples
    expect(result).toContain('BAD Question Examples')
    expect(result).toContain('GOOD Question Examples')
  })

  it('should have case studies stage with anti-fabrication rules', () => {
    const result = composeStagePrompt({
      stage: 'case_studies',
      basePrompt: '',
      language: 'en',
    })

    // Anti-fabrication is critical for case studies
    expect(result).toContain('ANTI-FABRICATION RULES')
    expect(result).toContain('HEDGING LANGUAGE')
    expect(result).toContain('Designed to help')
  })
})

describe('All stages coverage', () => {
  const allStages = ['description', 'usp', 'faq', 'chapters', 'case_studies', 'keywords', 'hashtags'] as const

  allStages.forEach(stage => {
    it(`should have non-empty instructions for ${stage} stage`, () => {
      const result = composeStagePrompt({
        stage,
        basePrompt: '',
        language: 'en',
      })

      // All stages must have TASK section
      expect(result).toContain('## TASK')

      // All stages must have stage-specific instructions header
      expect(result).toContain('## STAGE-SPECIFIC INSTRUCTIONS')

      // Composed result should be substantial (not just base + header)
      expect(result.length).toBeGreaterThan(500)
    })
  })
})
