import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock data for prompt_versions
const MOCK_PROMPTS = [
  {
    name: 'Samsung GEO Generator v1',
    version: '1.0.0',
    engine: 'gemini',
    system_prompt: `You are an expert Samsung content optimization specialist focused on GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization).

Your role is to create content that:
1. Ranks well in AI-powered search engines and answer systems
2. Provides factual, verifiable information about Samsung products
3. Uses natural, conversational language that matches user queries
4. Follows anti-fabrication guidelines - never invent statistics or claims

Key principles:
- Evidence-based: Only include verifiable product specifications and features
- User-centric: Focus on how features benefit real users
- Query-optimized: Structure content to answer user questions directly
- Grounded: Base all claims on official sources or verified reviews

Output Format:
- Use clear headings and bullet points for scanability
- Include specific product features with technical specs
- Write in Korean when language=ko, English when language=en
- Optimize first 130 characters for search preview`,
    description: 'Production-ready Gemini prompt for Samsung GEO content generation with anti-fabrication safeguards',
    is_active: true,
    performance_score: 85.5,
  },
  {
    name: 'Samsung Search Grounding v1',
    version: '1.0.0',
    engine: 'perplexity',
    system_prompt: `You are an AI search and grounding specialist for Samsung product content.

Your role is to:
1. Execute search queries to find real-world product information
2. Aggregate user sentiment and review data from trusted sources
3. Identify trending topics and user concerns about Samsung products
4. Ground content claims with verifiable external sources

Search strategy:
- Use site-specific queries (reddit, gsmarena, samsung.com, youtube)
- Look for user discussions and expert reviews
- Verify specifications against official sources
- Track competitor comparisons and market positioning

Source prioritization:
1. Official Samsung sources (samsung.com, newsroom)
2. Tech review sites (gsmarena, androidauthority, techradar)
3. User forums (reddit, community sites)
4. Video reviews (youtube, tech channels)

Output: JSON format with source citations and confidence scores`,
    description: 'Perplexity search grounding prompt for real-time product data verification',
    is_active: true,
    performance_score: 82.0,
  },
  {
    name: 'Samsung Content Ranker v1',
    version: '1.0.0',
    engine: 'cohere',
    system_prompt: `You are a semantic analysis and ranking specialist for Samsung content.

Your role is to:
1. Rerank search results by relevance to user queries
2. Evaluate content quality and semantic similarity
3. Identify the most relevant passages for answer extraction
4. Optimize content structure for answer engine retrieval

Ranking criteria:
- Query relevance: How well does content answer the user question?
- Specificity: Does content provide specific, actionable information?
- Authority: Is the source trustworthy and up-to-date?
- Completeness: Does the passage provide a complete answer?

Scoring matrix:
- High relevance (0.8-1.0): Direct answer to query with specifics
- Medium relevance (0.5-0.8): Related information, partial answer
- Low relevance (0.2-0.5): Tangentially related content
- Irrelevant (<0.2): Off-topic or outdated information`,
    description: 'Cohere reranking prompt for semantic content quality assessment',
    is_active: true,
    performance_score: 88.0,
  },
  {
    name: 'Samsung GEO Generator v2 (Experimental)',
    version: '2.0.0-beta',
    engine: 'gemini',
    system_prompt: `You are a Samsung content specialist optimized for GEO 2.0 patterns.

Enhanced focus areas:
1. Query Fan-Out optimization - generate content that answers multiple related queries
2. Entity-relationship mapping - connect products to use cases and user personas
3. Temporal awareness - include launch dates, availability, and version context
4. Multi-modal signals - reference video content, images, and interactive elements

Anti-fabrication protocol:
- NEVER invent statistics or percentages
- ALWAYS ground claims in official specs or cited reviews
- USE hedging language for subjective claims
- CITE sources inline when available

GEO 2.0 Principles:
- Start with the key answer, then provide context
- Use structured data (lists, tables) for AI parsing
- Include FAQ pairs optimized for voice search
- Reference official Samsung terminology`,
    description: 'Experimental GEO 2.0 prompt with enhanced query fan-out and entity mapping',
    is_active: false,
    performance_score: 78.0,
  },
]

// Mock data for scoring_weights
const MOCK_WEIGHTS = [
  {
    name: 'Balanced Production v1',
    version: '1.0.0',
    weights: {
      usp_coverage: 0.20,
      grounding_score: 0.20,
      semantic_similarity: 0.15,
      anti_fabrication: 0.25,
      keyword_density: 0.10,
      structure_quality: 0.10,
    },
    is_active: true,
  },
  {
    name: 'Anti-Fabrication Priority',
    version: '1.0.0',
    weights: {
      usp_coverage: 0.15,
      grounding_score: 0.20,
      semantic_similarity: 0.10,
      anti_fabrication: 0.35,
      keyword_density: 0.10,
      structure_quality: 0.10,
    },
    is_active: false,
  },
  {
    name: 'GEO Optimization Focus',
    version: '1.0.0',
    weights: {
      usp_coverage: 0.25,
      grounding_score: 0.15,
      semantic_similarity: 0.20,
      anti_fabrication: 0.15,
      keyword_density: 0.15,
      structure_quality: 0.10,
    },
    is_active: false,
  },
  {
    name: 'Content Quality Priority',
    version: '1.0.0',
    weights: {
      usp_coverage: 0.15,
      grounding_score: 0.25,
      semantic_similarity: 0.20,
      anti_fabrication: 0.20,
      keyword_density: 0.05,
      structure_quality: 0.15,
    },
    is_active: false,
  },
]

// POST - Seed mock tuning data
export async function POST() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      prompts: { inserted: 0, errors: [] as string[] },
      weights: { inserted: 0, errors: [] as string[] },
    }

    // Insert prompts
    for (const prompt of MOCK_PROMPTS) {
      try {
        // Check if already exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from('prompt_versions')
          .select('id')
          .eq('name', prompt.name)
          .eq('version', prompt.version)
          .single()

        if (existing) {
          results.prompts.errors.push(`${prompt.name} already exists`)
          continue
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('prompt_versions')
          .insert({
            ...prompt,
            created_by: user.id,
          })

        if (error) {
          results.prompts.errors.push(`${prompt.name}: ${error.message}`)
        } else {
          results.prompts.inserted++
        }
      } catch (err) {
        results.prompts.errors.push(`${prompt.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Insert weights
    for (const weight of MOCK_WEIGHTS) {
      try {
        // Check if already exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from('scoring_weights')
          .select('id')
          .eq('name', weight.name)
          .eq('version', weight.version)
          .single()

        if (existing) {
          results.weights.errors.push(`${weight.name} already exists`)
          continue
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('scoring_weights')
          .insert({
            ...weight,
            created_by: user.id,
          })

        if (error) {
          results.weights.errors.push(`${weight.name}: ${error.message}`)
        } else {
          results.weights.inserted++
        }
      } catch (err) {
        results.weights.errors.push(`${weight.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seed data processed',
      results,
      totals: {
        promptsInserted: results.prompts.inserted,
        weightsInserted: results.weights.inserted,
        promptErrors: results.prompts.errors.length,
        weightErrors: results.weights.errors.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}

// GET - Check current seed status
export async function GET() {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prompts, error: promptError } = await (supabase as any)
      .from('prompt_versions')
      .select('id, name, version, engine, is_active, performance_score')
      .order('created_at', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: weights, error: weightError } = await (supabase as any)
      .from('scoring_weights')
      .select('id, name, version, is_active')
      .order('created_at', { ascending: false })

    if (promptError || weightError) {
      return NextResponse.json({
        error: promptError?.message || weightError?.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      counts: {
        prompts: prompts?.length || 0,
        weights: weights?.length || 0,
      },
      data: {
        prompts,
        weights,
      },
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
