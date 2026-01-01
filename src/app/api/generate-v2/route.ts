/**
 * GEO v2 Generation API Route
 * 7-Stage Pipeline with USP-Centric Architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { multiQuerySearch, getSectionContext } from '@/lib/rag/search'
import { isPineconeConfigured } from '@/lib/pinecone/client'
import { safeJsonParse } from '@/lib/utils'
import {
  executeGEOv2Pipeline,
  extractUSPs,
  checkForFabrications,
  sanitizeContent,
  calculateGroundingQualityScore,
  getSourceTier,
  extractGroundingSources,
  aggregateGroundingMetadata,
  getAntiFabricationPrompt,
  PIPELINE_CONFIGS,
  type PipelineInput,
} from '@/lib/geo-v2'
import {
  loadTuningConfig,
  getStagePrompt,
  getBasePrompt,
  calculateGEOScore,
  recordGenerationPromptVersion,
  getTuningConfigSummary,
  type TuningConfig,
  type RawGenerationScores,
  type PipelineStage,
} from '@/lib/tuning/integration'
import { logGenerationFlow, createApiLoggerContext, finalizeApiLog } from '@/lib/logging'
import { createClient } from '@/lib/supabase/server'
import type {
  GEOv2GenerateResponse,
  PipelineProgress,
  GroundingSource,
  UniqueSellingPoint,
  FAQItem,
  CaseStudy,
  CaseStudyResult,
} from '@/types/geo-v2'
import type { ProductCategory, PlaybookSearchResult, PlaybookSection } from '@/types/playbook'
import { calculateContentQualityScores } from '@/lib/scoring/content-quality'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ==========================================
// RETRY HELPER FOR TRANSIENT FAILURES
// ==========================================

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  context?: string
}

/**
 * Retry wrapper with exponential backoff for Gemini API calls
 * Handles ECONNRESET, timeout, and other transient failures
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    context = 'API call'
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if it's a retryable error
      const errorMessage = lastError.message.toLowerCase()
      const errorCode = (error as { code?: string })?.code?.toLowerCase() || ''

      const isRetryable =
        errorCode === 'econnreset' ||
        errorCode === 'etimedout' ||
        errorCode === 'econnrefused' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('connection')

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[${context}] Non-retryable error or max retries reached:`, lastError.message)
        throw lastError
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      const jitter = Math.random() * 500
      const delay = exponentialDelay + jitter

      console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed (${errorCode || errorMessage}), retrying in ${Math.round(delay)}ms...`)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error(`${context} failed after ${maxRetries} attempts`)
}

// ==========================================
// V2 REQUEST/RESPONSE TYPES
// ==========================================

interface RegenerationConfig {
  focusArea?: string
  metric?: string
  enhanceUSPs?: boolean
  prioritizePlaybook?: boolean
  enhanceGrounding?: boolean
  deeperWebSearch?: boolean
  strictBrandAlignment?: boolean
  playbookEnforcement?: boolean
  verifyClaims?: boolean
  factChecking?: boolean
  enhanceKeywordDensity?: boolean
  improveStructure?: boolean
  optimizeReadability?: boolean
  fullRegeneration?: boolean
}

interface GEOv2GenerateRequest {
  productName: string
  youtubeUrl: string
  srtContent: string
  existingDescription?: string
  keywords: string[]
  productCategory?: ProductCategory | 'all'
  usePlaybook?: boolean
  launchDate?: string
  pipelineConfig?: 'full' | 'quick' | 'grounded'
  language?: 'ko' | 'en'
  regenerationConfig?: RegenerationConfig
}

interface GroundingSignal {
  term: string
  score: number
  source?: string
  recency?: string
}

// ==========================================
// V2 RESPONSE SCHEMAS
// ==========================================

const descriptionSchema = {
  type: 'object',
  properties: {
    preview: {
      type: 'string',
      description: 'First 130 characters preview for search results',
    },
    full: {
      type: 'string',
      description: 'Full SEO-optimized description (300-500 characters)',
    },
    vanityLinks: {
      type: 'array',
      items: { type: 'string' },
      description: 'Suggested vanity links for call-to-action',
    },
  },
  required: ['preview', 'full', 'vanityLinks'],
}

const faqSchema = {
  type: 'object',
  properties: {
    faqs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
          linkedUSPs: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['question', 'answer'],
      },
      description: '5-7 FAQs addressing real user queries, linked to USPs',
    },
    queryPatternOptimization: {
      type: 'boolean',
      description: 'Whether FAQs are optimized for query patterns',
    },
  },
  required: ['faqs', 'queryPatternOptimization'],
}

const caseStudySchema = {
  type: 'object',
  properties: {
    caseStudies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          scenario: { type: 'string' },
          solution: { type: 'string' },
          linkedUSPs: {
            type: 'array',
            items: { type: 'string' },
          },
          evidence: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              confidence: { type: 'string' },
            },
          },
        },
        required: ['title', 'scenario', 'solution'],
      },
    },
  },
  required: ['caseStudies'],
}

const chaptersSchema = {
  type: 'object',
  properties: {
    timestamps: {
      type: 'string',
      description: 'Video timestamps (format: "0:00 Section name")',
    },
    autoGenerated: {
      type: 'boolean',
      description: 'Whether chapters were auto-generated from SRT',
    },
  },
  required: ['timestamps', 'autoGenerated'],
}

const keywordsSchema = {
  type: 'object',
  properties: {
    product: {
      type: 'array',
      items: { type: 'string' },
      description: 'Product-specific keywords',
    },
    generic: {
      type: 'array',
      items: { type: 'string' },
      description: 'Generic category keywords',
    },
    densityScore: {
      type: 'number',
      description: 'Keyword density score 0-100',
    },
  },
  required: ['product', 'generic', 'densityScore'],
}

// ==========================================
// MAIN API HANDLER
// ==========================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const loggerContext = createApiLoggerContext(request)

  // Track external API calls for logging
  const externalApisCalled: Array<{ name: string; durationMs: number; status: number | string }> = []

  // Declare body outside try block so it's accessible in catch block for logging
  let body: GEOv2GenerateRequest | undefined

  // Get authenticated user for logging
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      loggerContext.userId = user.id
      loggerContext.userEmail = user.email
    }
  } catch {
    // Continue without user context - logging still works
  }

  try {
    body = await request.json() as GEOv2GenerateRequest
    const {
      productName,
      youtubeUrl,
      srtContent,
      existingDescription,
      keywords,
      productCategory,
      usePlaybook = true,
      launchDate,
      pipelineConfig = 'full',
      language = 'ko',
      regenerationConfig,
    } = body

    // Validation
    if (!productName || !srtContent) {
      return NextResponse.json(
        { error: 'Product name and SRT content are required' },
        { status: 400 }
      )
    }

    // Check if this is a regeneration request
    const isRegeneration = !!regenerationConfig
    const regenerationFocus = regenerationConfig?.focusArea || null

    console.log(`[GEO v2] Starting pipeline: ${pipelineConfig}${isRegeneration ? ` (regeneration: ${regenerationFocus})` : ''}`)
    console.log(`[GEO v2] Product: ${productName}, Keywords: ${keywords.length}`)

    // ==========================================
    // LOAD TUNING CONFIGURATION
    // ==========================================
    const tuningConfig = await loadTuningConfig()
    const tuningConfigSummary = getTuningConfigSummary(tuningConfig)
    console.log(`[GEO v2] Tuning config loaded: ${tuningConfig.source}`)
    console.log(`[GEO v2] Prompts: ${tuningConfigSummary.promptsLoaded} from DB, Weights: ${tuningConfigSummary.weightsSource}`)

    // Track which prompt version was used for this generation
    let activePromptVersionId: string | null = null
    const geminiPromptResult = tuningConfig.prompts.gemini
    if (geminiPromptResult.source === 'database' && geminiPromptResult.prompt) {
      activePromptVersionId = geminiPromptResult.prompt.id
    }

    // ==========================================
    // STAGE 0: PARALLEL DATA FETCHING
    // ==========================================
    // Enhanced grounding when regenerating with focus on grounding
    const enhancedGrounding = regenerationConfig?.enhanceGrounding || regenerationConfig?.deeperWebSearch
    const enhancedUSP = regenerationConfig?.enhanceUSPs || regenerationConfig?.prioritizePlaybook

    const [groundingSignals, playbookContext] = await Promise.all([
      fetchGroundingSignals(productName, keywords, launchDate, enhancedGrounding),
      (usePlaybook && isPineconeConfigured())
        ? fetchPlaybookContext(productName, keywords, productCategory, enhancedUSP)
        : Promise.resolve([]),
    ])

    console.log(`[GEO v2] Data fetched in ${Date.now() - startTime}ms`)
    console.log(`[GEO v2] Grounding signals: ${groundingSignals.length}, Playbook chunks: ${playbookContext.length}`)
    if (isRegeneration) {
      console.log(`[GEO v2] Regeneration mode: enhancedGrounding=${enhancedGrounding}, enhancedUSP=${enhancedUSP}`)
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(getMockV2Response(productName, keywords))
    }

    // ==========================================
    // STAGE 1: DESCRIPTION GENERATION WITH GROUNDING
    // ==========================================
    const descriptionResult = await generateDescription(
      productName,
      srtContent,
      existingDescription,
      keywords,
      groundingSignals,
      playbookContext,
      language,
      tuningConfig
    )

    // Extract grounding sources from description generation
    const descriptionGroundingSources = extractSourcesFromGrounding(descriptionResult.groundingChunks)

    // Fallback: Convert grounding signals to sources if Gemini native grounding is not available
    // This ensures USP enrichment can still work with Google/Perplexity search results
    const signalBasedSources = convertSignalsToSources(groundingSignals)
    const combinedGroundingSources = descriptionGroundingSources.length > 0
      ? descriptionGroundingSources
      : signalBasedSources

    console.log(`[GEO v2] Description generated with ${descriptionGroundingSources.length} Gemini sources, ${signalBasedSources.length} signal-based sources`)

    // ==========================================
    // STAGE 1.5: USP EXTRACTION
    // ==========================================
    const uspResult = await extractUSPs({
      productName,
      srtContent,
      keywords,
      groundingSignals,
      groundingSources: combinedGroundingSources,
    })

    console.log(`[GEO v2] USPs extracted: ${uspResult.usps.length}, Method: ${uspResult.extractionMethod}`)

    // ==========================================
    // STAGES 2-6: PARALLEL EXECUTION BLOCK
    // Chapters, FAQ, Case Studies, Step-by-step, Keywords all run concurrently
    // ==========================================
    const isTutorialContent = detectTutorialContent(srtContent)
    const parallelStagesStart = Date.now()

    const [chaptersResult, faqResult, stepByStepResult, caseStudiesResult, keywordsResult] = await Promise.all([
      // Stage 2: Chapters (depends only on srtContent)
      generateChapters(srtContent, productName, tuningConfig),
      // Stage 3: FAQ (depends on USPs)
      generateFAQ(productName, srtContent, uspResult.usps, groundingSignals, language, tuningConfig),
      // Stage 4: Step-by-step (optional, depends on srtContent)
      isTutorialContent
        ? generateStepByStep(srtContent, productName, language, tuningConfig)
        : Promise.resolve(null),
      // Stage 5: Case Studies (depends on USPs)
      generateCaseStudies(productName, uspResult.usps, groundingSignals, language, tuningConfig),
      // Stage 6: Keywords (independent - can run in parallel)
      generateKeywords(productName, srtContent, keywords, groundingSignals, language, tuningConfig),
    ])

    console.log(`[GEO v2] Parallel stages completed in ${Date.now() - parallelStagesStart}ms`)
    console.log(`[GEO v2] Chapters: ${chaptersResult.timestamps.split('\n').length} entries`)
    console.log(`[GEO v2] FAQs: ${faqResult.faqs.length} Q&As`)
    if (stepByStepResult) {
      console.log(`[GEO v2] Step-by-step: ${stepByStepResult.steps.length} steps`)
    }
    console.log(`[GEO v2] Case studies: ${caseStudiesResult.caseStudies.length} cases`)

    // ==========================================
    // STAGE 6.5: HASHTAG GENERATION
    // ==========================================
    const hashtagResult = await generateHashtags(
      productName,
      descriptionResult.description.full,
      uspResult.usps,
      keywordsResult,
      language,
      tuningConfig
    )

    console.log(`[GEO v2] Keywords: ${keywordsResult.product.length + keywordsResult.generic.length}`)
    console.log(`[GEO v2] Hashtags: ${hashtagResult.hashtags.length} (categorized)`)

    // ==========================================
    // STAGE 7: GROUNDING AGGREGATION
    // ==========================================
    const stageGroundingData = [
      {
        stage: 'description',
        sources: descriptionGroundingSources,
        searchQueries: groundingSignals.map(s => s.term),
      },
      {
        stage: 'usp_extraction',
        sources: extractUSPSources(uspResult.usps),
        searchQueries: [],
      },
      {
        stage: 'faq',
        sources: extractFAQSources(faqResult.faqs),
        searchQueries: [],
      },
      {
        stage: 'case_studies',
        sources: extractCaseStudySources(caseStudiesResult.caseStudies),
        searchQueries: [],
      },
    ]

    const groundingMetadata = aggregateGroundingMetadata(stageGroundingData)

    // ==========================================
    // FINAL SCORE CALCULATION (Using Tuning Weights)
    // ==========================================
    const groundingQuality = calculateGroundingQualityScore({
      sources: groundingMetadata.sources,
      usps: uspResult.usps,
      totalSections: 7,
      sectionsWithGrounding: stageGroundingData.filter(s => s.sources.length > 0).length,
      contentLength: descriptionResult.description.full.length + faqResult.faqs.reduce((acc, f) => acc + f.answer.length, 0),
      citedContentLength: groundingMetadata.totalCitations * 200,
    })

    // Calculate legacy component scores for backward compatibility
    const keywordDensityScore = Math.min(15, Math.round(keywordsResult.densityScore / 100 * 15))
    const aiExposureScore = Math.min(25, Math.round((uspResult.groundingQuality / 100) * 25))
    const questionPatternsScore = Math.min(20, Math.round((faqResult.faqs.length / 7) * 20))
    const sentenceStructureScore = 12 // Would be calculated from actual content analysis
    const lengthComplianceScore = calculateLengthComplianceScore(descriptionResult.description.full)

    // Calculate content quality scores (semantic similarity and anti-fabrication)
    const contentQualityScores = calculateContentQualityScores({
      srtContent,
      generatedDescription: descriptionResult.description.full,
      faqAnswers: faqResult.faqs.map(f => f.answer),
      caseStudies: caseStudiesResult.caseStudies.map(cs => `${cs.scenario} ${cs.solution}`),
      usps: uspResult.usps.map(u => `${u.feature}: ${u.differentiation} - ${u.userBenefit}`),
      groundingData: groundingSignals.map(s => s.term).filter(Boolean),
    })

    console.log(`[GEO v2] Content quality - Semantic similarity: ${contentQualityScores.semanticSimilarity.score.toFixed(2)}, Anti-fabrication: ${contentQualityScores.antiFabrication.score.toFixed(2)} (${contentQualityScores.antiFabrication.violationCount} violations)`)

    // Calculate GEO score using tuning weights
    const rawGenerationScores: RawGenerationScores = {
      keywordDensity: keywordDensityScore,
      aiExposure: aiExposureScore,
      questionPatterns: questionPatternsScore,
      sentenceStructure: sentenceStructureScore,
      lengthCompliance: lengthComplianceScore,
      groundingQuality: groundingQuality.total,
      uspCoverage: uspResult.usps.length > 0 ? uspResult.groundingQuality / 100 : 0.5,
      semanticSimilarity: contentQualityScores.semanticSimilarity.score,
      antiFabrication: contentQualityScores.antiFabrication.score,
    }

    const geoScoreResult = calculateGEOScore(rawGenerationScores, tuningConfig)

    // Combine legacy format with weighted GEO score
    const finalScore = {
      keywordDensity: keywordDensityScore,
      aiExposure: aiExposureScore,
      questionPatterns: questionPatternsScore,
      sentenceStructure: sentenceStructureScore,
      lengthCompliance: lengthComplianceScore,
      groundingQuality,
      // New weighted scoring breakdown
      geoScore: geoScoreResult.finalScore,
      geoBreakdown: geoScoreResult.breakdown,
      weightsSource: geoScoreResult.weightsSource,
      weightsVersionId: geoScoreResult.weightsVersionId,
      // Total uses weighted GEO score when weights are from database, otherwise legacy
      total: geoScoreResult.weightsSource === 'database'
        ? geoScoreResult.finalScore
        : Math.round(
            (keywordDensityScore + aiExposureScore + questionPatternsScore +
              sentenceStructureScore + lengthComplianceScore + groundingQuality.total) * 100
          ) / 100,
    }

    console.log(`[GEO v2] Final score: ${finalScore.total}/100 (${geoScoreResult.weightsSource} weights)`)
    console.log(`[GEO v2] GEO breakdown: ${geoScoreResult.breakdown.map(b => `${b.label}: ${b.weightedScore.toFixed(2)}`).join(', ')}`)
    console.log(`[GEO v2] Pipeline completed in ${Date.now() - startTime}ms`)

    // ==========================================
    // BUILD RESPONSE
    // ==========================================
    const response: GEOv2GenerateResponse = {
      description: descriptionResult.description,
      uspResult,
      chapters: chaptersResult,
      faq: faqResult,
      stepByStep: stepByStepResult || undefined,
      caseStudies: caseStudiesResult,
      keywords: keywordsResult,
      hashtags: hashtagResult.hashtags,
      hashtagCategories: hashtagResult.categories,
      finalScore,
      groundingMetadata,
      progress: [],
      // Tuning metadata for tracking and analysis
      tuningMetadata: {
        configSource: tuningConfig.source,
        promptVersionId: activePromptVersionId,
        weightsVersionId: geoScoreResult.weightsVersionId,
        weightsName: tuningConfigSummary.weightsName,
        loadedAt: tuningConfig.loadedAt,
        scoreBreakdown: geoScoreResult.breakdown.map(b => ({
          metric: b.metric,
          label: b.label,
          score: Math.round(b.score * 100), // Convert 0-1 to 0-100 for UI
          weight: b.weight,
          weightedScore: Math.round(b.weightedScore * 100), // Also scale weighted score
          contribution: b.contribution,
        })),
      },
    }

    // Log successful generation
    const totalDurationMs = Date.now() - startTime
    await logGenerationFlow({
      userId: loggerContext.userId,
      userEmail: loggerContext.userEmail,
      productName: body!.productName,
      keywordsUsed: body!.keywords,
      srtLength: body!.srtContent?.length,
      videoUrl: body!.youtubeUrl,
      pipelineConfig: {
        usePlaybook: body!.usePlaybook,
        language: body!.language,
        pipelineConfig: body!.pipelineConfig,
      },
      promptVersionId: response.tuningMetadata?.promptVersionId ?? undefined,
      weightsVersionId: response.tuningMetadata?.weightsVersionId ?? undefined,
      eventType: 'generation_completed',
      output: {
        descriptionLength: response.description?.full?.length,
        timestampsCount: response.chapters?.timestamps?.split('\n').filter(Boolean).length,
        hashtagsCount: response.hashtags?.length,
        faqCount: response.faq?.faqs?.length,
        qualityScores: response.finalScore ? {
          total: response.finalScore.total,
          keywordDensity: response.finalScore.keywordDensity,
          sentenceStructure: response.finalScore.sentenceStructure,
          questionPatterns: response.finalScore.questionPatterns,
          aiExposure: response.finalScore.aiExposure,
        } : undefined,
        finalScore: response.finalScore?.total,
        groundingSourcesCount: response.groundingMetadata?.sources?.length,
        groundingCitationsCount: response.groundingMetadata?.totalCitations,
      },
      performance: {
        totalDurationMs,
        externalApisCalled,
      },
      requestContext: {
        endpoint: '/api/generate-v2',
        method: 'POST',
        traceId: loggerContext.traceId,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GEO v2] Pipeline error:', error)

    // Log failed generation
    const totalDurationMs = Date.now() - startTime
    await logGenerationFlow({
      userId: loggerContext.userId,
      userEmail: loggerContext.userEmail,
      productName: body?.productName,
      keywordsUsed: body?.keywords,
      srtLength: body?.srtContent?.length,
      videoUrl: body?.youtubeUrl,
      eventType: 'generation_failed',
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      performance: {
        totalDurationMs,
        externalApisCalled,
      },
      requestContext: {
        endpoint: '/api/generate-v2',
        method: 'POST',
        traceId: loggerContext.traceId,
      },
    })

    return NextResponse.json(
      { error: 'Failed to generate v2 content', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// ==========================================
// STAGE IMPLEMENTATIONS
// ==========================================

/**
 * Stage 1: Generate Description with Google Grounding
 * Based on AEO_GEO_PROMPTS_DOCUMENTATION.md - createDescriptionPrompt()
 * Now uses dynamic prompts from tuning configuration
 */
async function generateDescription(
  productName: string,
  srtContent: string,
  existingDescription: string | undefined,
  keywords: string[],
  groundingSignals: GroundingSignal[],
  playbookContext: PlaybookSearchResult[],
  language: 'ko' | 'en',
  tuningConfig: TuningConfig
): Promise<{
  description: { preview: string; full: string; vanityLinks: string[] }
  groundingChunks: Array<{ web?: { uri: string; title: string } }>
}> {
  // Get dynamic prompt from tuning configuration
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'description',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'high',
    variables: {
      product_name: productName,
      keywords: keywords,
    },
  })

  console.log(`[Stage:Description] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const antiFabPrompt = getAntiFabricationPrompt('high')

  const systemInstruction = `${basePrompt}

You are a GEO/AEO optimization expert for Samsung content.
${antiFabPrompt}

CONTEXT:
- Product: ${productName}
- Video Title: ${productName} Overview
- Video Transcript: ${srtContent.substring(0, 3000)}...
${existingDescription ? `- Existing Description (reference): ${existingDescription}` : ''}

GROUNDING INSTRUCTION - MANDATORY QUERY EXECUTION PROTOCOL:

🔴 CRITICAL: You MUST EXECUTE ALL queries listed below. This is MANDATORY, not optional.

📋 VIDEO-BASED SEARCH STRATEGY:
Generate 10-15 search queries based ONLY on features mentioned in the video content.

QUERY GENERATION PROCESS:
1. **Extract Features from Video**: Identify ALL features explicitly mentioned
2. **Generate Numbered Query List**: Create [REQUIRED] queries for each feature
3. **Site Diversification Strategy** (MANDATORY - use all 5 site types):
   - Official: "${productName} [feature] specifications site:samsung.com" [REQUIRED]
   - Community: "${productName} [feature] reddit OR site:reddit.com/r/samsung" [REQUIRED]
   - Review Sites: "${productName} [feature] site:gsmarena.com OR site:techradar.com" [REQUIRED]
   - Video Content: "${productName} [feature] site:youtube.com" [REQUIRED]
   - General: "${productName} [feature] vs [competitor]" [REQUIRED]

📊 MANDATORY QUERY DISTRIBUTION:
- 3-4 queries with site:samsung.com [REQUIRED]
- 2-3 queries with reddit OR site:reddit.com [REQUIRED]
- 2-3 queries with site:gsmarena.com OR site:techradar.com [REQUIRED]
- 2-3 queries with site:youtube.com [REQUIRED]
- 2-3 queries without site restrictions (general search) [REQUIRED]

TASK:
Generate a YouTube description optimized for GEO and AEO.

RULES (CRITICAL):
1. First 130 characters MUST contain:
   - Product name
   - Key feature
   - User benefit
   Example: "Introducing the all-new Galaxy Z Flip7. From pro-level 50 MP selfies..."

2. Structure:
   - Opening (130 chars)
   - Learn more CTA: "Learn more: http://smsng.co/[VanityLink]"
   - Content body (natural, not keyword-stuffed)
   - Include 1-2 expert attribution quotes for credibility

3. GEO/AEO Principles:
   - Use chunking (modular sections)
   - Avoid vague terms ("innovative", "eco-friendly" without context)
   - Add measurable context
   - Use semantic HTML structure mentally (H1, H2 hierarchy)

4. Expert Attribution (GEO/AEO 2025 Best Practice):
   - Include 1-2 authoritative quotes from Samsung experts or industry analysts
   - Format: "According to Samsung Mobile's product team, ${productName}..."
   - Build trust with AI systems through verifiable sources

CRITICAL: SCORING OPTIMIZATION (TARGET: 85+ points)

1. KEYWORD DENSITY (17-19 points target):
   ✅ Place ${productName} within first 50 characters of first_130
   ✅ Include 3+ feature keywords: camera, ai, display, battery, performance
   ✅ Use 2+ synonym groups naturally:
      - phone/device/smartphone/mobile
      - camera/lens/photography/photo
      - display/screen/panel
   ✅ Keep product name repetition under 10% of total words

2. AI EXPOSURE (25-28 points target):
   ✅ Include 3+ competitive keywords: camera, megapixel, foldable, ai, smartphone
   ✅ Use specific technical specifications ("50 MP", "5000mAh", "6.7 inch OLED")
   ✅ Mention brand/tech terms: Samsung, Galaxy, AI, OLED, 5G, Knox, Snapdragon

3. SENTENCE STRUCTURE (13-14 points target):
   ✅ Include 2+ measurable specifications with numbers/units
   ✅ Use natural, specific language (avoid "innovative", "revolutionary")
   ✅ Maintain entity density above 1%

4. LENGTH COMPLIANCE (13-14 points target):
   ✅ first_130: Must be 110-130 characters
   ✅ full_description: 300-1000 characters optimal

## BRAND GUIDELINES
${playbookContext.map(ctx => ctx.content).join('\n\n').slice(0, 2000)}

Output in ${language === 'ko' ? 'Korean' : 'English'}.`

  const userPrompt = `Generate optimized description for ${productName}:

## VIDEO TRANSCRIPT
${srtContent.slice(0, 3000)}

## EXISTING DESCRIPTION (if any)
${existingDescription || 'None provided'}

## TARGET KEYWORDS
${keywords.join(', ')}

## USER INTENT SIGNALS
${groundingSignals.slice(0, 5).map(s => `- ${s.term} (${s.score}%)`).join('\n')}

OUTPUT FORMAT (JSON):
{
  "preview": "exact first 130 characters (110-130 chars, must contain product name + key feature + benefit)",
  "full": "complete description without timestamps/FAQ/hashtags (300-1000 chars)",
  "vanityLinks": ["suggested vanity link name (e.g., ZFlip7_Intro_yt)"]
}`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: descriptionSchema,
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      }),
      { context: 'Description Generation' }
    )

    // Debug: Log raw response structure
    console.log('[Description] Raw response keys:', Object.keys(response))
    console.log('[Description] Response text type:', typeof response.text)
    console.log('[Description] Response text length:', response.text?.length || 0)
    console.log('[Description] Response text preview:', response.text?.slice(0, 200))

    // Check for candidates and error information
    const responseAny = response as unknown as Record<string, unknown>
    if (responseAny.candidates) {
      console.log('[Description] Candidates:', JSON.stringify(responseAny.candidates, null, 2).slice(0, 500))
    }
    if (responseAny.promptFeedback) {
      console.log('[Description] Prompt feedback:', JSON.stringify(responseAny.promptFeedback))
    }
    if (responseAny.error) {
      console.error('[Description] API Error:', JSON.stringify(responseAny.error))
    }

    const content = response.text
    if (!content) throw new Error('No description generated')

    const parsed = safeJsonParse(content, { preview: '', full: '', vanityLinks: [] }, 'Description')

    // Ensure full description exists, fallback to preview or empty string
    const fullDescription = parsed.full || parsed.preview || ''

    // Sanitize for fabrications
    const sanitized = sanitizeContent(fullDescription)
    if (sanitized.wasModified) {
      console.log(`[Description] Sanitized ${sanitized.modifications.length} potential fabrications`)
    }

    // Extract grounding chunks from response
    const groundingChunks = (response as unknown as {
      candidates?: Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri: string; title: string } }>
        }
      }>
    }).candidates?.[0]?.groundingMetadata?.groundingChunks || []

    return {
      description: {
        preview: parsed.preview || sanitized.sanitized.slice(0, 130),
        full: sanitized.sanitized,
        vanityLinks: parsed.vanityLinks || [],
      },
      groundingChunks,
    }
  } catch (error) {
    console.error('[Description] Generation failed:', error)
    return {
      description: {
        preview: `${productName}의 모든 것을 알아보세요.`,
        full: `${productName}의 주요 기능과 특징을 소개합니다. ${keywords.slice(0, 3).join(', ')} 등 다양한 기능을 확인해보세요.`,
        vanityLinks: [`samsung.com/${productName.toLowerCase().replace(/\s+/g, '-')}`],
      },
      groundingChunks: [],
    }
  }
}

/**
 * Stage 2: Generate Chapters
 * Based on AEO_GEO_PROMPTS_DOCUMENTATION.md - createChaptersPrompt()
 */
async function generateChapters(
  srtContent: string,
  productName: string,
  tuningConfig: TuningConfig
): Promise<{ timestamps: string; autoGenerated: boolean }> {
  // Get dynamic prompt from tuning configuration
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'chapters',
    engine: 'gemini',
    language: 'en',
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:Chapters] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const systemInstruction = `${basePrompt}

You are creating GEO/AEO-optimized timestamp chapters for YouTube video navigation.

CRITICAL: Chapters are a strategic SEO asset that:
1. Improve video discoverability in search results
2. Help AI systems understand video structure
3. Enable direct navigation to relevant content
4. Appear in YouTube search and Google video results

CHAPTER QUALITY CRITERIA (GEO/AEO Optimization):

✅ INCLUDE chapters that:
- Describe product features or specifications (e.g., "50MP Camera", "Design", "Display")
- Highlight key functionalities (e.g., "Now Brief", "Gemini Live", "FlexWindow")
- Explain use cases or demos (e.g., "Photo Demo", "Unboxing", "Setup Guide")
- Represent major video sections (e.g., "Intro", "Conclusion", "Key Features")
- Use searchable keywords related to the product
- Are meaningful standalone (users can understand without watching full video)

❌ EXCLUDE chapters that:
- Contain personal names or casual references (e.g., "mochi's dog show")
- Are vague or generic without context (e.g., "Part 1", "Next", "More")
- Reference non-product content (e.g., "Background music", "Credits")
- Don't relate to product features or value proposition

CHAPTER TITLE RULES:

1. LENGTH: 2-5 words maximum (concise and scannable)

2. KEYWORD OPTIMIZATION:
   - Include product feature names when relevant
   - Use terminology users would search for
   - Avoid marketing fluff ("Amazing", "Incredible")
   - Use specific technical terms ("50MP", "OLED", "AI")

3. CLARITY:
   - Descriptive and self-explanatory
   - Title alone should convey section purpose
   - Capitalize first letter of each major word

4. SEARCHABILITY:
   - Would this appear in search results?
   - Does it answer "what's in this section?"
   - Is it product-feature relevant?

EXAMPLES (Good vs Bad):

✅ GOOD CHAPTERS:
- "00:00 Intro"
- "00:16 Design"
- "00:33 50MP Camera"
- "01:00 Now Brief"
- "01:37 Gemini Live"
- "02:15 Battery Life"

❌ BAD CHAPTERS:
- "00:45 mochi's dog show" → Personal reference
- "01:20 Random thoughts" → Vague
- "02:30 Really cool stuff" → Marketing fluff`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Generate GEO/AEO-optimized timestamp chapters for ${productName}:

## SRT TRANSCRIPT
${srtContent.slice(0, 4000)}

## TASK
Create 5-10 meaningful chapter markers based on content transitions.
Each chapter should be SEO-optimized and searchable.

OUTPUT FORMAT (JSON):
{
  "timestamps": "00:00 Intro\\n00:16 Design\\n00:33 50MP Camera\\n...",
  "autoGenerated": true
}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: chaptersSchema,
          temperature: 0.5,
          maxOutputTokens: 2000,
        },
      }),
      { context: 'Chapters Generation' }
    )

    // Debug: Log raw response structure
    console.log('[Chapters] Raw response keys:', Object.keys(response))
    console.log('[Chapters] Response text type:', typeof response.text)
    console.log('[Chapters] Response text length:', response.text?.length || 0)
    console.log('[Chapters] Response text preview:', response.text?.slice(0, 200))

    const content = response.text
    if (!content) throw new Error('No chapters generated')

    const parsed = safeJsonParse(content, { timestamps: '' }, 'Chapters')
    return {
      timestamps: parsed.timestamps || '',
      autoGenerated: true,
    }
  } catch (error) {
    console.error('[Chapters] Generation failed:', error)
    return {
      timestamps: `0:00 ${productName} 소개\n0:30 주요 기능\n1:00 상세 리뷰\n2:00 총평`,
      autoGenerated: true,
    }
  }
}

/**
 * Stage 3: Generate FAQ with Query Fan-Out Methodology
 * Based on AEO_GEO_PROMPTS_DOCUMENTATION.md - createFAQPrompt()
 */
async function generateFAQ(
  productName: string,
  srtContent: string,
  usps: UniqueSellingPoint[],
  groundingSignals: GroundingSignal[],
  language: 'ko' | 'en',
  tuningConfig: TuningConfig
): Promise<{ faqs: FAQItem[]; queryPatternOptimization: boolean }> {
  // Get dynamic prompt from tuning configuration
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'faq',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'medium',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:FAQ] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const antiFabPrompt = getAntiFabricationPrompt('medium')

  const uspSummary = usps.map((usp, i) =>
    `USP ${i + 1}: ${usp.feature} - ${usp.userBenefit}`
  ).join('\n')

  const systemInstruction = `You are creating FAQ for Samsung product content optimized for Query Fan-Out.

## QUERY FAN-OUT STRATEGY
AI systems generate multiple related subqueries from a single user question. Address these patterns:
1. Core feature question: How USPs solve user problems
2. Benefit/Use case question: Real-world applications of USPs
3. Implementation/How-to question: How to use USP features
4. Specification question: Technical details of USPs
5. Troubleshooting question: Common issues with USP features
6. Alternative question: When USPs provide advantage
7. Comparative question: How USPs differentiate from alternatives

## QUESTION RULES (CRITICAL)
1. Questions MUST:
   - Be 10-15 words (conversational search pattern, NOT 2-3 words)
   - Start with How/What/Why/When/Where
   - Reflect real user intent with natural language
   - Cover different query fan-out angles
   - Be specific to product features or usage scenarios

2. QUESTION EXAMPLES (Good vs Bad):
   ❌ Bad: "What is ${productName}'s battery life?" (too short, 7 words)
   ✅ Good: "How long does the ${productName} battery last with heavy social media use and video streaming throughout the day?" (18 words, conversational)

   ❌ Bad: "What are the camera features?" (vague, 5 words)
   ✅ Good: "What makes the ${productName} camera better for selfies compared to traditional smartphones like iPhone 16?" (16 words, comparative)

## ANSWER RULES
1. Answers MUST:
   - Be direct and factual (passage-level complete)
   - Include measurable details (specs, numbers, percentages)
   - Avoid vague marketing language ("innovative", "eco-friendly")
   - Be semantically complete (answer works independently)
   - Be concise (2-4 sentences, 50-100 words)

## GROUNDING INSTRUCTION - MANDATORY FAQ QUERY EXECUTION PROTOCOL

🔴 CRITICAL: You MUST EXECUTE queries for grounding before generating FAQs.

QUERY GENERATION per USP/Feature from Video (use all 5 site types):

1. **Official Specifications** [REQUIRED]:
   - "${productName} [USP feature] specifications site:samsung.com"

2. **Community Discussions** [REQUIRED]:
   - "${productName} [USP feature] reddit OR site:reddit.com/r/samsung"

3. **Expert Reviews** [REQUIRED]:
   - "${productName} [USP feature] site:gsmarena.com OR site:techradar.com"

4. **Video Demonstrations** [REQUIRED]:
   - "${productName} [USP feature] site:youtube.com"

5. **Competitive Comparisons** [REQUIRED]:
   - "${productName} [USP feature] vs [competitor]"

## SCORING OPTIMIZATION (TARGET: 85+ points)

QUESTION PATTERNS (17-20 points target):
✅ ALL questions MUST start with How/What/Why/When/Where (5pts)
✅ Questions must be 10-20 words, conversational and natural (5pts)
✅ Answers must be 50-150 words, direct and factual (5pts)
✅ Generate exactly 5-7 FAQs covering different query fan-out angles (5pts)

${antiFabPrompt}

Output in ${language === 'ko' ? 'Korean' : 'English'}.`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Generate FAQ for ${productName}:

## UNIQUE SELLING POINTS (from grounded research)
${uspSummary}

## USER SEARCH SIGNALS
${groundingSignals.slice(0, 5).map(s => `- ${s.term}`).join('\n')}

## VIDEO TRANSCRIPT
${srtContent.slice(0, 3000)}

## TASK
Generate 5-7 Q&A pairs optimized for AEO (Answer Engine Optimization) using Query Fan-Out methodology.
Each question must be 10-15 words, conversational, and cover different query fan-out angles.`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: faqSchema,
          temperature: 0.7,
          maxOutputTokens: 5000,
        },
      }),
      { context: 'FAQ Generation' }
    )

    // Debug: Log raw response structure
    console.log('[FAQ] Raw response keys:', Object.keys(response))
    console.log('[FAQ] Response text type:', typeof response.text)
    console.log('[FAQ] Response text length:', response.text?.length || 0)
    console.log('[FAQ] Response text preview:', response.text?.slice(0, 300))

    const content = response.text
    if (!content) throw new Error('No FAQ generated')

    const parsed = safeJsonParse(content, { faqs: [] }, 'FAQ')
    return {
      faqs: parsed.faqs || [],
      queryPatternOptimization: true,
    }
  } catch (error) {
    console.error('[FAQ] Generation failed:', error)
    return {
      faqs: [
        {
          question: `${productName}의 가장 큰 특징은 무엇인가요?`,
          answer: usps[0]?.differentiation || '최신 기술을 탑재한 프리미엄 제품입니다.',
          linkedUSPs: usps[0] ? [usps[0].feature] : [],
          confidence: 'medium',
        },
      ],
      queryPatternOptimization: false,
    }
  }
}

/**
 * Stage 4: Generate Step-by-Step (for tutorial content)
 * Based on AEO_GEO_PROMPTS_DOCUMENTATION.md - createStepByStepPrompt()
 */
async function generateStepByStep(
  srtContent: string,
  productName: string,
  language: 'ko' | 'en',
  tuningConfig: TuningConfig
): Promise<{ steps: string[]; isTutorialContent: boolean; reasoning?: string }> {
  // Get dynamic prompt from tuning configuration (no dedicated stage, use generic)
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'chapters', // Using chapters stage as step-by-step is similar instructional content
    engine: 'gemini',
    language,
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:StepByStep] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const systemInstruction = `${basePrompt}

You are determining if step-by-step instructions are needed for this video.

## TASK
1. Determine if step-by-step instructions would benefit users
2. If yes, create them in a clear, actionable format

## CRITERIA FOR "YES" (needed = true):
✅ Video is How-to, Tutorial, or Guided Demo
✅ Feature requires specific sequence of actions
✅ User might struggle without guidance
✅ Video demonstrates a process or workflow

## CRITERIA FOR "NO" (needed = false):
❌ Purely promotional (Intro films, product showcases)
❌ No actionable steps shown
❌ Too simple to require instructions
❌ Conceptual or informational only

## STEP FORMAT RULES (if needed = true):
1. Each step must be clear and actionable
2. Use imperative verbs: "Open", "Navigate", "Select", "Enable"
3. Include specific UI elements or settings names
4. Number steps sequentially
5. Keep each step concise (1-2 sentences)
6. Include expected outcomes where relevant

## EXAMPLES:
✅ Good Step: "Step 1: Open Settings app and navigate to 'Display' section."
❌ Bad Step: "First you should maybe look at the settings."

✅ Good Step: "Step 2: Toggle 'Always On Display' to enable the feature."
❌ Bad Step: "Turn on the display thing."

Output in ${language === 'ko' ? 'Korean' : 'English'}.`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Analyze this video content for ${productName} and determine if step-by-step instructions are needed:

## VIDEO TRANSCRIPT
${srtContent.slice(0, 3000)}

## TASK
1. First determine if this content needs step-by-step instructions (YES/NO criteria above)
2. If yes, create clear, actionable steps
3. Provide reasoning for your decision`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              needed: {
                type: 'boolean',
                description: 'Whether step-by-step instructions are needed',
              },
              reasoning: {
                type: 'string',
                description: '2-3 sentences explaining why step-by-step is or isn\'t needed',
              },
              steps: {
                type: 'array',
                items: { type: 'string' },
                description: 'Clear, actionable steps if needed',
              },
            },
            required: ['needed', 'reasoning', 'steps'],
          },
          temperature: 0.5,
          maxOutputTokens: 2500,
        },
      }),
      { context: 'Step-by-step Generation' }
    )

    const content = response.text
    if (!content) throw new Error('No steps generated')

    const parsed = safeJsonParse(content, { needed: false, steps: [], reasoning: '' }, 'Step-by-step')
    return {
      steps: parsed.needed ? (parsed.steps || []) : [],
      isTutorialContent: parsed.needed || false,
      reasoning: parsed.reasoning,
    }
  } catch (error) {
    console.error('[Step-by-step] Generation failed:', error)
    return { steps: [], isTutorialContent: false }
  }
}

/**
 * Stage 5: Generate Case Studies
 * Enhanced with anti-fabrication and realistic use case guidelines
 */
async function generateCaseStudies(
  productName: string,
  usps: UniqueSellingPoint[],
  groundingSignals: GroundingSignal[],
  language: 'ko' | 'en',
  tuningConfig: TuningConfig
): Promise<CaseStudyResult> {
  // Get dynamic prompt from tuning configuration
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'case_studies',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'high',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:CaseStudies] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const antiFabPrompt = getAntiFabricationPrompt('high')

  const uspContext = usps.slice(0, 3).map((usp, i) =>
    `USP ${i + 1}: ${usp.feature}\n  - Benefit: ${usp.userBenefit}\n  - Confidence: ${usp.confidence}`
  ).join('\n\n')

  const systemInstruction = `You are creating realistic use case scenarios for Samsung products.

## CASE STUDY QUALITY STANDARDS

### REALISTIC SCENARIOS:
1. Use relatable user personas (e.g., "content creator", "business professional", "parent")
2. Describe specific situations where USP features solve real problems
3. Include context that matches the target audience's lifestyle

### ANTI-FABRICATION RULES:
${antiFabPrompt}

### HEDGING LANGUAGE FOR UNVERIFIED CLAIMS:
When outcomes cannot be verified, use safe language:
- "Designed to help users..."
- "Enables [persona] to..."
- "Potential improvement in..."
- "Built to support..."

### DO NOT:
❌ Invent specific percentages or statistics
❌ Claim "studies show" without sources
❌ Make competitive claims without evidence
❌ Use superlatives like "best", "revolutionary", "unprecedented"

### DO:
✅ Use specific feature names and specifications
✅ Connect features to user benefits
✅ Include realistic usage contexts
✅ Cite USP evidence where available

Output in ${language === 'ko' ? 'Korean' : 'English'}.`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Generate realistic case studies for ${productName}:

## USPs TO DEMONSTRATE
${uspContext}

## USER INTEREST SIGNALS
${groundingSignals.slice(0, 3).map(s => `- ${s.term}`).join('\n')}

## TASK
Create 2-3 realistic use case scenarios that:
1. Demonstrate specific USP benefits
2. Are relatable to target users
3. Include realistic outcomes based on actual features
4. Use hedging language for claims without verification`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: caseStudySchema,
          temperature: 0.7,
          maxOutputTokens: 5000,
        },
      }),
      { context: 'Case Studies Generation' }
    )

    const content = response.text
    if (!content) throw new Error('No case studies generated')

    const parsed = safeJsonParse(content, { caseStudies: [] }, 'CaseStudies')
    return {
      caseStudies: parsed.caseStudies || [],
      extractionMethod: 'grounded',
    }
  } catch (error) {
    console.error('[Case Studies] Generation failed:', error)
    return { caseStudies: [], extractionMethod: 'generative' }
  }
}

/**
 * Stage 6: Generate Keywords with GEO/AEO Scoring
 * Based on AEO_GEO_PROMPTS_DOCUMENTATION.md - createKeywordsPrompt()
 */
async function generateKeywords(
  productName: string,
  srtContent: string,
  inputKeywords: string[],
  groundingSignals: GroundingSignal[],
  language: 'ko' | 'en',
  tuningConfig: TuningConfig
): Promise<{
  product: string[];
  generic: string[];
  densityScore: number;
  questionScore?: number;
  structureScore?: number;
  lengthScore?: number;
  preliminaryTotal?: number;
}> {
  // Get dynamic prompt from tuning configuration
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'keywords',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
      keywords: inputKeywords,
    },
  })

  console.log(`[Stage:Keywords] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const systemInstruction = `${basePrompt}

You are extracting and analyzing keywords for GEO/AEO scoring.

## CATEGORIES

### Product-specific Keywords:
- Product names and model numbers (e.g., Galaxy Z Flip7, Galaxy S25 Ultra)
- Unique features and proprietary terms (e.g., FlexWindow, ProVisual Engine, Galaxy AI)
- Brand identifiers (Samsung, Galaxy, One UI)
- Specific specifications (e.g., 50 MP camera, 3.4-inch display)

### Generic Competitive Keywords:
- Industry terms (foldable phone, smartphone, AI camera)
- Use case terms (selfie, mobile photography, productivity)
- Benefit terms (hands-free, portable, compact)
- Category descriptors (premium, flagship, compact)

## SCORING CRITERIA (70 points total - AI exposure calculated separately)

### 1. KEYWORD DENSITY (20pts):
- Product name in first 30 characters: 5pts
- 3+ feature keywords present: 5pts
- Natural placement (no stuffing): 5pts
- Synonym usage (variety): 5pts

### 2. QUESTION PATTERNS (20pts):
- How/What/Why/When/Where questions: 5pts
- User intent reflected: 5pts
- Direct, clear answers: 5pts
- 4-7 FAQ count: 5pts

### 3. SENTENCE STRUCTURE (15pts):
- Chunkable content (modular sections): 5pts
- Lists/tables/structured format: 5pts
- Semantic clarity (no vague terms): 5pts

### 4. LENGTH COMPLIANCE (15pts):
- First 130 chars optimized: 5pts
- Description under 5000 chars: 5pts
- Appropriate detail level: 5pts

## OUTPUT REQUIREMENTS
Extract keywords that maximize discoverability while maintaining natural language flow.
Prioritize keywords that match user search intent and trending signals.

Output in ${language === 'ko' ? 'Korean' : 'English'}.`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Extract and analyze keywords for ${productName}:

## VIDEO TRANSCRIPT
${srtContent.slice(0, 2000)}

## USER INPUT KEYWORDS
${inputKeywords.join(', ')}

## TRENDING SIGNALS
${groundingSignals.slice(0, 5).map(s => s.term).join(', ')}

## TASK
1. Extract and categorize keywords (product-specific and generic)
2. Score based on GEO/AEO criteria
3. Ensure natural keyword placement recommendations`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              product: {
                type: 'array',
                items: { type: 'string' },
                description: 'Product-specific keywords',
              },
              generic: {
                type: 'array',
                items: { type: 'string' },
                description: 'Generic competitive keywords',
              },
              densityScore: {
                type: 'number',
                description: 'Keyword density score (0-20)',
              },
              questionScore: {
                type: 'number',
                description: 'Question patterns score (0-20)',
              },
              structureScore: {
                type: 'number',
                description: 'Sentence structure score (0-15)',
              },
              lengthScore: {
                type: 'number',
                description: 'Length compliance score (0-15)',
              },
              preliminaryTotal: {
                type: 'number',
                description: 'Total preliminary score (0-70)',
              },
            },
            required: ['product', 'generic', 'densityScore'],
          },
          temperature: 0.5,
          maxOutputTokens: 2000,
        },
      }),
      { context: 'Keywords Generation' }
    )

    const content = response.text
    if (!content) throw new Error('No keywords generated')

    const parsed = safeJsonParse(content, {
      product: [] as string[],
      generic: [] as string[],
      densityScore: 50,
      questionScore: undefined as number | undefined,
      structureScore: undefined as number | undefined,
      lengthScore: undefined as number | undefined,
      preliminaryTotal: undefined as number | undefined,
    }, 'Keywords')
    return {
      product: parsed.product || [],
      generic: parsed.generic || [],
      densityScore: parsed.densityScore || 50,
      questionScore: parsed.questionScore,
      structureScore: parsed.structureScore,
      lengthScore: parsed.lengthScore,
      preliminaryTotal: parsed.preliminaryTotal,
    }
  } catch (error) {
    console.error('[Keywords] Generation failed:', error)
    return {
      product: [productName, 'Samsung', 'Galaxy'],
      generic: inputKeywords,
      densityScore: 50,
    }
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Fetch grounding signals from Google Custom Search
 */
async function fetchGoogleGroundingSignals(
  productName: string,
  keywords: string[]
): Promise<Array<{ title?: string; snippet?: string; url?: string; date?: string }>> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    const cx = process.env.GOOGLE_CX

    if (!apiKey || !cx) {
      console.warn('[Google Grounding] Missing API key or CX')
      return []
    }

    const queries = [
      `${productName} review 2024 2025`,
      `${productName} ${keywords[0] || 'features'} specs`,
      `Samsung ${productName} comparison`,
    ]

    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`
          const response = await fetch(url)

          if (!response.ok) {
            console.warn(`[Google Grounding] Search failed for "${query}": ${response.status}`)
            return []
          }

          const data = await response.json()
          return (data.items || []).map((item: { title?: string; snippet?: string; link?: string; pagemap?: { metatags?: Array<{ 'article:published_time'?: string }> } }) => ({
            title: item.title,
            snippet: item.snippet,
            url: item.link,
            date: item.pagemap?.metatags?.[0]?.['article:published_time'],
          }))
        } catch (err) {
          console.warn(`[Google Grounding] Query error: ${err}`)
          return []
        }
      })
    )

    const allResults = results.flat()
    console.log(`[Google Grounding] Fetched ${allResults.length} results`)
    return allResults
  } catch (error) {
    console.error('[Google Grounding] Failed:', error)
    return []
  }
}

/**
 * Fetch grounding signals from Perplexity
 */
async function fetchPerplexityGroundingSignals(
  productName: string,
  keywords: string[]
): Promise<Array<{ title?: string; snippet?: string; url?: string; date?: string }>> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      console.warn('[Perplexity Grounding] No API key')
      return []
    }

    const queries = [
      `${productName} reviews 2024 2025`,
      `${productName} features specifications`,
      `${productName} ${keywords[0] || 'camera'} performance`,
    ]

    const results = await Promise.all(
      queries.map(query =>
        fetch('https://api.perplexity.ai/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            max_results: 5,
            max_tokens_per_page: 512,
          }),
        })
          .then(r => r.ok ? r.json() : { results: [] })
          .then(d => d.results || [])
          .catch(() => [])
      )
    )

    const allResults = results.flat()
    console.log(`[Perplexity Grounding] Fetched ${allResults.length} results`)
    return allResults
  } catch (error) {
    console.error('[Perplexity Grounding] Failed:', error)
    return []
  }
}

/**
 * Fetch grounding signals from multiple sources (Google + Perplexity)
 * @param enhanced - When true, performs deeper search with more queries for regeneration
 */
async function fetchGroundingSignals(
  productName: string,
  keywords: string[],
  launchDate?: string,
  enhanced?: boolean
): Promise<GroundingSignal[]> {
  try {
    // Enhanced mode: use more keywords and additional search variations
    const searchKeywords = enhanced
      ? [...keywords, `${productName} specifications`, `${productName} features`, `${productName} review`]
      : keywords

    // Fetch from both sources in parallel
    const [googleResults, perplexityResults] = await Promise.all([
      fetchGoogleGroundingSignals(productName, searchKeywords),
      fetchPerplexityGroundingSignals(productName, searchKeywords),
    ])

    const allResults = [...googleResults, ...perplexityResults]

    if (allResults.length === 0) {
      console.warn('[Grounding] No results from any source, using fallback')
      return generateFallbackSignals(productName, keywords)
    }

    console.log(`[Grounding] Combined ${allResults.length} results from Google (${googleResults.length}) + Perplexity (${perplexityResults.length})${enhanced ? ' [ENHANCED]' : ''}`)
    return extractSignalsFromResults(allResults, keywords)
  } catch (error) {
    console.error('[Grounding] Failed:', error)
    return generateFallbackSignals(productName, keywords)
  }
}

/**
 * Extract signals from search results
 */
function extractSignalsFromResults(
  results: Array<{ title?: string; snippet?: string; url?: string; date?: string }>,
  userKeywords: string[]
): GroundingSignal[] {
  const signalMap = new Map<string, { count: number; sources: string[]; recency?: string }>()

  const intentPatterns = [
    'camera', 'battery', 'display', 'performance', 'AI', 'Galaxy AI',
    'design', 'charging', 'storage', 'price', 'comparison', 'review',
    '카메라', '배터리', '디스플레이', '성능', '가격', '디자인',
  ]

  for (const result of results) {
    const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase()

    for (const pattern of intentPatterns) {
      if (text.includes(pattern.toLowerCase())) {
        const existing = signalMap.get(pattern) || { count: 0, sources: [] }
        existing.count++
        if (result.url) existing.sources.push(result.url)
        if (result.date && !existing.recency) existing.recency = result.date
        signalMap.set(pattern, existing)
      }
    }

    for (const keyword of userKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        const existing = signalMap.get(keyword) || { count: 0, sources: [] }
        existing.count += 2
        signalMap.set(keyword, existing)
      }
    }
  }

  const maxCount = Math.max(...Array.from(signalMap.values()).map(v => v.count), 1)

  return Array.from(signalMap.entries())
    .map(([term, data]) => ({
      term,
      score: Math.round((data.count / maxCount) * 100),
      source: data.sources[0],
      recency: data.recency,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
}

/**
 * Generate fallback signals when API unavailable
 */
function generateFallbackSignals(productName: string, keywords: string[]): GroundingSignal[] {
  const defaultSignals = ['camera', 'battery', 'display', 'performance', 'AI', 'design']
  return [...keywords, ...defaultSignals].slice(0, 10).map((term, i) => ({
    term,
    score: 100 - i * 10,
  }))
}

/**
 * Fetch playbook context
 */
async function fetchPlaybookContext(
  productName: string,
  keywords: string[],
  productCategory?: ProductCategory | 'all',
  enhanced?: boolean
): Promise<PlaybookSearchResult[]> {
  try {
    // Enhanced mode: use more queries and more results for better USP coverage
    const baseQueries = [
      `Samsung brand guidelines ${productName}`,
      `GEO optimization AI search content`,
      `Samsung tone of voice writing style`,
      ...keywords.slice(0, 2).map(k => `Samsung ${k} marketing`),
    ]

    const queries = enhanced
      ? [
          ...baseQueries,
          `${productName} unique selling points USP`,
          `${productName} key features benefits`,
          `Samsung ${productName} product positioning`,
          ...keywords.slice(2, 5).map(k => `Samsung ${k} ${productName}`),
        ]
      : baseQueries

    const ragContext = await multiQuerySearch(queries, {
      productCategory,
      topKPerQuery: enhanced ? 5 : 3,
      finalTopN: enhanced ? 15 : 8,
      deduplicateByContent: true,
    })

    if (enhanced) {
      console.log(`[Playbook] Enhanced mode: fetched ${ragContext.results.length} chunks`)
    }

    return ragContext.results
  } catch (error) {
    console.error('[Playbook] Failed:', error)
    return []
  }
}

/**
 * Extract sources from grounding chunks
 */
function extractSourcesFromGrounding(
  chunks: Array<{ web?: { uri: string; title: string } }>
): GroundingSource[] {
  return extractGroundingSources(chunks)
}

/**
 * Convert GroundingSignals to GroundingSource[] format
 * This enables USP enrichment when Gemini native grounding is not available
 */
function convertSignalsToSources(signals: GroundingSignal[]): GroundingSource[] {
  const sources: GroundingSource[] = []
  const seenUrls = new Set<string>()

  for (const signal of signals) {
    if (signal.source && !seenUrls.has(signal.source)) {
      seenUrls.add(signal.source)
      sources.push({
        uri: signal.source,
        title: signal.term, // Use the search term as title
        usedIn: ['grounding_signals'],
        tier: getSourceTier(signal.source),
      })
    }
  }

  return sources.sort((a, b) => a.tier - b.tier) // Sort by tier (1 = best first)
}

/**
 * Extract sources from USPs
 */
function extractUSPSources(usps: UniqueSellingPoint[]): GroundingSource[] {
  const sources: GroundingSource[] = []
  for (const usp of usps) {
    if (usp.evidence.sources) {
      for (const source of usp.evidence.sources) {
        if (source.startsWith('http')) {
          sources.push({
            uri: source,
            title: 'USP Evidence',
            usedIn: ['usp_extraction'],
            tier: getSourceTier(source),
          })
        }
      }
    }
  }
  return sources
}

/**
 * Extract sources from FAQs
 */
function extractFAQSources(faqs: FAQItem[]): GroundingSource[] {
  // FAQs may reference sources in answers - extract URLs
  const sources: GroundingSource[] = []
  const urlRegex = /https?:\/\/[^\s]+/g

  for (const faq of faqs) {
    const matches = faq.answer.match(urlRegex) || []
    for (const url of matches) {
      sources.push({
        uri: url,
        title: 'FAQ Reference',
        usedIn: ['faq'],
        tier: getSourceTier(url),
      })
    }
  }
  return sources
}

/**
 * Extract sources from case studies
 */
function extractCaseStudySources(caseStudies: CaseStudy[]): GroundingSource[] {
  const sources: GroundingSource[] = []
  const urlRegex = /https?:\/\/[^\s]+/g

  for (const study of caseStudies) {
    const text = `${study.scenario} ${study.solution}`
    const matches = text.match(urlRegex) || []
    for (const url of matches) {
      sources.push({
        uri: url,
        title: 'Case Study Reference',
        usedIn: ['case_studies'],
        tier: getSourceTier(url),
      })
    }
  }
  return sources
}

/**
 * Detect if content is tutorial/how-to
 */
function detectTutorialContent(srtContent: string): boolean {
  const tutorialIndicators = [
    '방법', 'how to', '단계', 'step', '따라', 'follow',
    '설정', 'setup', '사용법', 'guide', '튜토리얼', 'tutorial',
  ]

  const lowerContent = srtContent.toLowerCase()
  return tutorialIndicators.some(indicator =>
    lowerContent.includes(indicator.toLowerCase())
  )
}

/**
 * Calculate length compliance score
 */
function calculateLengthComplianceScore(description: string): number {
  const length = description.length
  if (length >= 300 && length <= 500) return 15
  if (length >= 250 && length <= 550) return 12
  if (length >= 200 && length <= 600) return 9
  if (length >= 150 && length <= 700) return 6
  return 3
}

/**
 * Generate strategic hashtags for YouTube SEO optimization
 * Uses AI to create categorized hashtags optimized for discovery
 */
async function generateHashtags(
  productName: string,
  description: string,
  usps: UniqueSellingPoint[],
  keywords: { product: string[]; generic: string[] },
  language: 'ko' | 'en',
  tuningConfig: TuningConfig
): Promise<{
  hashtags: string[]
  categories: {
    brand: string[]
    features: string[]
    industry: string[]
  }
  reasoning?: string
}> {
  // Get dynamic prompt from tuning configuration
  const { prompt: basePrompt, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'hashtags',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:Hashtags] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const systemInstruction = `${basePrompt}

You are generating strategic hashtags for YouTube SEO optimization.

## YOUR MISSION
Create 5-8 strategic hashtags optimized for YouTube discovery and SEO.

## HASHTAG STRATEGY

### 1. BRAND HASHTAGS (1-2 required)
- Product name without spaces: #GalaxyZFlip7
- Brand tags: #Samsung #GalaxyAI #WithGalaxy

### 2. FEATURE HASHTAGS (2-3 required)
- From USP features and categories
- Technical specifications (e.g., #50MPCamera #FlexWindow #FoldablePhone)
- Key capabilities (e.g., #AICamera #ProVisualEngine)

### 3. INDUSTRY HASHTAGS (2-3 required)
- Broader category terms for discovery
- Trending tech hashtags
- Use case hashtags (e.g., #MobilePhotography #TechReview #Smartphone)

## FORMATTING RULES
1. No spaces - use CamelCase for readability
2. Start with # symbol
3. Keep each hashtag under 20 characters
4. Total character count under 100
5. First 3 hashtags appear in YouTube search - prioritize discoverability

## PRIORITIZATION ORDER
- Position 1: Product name (most specific)
- Position 2-3: Key differentiating features
- Position 4-5: Category/industry terms
- Position 6-8: Trending/broad reach terms

## FORBIDDEN
❌ Generic tags like #tech #phone #new
❌ Overly long hashtags (>20 characters)
❌ Competitor brand names (iPhone, Pixel, etc.)
❌ Irrelevant trending tags

## LANGUAGE CONSIDERATION
${language === 'ko' ? '- Include 1-2 Korean hashtags for local discovery (e.g., #삼성, #갤럭시)' : '- Use English-only hashtags for global reach'}

Output must be valid JSON.`

  const userPrompt = `Generate strategic hashtags for this Samsung product:

## PRODUCT
${productName}

## DESCRIPTION EXCERPT
${description.substring(0, 500)}...

## KEY FEATURES (USPs)
${usps.map(u => `- ${u.feature} (${u.category})`).join('\n')}

## PRODUCT KEYWORDS
${keywords.product.join(', ')}

## GENERIC KEYWORDS
${keywords.generic.join(', ')}

Generate 5-8 strategic hashtags following the categorization strategy.`

  const hashtagSchema = {
    type: 'object',
    properties: {
      hashtags: {
        type: 'array',
        items: { type: 'string' },
        minItems: 5,
        maxItems: 8,
        description: 'Ordered list of hashtags by priority',
      },
      categories: {
        type: 'object',
        properties: {
          brand: {
            type: 'array',
            items: { type: 'string' },
            description: 'Brand-related hashtags (1-2)',
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'Feature-based hashtags (2-3)',
          },
          industry: {
            type: 'array',
            items: { type: 'string' },
            description: 'Industry/category hashtags (2-3)',
          },
        },
        required: ['brand', 'features', 'industry'],
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of hashtag selection strategy',
      },
    },
    required: ['hashtags', 'categories'],
  }

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: hashtagSchema,
          temperature: 0.4,
          maxOutputTokens: 1500,
        },
      }),
      { context: 'Hashtags Generation' }
    )

    const content = response.text
    if (!content) {
      console.warn('[Hashtags] No response, using fallback')
      return getFallbackHashtags(productName, keywords, language)
    }

    const parsed = safeJsonParse(content, { hashtags: [], categories: { brand: [], features: [], industry: [] }, reasoning: '' }, 'Hashtags')

    // Validate hashtag format
    const validatedHashtags = parsed.hashtags
      .filter((h: string) => h.startsWith('#') && h.length <= 20)
      .slice(0, 8)

    console.log(`[Hashtags] Generated ${validatedHashtags.length} strategic hashtags`)

    return {
      hashtags: validatedHashtags,
      categories: parsed.categories || { brand: [], features: [], industry: [] },
      reasoning: parsed.reasoning,
    }
  } catch (error) {
    console.error('[Hashtags] Generation error:', error)
    return getFallbackHashtags(productName, keywords, language)
  }
}

/**
 * Fallback hashtag generation when AI fails
 */
function getFallbackHashtags(
  productName: string,
  keywords: { product: string[]; generic: string[] },
  language: 'ko' | 'en'
): {
  hashtags: string[]
  categories: { brand: string[]; features: string[]; industry: string[] }
} {
  const productTag = `#${productName.replace(/\s+/g, '')}`
  const brandTags = language === 'ko'
    ? ['#Samsung', '#삼성', '#GalaxyAI']
    : ['#Samsung', '#Galaxy', '#GalaxyAI']

  const featureTags = keywords.product
    .slice(0, 3)
    .map(k => `#${k.replace(/\s+/g, '')}`)
    .filter(h => h.length <= 20)

  const industryTags = language === 'ko'
    ? ['#테크리뷰', '#스마트폰', '#언박싱']
    : ['#TechReview', '#Smartphone', '#Unboxing']

  const allHashtags = [productTag, ...brandTags.slice(0, 1), ...featureTags, ...industryTags]
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 8)

  return {
    hashtags: allHashtags,
    categories: {
      brand: [productTag, brandTags[0]],
      features: featureTags,
      industry: industryTags,
    },
  }
}

/**
 * Mock response for development
 */
function getMockV2Response(productName: string, keywords: string[]): GEOv2GenerateResponse {
  return {
    description: {
      preview: `${productName}의 혁신적인 기능을 만나보세요!`,
      full: `${productName}의 주요 기능과 특징을 자세히 알아보세요. ${keywords.slice(0, 3).join(', ')} 등 다양한 기능을 확인할 수 있습니다. Galaxy AI와 함께하는 새로운 경험을 시작하세요.`,
      vanityLinks: [`samsung.com/${productName.toLowerCase().replace(/\s+/g, '-')}`],
    },
    uspResult: {
      usps: [],
      competitiveContext: '',
      extractionMethod: 'generative',
      groundingQuality: 0,
    },
    chapters: {
      timestamps: `0:00 인트로\n0:30 주요 기능\n1:00 상세 리뷰\n2:00 총평`,
      autoGenerated: true,
    },
    faq: {
      faqs: [],
      queryPatternOptimization: false,
    },
    keywords: {
      product: [productName, 'Samsung', 'Galaxy'],
      generic: keywords,
      densityScore: 50,
    },
    hashtags: ['#Samsung', `#${productName.replace(/\s+/g, '')}`, '#GalaxyAI'],
    finalScore: {
      keywordDensity: 10,
      aiExposure: 15,
      questionPatterns: 10,
      sentenceStructure: 10,
      lengthCompliance: 10,
      groundingQuality: {
        citationDensity: 0,
        sourceAuthority: 0,
        coverage: 0,
        total: 0,
        breakdown: {
          citationPercentage: 0,
          tier1Sources: 0,
          tier2Sources: 0,
          tier3Sources: 0,
          sectionsWithGrounding: 0,
          totalSections: 7,
        },
      },
      total: 55,
    },
    groundingMetadata: {
      webSearchQueries: [],
      sources: [],
      citationDensity: 0,
      totalCitations: 0,
      uniqueSources: 0,
    },
    progress: [],
  }
}
