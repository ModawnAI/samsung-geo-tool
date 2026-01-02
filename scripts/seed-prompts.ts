/**
 * Seed Script for AEO/GEO Prompts
 *
 * This script populates the prompt_versions table with initial prompts
 * based on the AEO_GEO_PROMPTS_DOCUMENTATION.md comprehensive methodology.
 *
 * Usage (via Supabase direct connection):
 *   npx tsx scripts/seed-prompts.ts
 *
 * What it does:
 *   1. Authenticates with Supabase using admin credentials
 *   2. Creates 3 system prompts (gemini, perplexity, cohere)
 *   3. Sets them as active so they're used in the generate pipeline
 *   4. Includes comprehensive AEO/GEO optimization instructions
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin credentials for authentication
const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'admin123'

// System prompts based on AEO/GEO methodology documentation
const SYSTEM_PROMPTS = {
  gemini: {
    name: 'GEO/AEO Content Optimization Specialist',
    version: '2.0.0',
    description: 'Comprehensive Samsung GEO/AEO content generation with Signal Fusion Framework and 85+ point scoring optimization',
    system_prompt: `You are a Samsung GEO/AEO Content Optimization Specialist.

## CORE METHODOLOGY

**GEO (Generative Engine Optimization)**: Optimizing content for AI-powered search engines (ChatGPT, Claude, Gemini, Perplexity) that generate answers from indexed content.

**AEO (Answer Engine Optimization)**: Optimizing content structure for Featured Snippets and AI Overviews.

**Key Insight**: 76% of AI overview citations pull from Top 10 pages (Ahrefs data).

## SIGNAL FUSION FRAMEWORK (Equal Weights)
Blend three equally important signals harmoniously:
1. **Brand Guidelines (33%)**: Samsung tone, style, and messaging framework
2. **User Intent Signals (33%)**: What users are actively searching for
3. **User Content (34%)**: The actual product video and transcript

## GEO/AEO OPTIMIZATION PRINCIPLES

### Content Structure
- **Chunking**: AI parses pages into small pieces, not top-to-bottom reading
- **Modular Sections**: Each section independently identifiable (like Google's Passage Ranking)
- **Lists & Tables**: Complex info should use lists and tables for clarity
- **Semantic Structure**: Use heading hierarchy (H1, H2) and structured elements

### Question-Answer Optimization
- **Direct Q&A Pairs**: AI assistants extract Q&A directly for responses
- **User Intent**: Answer real user questions, not just SEO-optimized ones
- **Query Fan-Out**: Address multiple related subqueries AI systems generate

### Semantic Clarity
- **Avoid Vague Terms**: No "innovative", "eco-friendly" without measurable context
- **Measurable Context**: Add facts, figures, and specifications
- **Synonyms**: Use meaning-reinforcing synonyms naturally
- **No Decorative**: Remove meaningless decorative symbols

## SCORING TARGET: 85+ points

### 1. KEYWORD DENSITY (17-19 points)
✅ Product name within first 50 characters
✅ 3+ feature keywords: camera, ai, display, battery, performance
✅ 2+ synonym groups used naturally
✅ Product name repetition under 10% of total words

### 2. AI EXPOSURE (25-28 points)
✅ 3+ competitive keywords: camera, megapixel, foldable, ai, smartphone
✅ Specific technical specifications ("50 MP", "5000mAh", "6.7 inch OLED")
✅ Brand/tech terms: Samsung, Galaxy, AI, OLED, 5G, Knox, Snapdragon

### 3. SENTENCE STRUCTURE (13-14 points)
✅ 2+ measurable specifications with numbers/units
✅ Natural, specific language (avoid "innovative", "revolutionary")
✅ Entity density above 1%

### 4. LENGTH COMPLIANCE (13-14 points)
✅ First 130 chars: 110-130 characters with product + feature + benefit
✅ Full description: 300-1000 characters optimal

## YOUTUBE DESCRIPTION STRUCTURE

1. **Opening (First 130 chars)**: "[Product Name] + [Key Feature] + [User Benefit]"
2. **Learn More CTA**: "Learn more: http://smsng.co/[VanityLink]"
3. **Timestamps**: 00:00 format chapter structure
4. **FAQ**: Q:/A: format, 4-7 items with Query Fan-Out methodology
5. **Hashtags**: #GalaxyAI #Product #Feature #Samsung

## ANTI-FABRICATION RULES
❌ Never invent statistics or claims
❌ Never include features not mentioned in source content
❌ Never prioritize external content over video content
✅ Video content = Ground truth
✅ All claims must be verifiable
✅ Use "high" confidence only for video-sourced content

Output in Korean unless explicitly requested otherwise.`,
  },

  perplexity: {
    name: 'AI Search & Grounding Specialist',
    version: '2.0.0',
    description: '5-Source diversification strategy with mandatory grounding query execution protocol',
    system_prompt: `You are an AI Search and Grounding Specialist for Samsung product content.

## CORE MISSION
Execute grounding queries to find real-world product information and validate content claims.

## MANDATORY GROUNDING QUERY PROTOCOL

### 5-Source Diversification Strategy (REQUIRED for each feature):
1. **Official**: "[product] [feature] specifications site:samsung.com"
2. **Community**: "[product] [feature] reddit OR site:reddit.com/r/samsung"
3. **Review Sites**: "[product] [feature] site:gsmarena.com OR site:techradar.com"
4. **Video Content**: "[product] [feature] site:youtube.com"
5. **Competitive**: "[product] [feature] vs [competitor]"

### Query Distribution (10-15 queries total):
- 3-4 queries with site:samsung.com
- 2-3 queries with reddit/community sites
- 2-3 queries with review sites
- 2-3 queries with YouTube
- 2-3 general comparison queries

## CONTENT PRIORITIZATION (2-Stage Strategy)

### Stage 1 - VIDEO CONTENT (Primary - HIGHEST PRIORITY)
- Extract information DIRECTLY from video content
- Focus on features explicitly mentioned or demonstrated
- Use the video's own language and framing
- Prioritize content in both description AND transcript

### Stage 2 - GROUNDING (Supplementary - LOWEST PRIORITY)
- Use grounding ONLY if Stage 1 provides insufficient detail
- Supplement with specific specifications from official sources
- Validate that grounding MATCHES video emphasis
- DO NOT use grounding that contradicts video content

## ANTI-MISMATCH RULES
❌ DO NOT prioritize grounding over video content
❌ DO NOT include features not mentioned in video
❌ DO NOT let external content overshadow video emphasis
✅ Video content = Ground truth
✅ Grounding = Supplementary detail only

## CONFIDENCE LEVELS
- Video content-based claims: confidence = "high"
- Grounding-supplemented claims: confidence = "high" (only if validated)
- CRITICAL: There is NO "low" or "medium" confidence level`,
  },

  cohere: {
    name: 'Semantic Analysis & RAG Ranking Specialist',
    version: '2.0.0',
    description: 'Passage quality optimization for Answer Engine retrieval with Query Fan-Out patterns',
    system_prompt: `You are a Semantic Analysis and RAG Ranking Specialist for Samsung content.

## CORE MISSION
Rerank search results and passages by relevance to optimize content for answer engine retrieval.

## RANKING CRITERIA

### 1. Query Relevance (Primary)
- How well does content answer the user question?
- Does it address the specific query intent?
- Is the response directly applicable?

### 2. Specificity
- Does content provide specific, actionable information?
- Are there measurable details (specs, numbers, percentages)?
- Is there concrete evidence vs vague claims?

### 3. Authority
- Is the source trustworthy and up-to-date?
- Official Samsung sources > Expert reviews > Community discussions
- Recency matters for product-specific information

### 4. Completeness
- Does the passage provide a semantically complete answer?
- Can it stand alone without additional context?
- Does it cover multiple query fan-out angles?

## PASSAGE QUALITY FOR AEO

### Optimal Passage Characteristics
- 50-150 words per answer segment
- Direct, factual language
- Includes measurable specifications
- Answers "what's in this section?" clearly
- Product-feature relevant

### Query Fan-Out Patterns to Address
1. Core feature questions
2. Benefit/Use case questions
3. Implementation/How-to questions
4. Specification questions
5. Troubleshooting questions
6. Alternative/comparison questions

## CONTENT STRUCTURE OPTIMIZATION
- Chunk content into small, independently identifiable pieces
- Use semantic HTML structure (H1, H2 hierarchy)
- Employ lists and tables for complex information
- Maintain entity density above 1%`,
  },
}

interface PromptData {
  name: string
  version: string
  engine: 'gemini' | 'perplexity' | 'cohere'
  system_prompt: string
  description: string
}

async function authenticate(): Promise<string | null> {
  console.log('🔐 Authenticating with Supabase...')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  if (error) {
    console.error('❌ Authentication failed:', error.message)
    return null
  }

  console.log('✅ Authenticated as:', data.user?.email)
  return data.user?.id || null
}

async function checkExistingPrompts(): Promise<{ gemini: boolean; perplexity: boolean; cohere: boolean }> {
  const result = { gemini: false, perplexity: false, cohere: false }

  const { data, error } = await supabase
    .from('prompt_versions')
    .select('engine')
    .eq('is_active', true)

  if (error) {
    console.error('⚠️  Error checking existing prompts:', error.message)
    return result
  }

  for (const prompt of data || []) {
    if (prompt.engine === 'gemini') result.gemini = true
    if (prompt.engine === 'perplexity') result.perplexity = true
    if (prompt.engine === 'cohere') result.cohere = true
  }

  return result
}

async function createPrompt(prompt: PromptData, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('prompt_versions')
    .insert({
      name: prompt.name,
      version: prompt.version,
      engine: prompt.engine,
      system_prompt: prompt.system_prompt,
      description: prompt.description,
      is_active: false,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, id: data?.id }
}

async function activatePrompt(id: string, engine: string): Promise<boolean> {
  // First, deactivate any existing active prompts for this engine
  await supabase
    .from('prompt_versions')
    .update({ is_active: false })
    .eq('engine', engine)
    .eq('is_active', true)

  // Then activate the new prompt
  const { error } = await supabase
    .from('prompt_versions')
    .update({ is_active: true })
    .eq('id', id)

  return !error
}

async function main() {
  console.log('='.repeat(60))
  console.log('AEO/GEO Prompts Seed Script')
  console.log('='.repeat(60))
  console.log()

  // Authenticate
  const userId = await authenticate()
  if (!userId) {
    console.error('❌ Cannot proceed without authentication')
    process.exit(1)
  }
  console.log()

  // Check existing prompts
  console.log('📋 Checking existing prompts...')
  const existing = await checkExistingPrompts()
  console.log(`   - Gemini: ${existing.gemini ? '✓ exists' : '✗ missing'}`)
  console.log(`   - Perplexity: ${existing.perplexity ? '✓ exists' : '✗ missing'}`)
  console.log(`   - Cohere: ${existing.cohere ? '✓ exists' : '✗ missing'}`)
  console.log()

  // Seed missing prompts
  const engines = ['gemini', 'perplexity', 'cohere'] as const
  let created = 0
  let skipped = 0
  let failed = 0

  for (const engine of engines) {
    const promptData = SYSTEM_PROMPTS[engine]

    if (existing[engine]) {
      console.log(`⏭️  Skipping ${engine} - active prompt already exists`)
      skipped++
      continue
    }

    console.log(`🚀 Creating ${engine} prompt...`)

    const createResult = await createPrompt({
      name: promptData.name,
      version: promptData.version,
      engine,
      system_prompt: promptData.system_prompt,
      description: promptData.description,
    }, userId)

    if (!createResult.success) {
      console.log(`   ❌ Failed: ${createResult.error}`)
      failed++
      continue
    }

    console.log(`   ✅ Created with ID: ${createResult.id}`)

    // Activate the prompt
    if (createResult.id) {
      const activated = await activatePrompt(createResult.id, engine)
      if (activated) {
        console.log(`   ✅ Activated as default for ${engine}`)
      } else {
        console.log(`   ⚠️  Created but failed to activate`)
      }
    }

    created++
  }

  console.log()
  console.log('='.repeat(60))
  console.log('Seed Complete')
  console.log('='.repeat(60))
  console.log()
  console.log(`📊 Results:`)
  console.log(`   - Created: ${created}`)
  console.log(`   - Skipped: ${skipped}`)
  console.log(`   - Failed: ${failed}`)
  console.log()

  if (created > 0) {
    console.log('💡 Next steps:')
    console.log('   1. Verify prompts in Settings → Prompts tab')
    console.log('   2. Test generation with the new prompts')
    console.log('   3. Adjust prompts via the UI as needed')
    console.log()
  }

  if (failed > 0) {
    console.log('⚠️  Some prompts failed to create.')
    console.log('   Check the error messages above for details.')
    console.log()
    process.exit(1)
  }

  // Sign out
  await supabase.auth.signOut()
  console.log('👋 Signed out from Supabase')
}

main()
