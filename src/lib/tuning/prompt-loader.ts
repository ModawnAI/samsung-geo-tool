/**
 * PromptLoader Service
 * Loads active prompts from prompt_versions table by engine type
 * Integrates tuning console prompts with generate-v2 pipeline
 */

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import type { Engine } from '@/types/tuning'

export type PromptVersion = Tables<'prompt_versions'>

export interface LoadedPrompt {
  id: string
  name: string
  version: string
  engine: Engine
  systemPrompt: string
  isActive: boolean
  performanceScore: number | null
}

export interface PromptLoaderResult {
  prompt: LoadedPrompt | null
  source: 'database' | 'default'
  error?: string
}

// Default system prompts as fallback when no database prompt is configured
const DEFAULT_PROMPTS: Record<Engine, string> = {
  gemini: `You are an expert Samsung content optimization specialist focused on GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization).

Your role is to create content that:
1. Ranks well in AI-powered search engines and answer systems
2. Provides factual, verifiable information about Samsung products
3. Uses natural, conversational language that matches user queries
4. Follows anti-fabrication guidelines - never invent statistics or claims

Key principles:
- Evidence-based: Only include verifiable product specifications and features
- User-centric: Focus on how features benefit real users
- Query-optimized: Structure content to answer user questions directly
- Grounded: Base all claims on official sources or verified reviews`,

  perplexity: `You are an AI search and grounding specialist for Samsung product content.

Your role is to:
1. Execute search queries to find real-world product information
2. Aggregate user sentiment and review data from trusted sources
3. Identify trending topics and user concerns about Samsung products
4. Ground content claims with verifiable external sources

Search strategy:
- Use site-specific queries (reddit, gsmarena, samsung.com, youtube)
- Look for user discussions and expert reviews
- Verify specifications against official sources
- Track competitor comparisons and market positioning`,

  cohere: `You are a semantic analysis and ranking specialist for Samsung content.

Your role is to:
1. Rerank search results by relevance to user queries
2. Evaluate content quality and semantic similarity
3. Identify the most relevant passages for answer extraction
4. Optimize content structure for answer engine retrieval

Ranking criteria:
- Query relevance: How well does content answer the user question?
- Specificity: Does content provide specific, actionable information?
- Authority: Is the source trustworthy and up-to-date?
- Completeness: Does the passage provide a complete answer?`,
}

/**
 * Load active prompt for a specific engine from the database
 * Falls back to default prompt if none configured or on error
 */
export async function loadActivePrompt(engine: Engine): Promise<PromptLoaderResult> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('prompt_versions')
      .select('*')
      .eq('engine', engine)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // PGRST116 = no rows returned (not a real error, just no active prompt)
      if (error.code === 'PGRST116') {
        console.log(`[PromptLoader] No active prompt for ${engine}, using default`)
        return {
          prompt: createDefaultPrompt(engine),
          source: 'default',
        }
      }
      throw error
    }

    const row = data as PromptVersion

    return {
      prompt: {
        id: row.id,
        name: row.name,
        version: row.version,
        engine: row.engine,
        systemPrompt: row.system_prompt,
        isActive: row.is_active,
        performanceScore: row.performance_score,
      },
      source: 'database',
    }
  } catch (error) {
    console.error(`[PromptLoader] Error loading prompt for ${engine}:`, error)
    return {
      prompt: createDefaultPrompt(engine),
      source: 'default',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Load prompts for multiple engines in parallel
 */
export async function loadActivePrompts(
  engines: Engine[] = ['gemini', 'perplexity', 'cohere']
): Promise<Record<Engine, PromptLoaderResult>> {
  const results = await Promise.all(engines.map((engine) => loadActivePrompt(engine)))

  return engines.reduce(
    (acc, engine, index) => {
      acc[engine] = results[index]
      return acc
    },
    {} as Record<Engine, PromptLoaderResult>
  )
}

/**
 * Load all prompts for a specific engine (active and inactive)
 * Useful for prompt management UI
 */
export async function loadPromptsByEngine(engine: Engine): Promise<{
  prompts: PromptVersion[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('engine', engine)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { prompts: data || [] }
  } catch (error) {
    console.error(`[PromptLoader] Error loading prompts for ${engine}:`, error)
    return {
      prompts: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get prompt with variable interpolation
 * Replaces template variables like {{product_name}}, {{keywords}}, etc.
 */
export function interpolatePrompt(
  prompt: string,
  variables: Record<string, string | string[]>
): string {
  let result = prompt

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    const replacement = Array.isArray(value) ? value.join(', ') : value
    result = result.replace(new RegExp(placeholder, 'g'), replacement)
  }

  return result
}

/**
 * Create default prompt object for fallback
 */
function createDefaultPrompt(engine: Engine): LoadedPrompt {
  return {
    id: `default-${engine}`,
    name: `Default ${engine} Prompt`,
    version: '1.0.0',
    engine,
    systemPrompt: DEFAULT_PROMPTS[engine],
    isActive: true,
    performanceScore: null,
  }
}

/**
 * Validate prompt contains required template variables
 */
export function validatePromptVariables(
  prompt: string,
  requiredVariables: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredVariables.filter(
    (variable) => !prompt.includes(`{{${variable}}}`)
  )

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Get the default prompt for an engine (for comparison or reset)
 */
export function getDefaultPrompt(engine: Engine): string {
  return DEFAULT_PROMPTS[engine]
}

/**
 * Stage-specific prompt composition for generate-v2 pipeline
 * Combines base prompt with stage-specific instructions
 */
export interface StagePromptConfig {
  stage: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
  basePrompt: string
  antiFabricationLevel?: 'low' | 'medium' | 'high'
  language: 'ko' | 'en'
}

export function composeStagePrompt(config: StagePromptConfig): string {
  const { stage, basePrompt, language } = config

  const languageInstruction = language === 'ko'
    ? '\n\nOutput in Korean (한국어).'
    : '\n\nOutput in English.'

  const stageInstructions: Record<string, string> = {
    description: `
Focus on creating SEO-optimized descriptions that:
1. Start with a compelling preview (first 130 characters for search results)
2. Include target keywords naturally
3. Highlight key product features and benefits
4. Use active voice and conversational tone`,

    usp: `
Extract and validate Unique Selling Points (USPs) that:
1. Are backed by verifiable product specifications
2. Differentiate from competitors
3. Address real user pain points
4. Can be grounded with external sources`,

    faq: `
Generate FAQ pairs optimized for Query Fan-Out:
1. Questions should be 10-15 words, conversational
2. Cover different search intent patterns
3. Answers should be direct and factual (50-100 words)
4. Link each FAQ to relevant USPs`,

    chapters: `
Create GEO/AEO-optimized video chapters that:
1. Use searchable, descriptive titles (2-5 words)
2. Include product feature names and keywords
3. Represent meaningful content transitions
4. Exclude personal references or vague labels`,

    case_studies: `
Create realistic use case scenarios that:
1. Use relatable user personas
2. Demonstrate specific USP benefits
3. Include realistic outcomes based on actual features
4. Avoid fabricated statistics or claims`,

    keywords: `
Extract and categorize keywords that:
1. Include product-specific and generic terms
2. Match user search patterns
3. Support GEO/AEO optimization
4. Include trending and seasonal terms`,

    hashtags: `
Generate social-optimized hashtags that:
1. Include product and category tags
2. Balance branded and generic terms
3. Consider trending topics
4. Follow platform conventions`,
  }

  return `${basePrompt}

## STAGE-SPECIFIC INSTRUCTIONS
${stageInstructions[stage] || ''}${languageInstruction}`
}
