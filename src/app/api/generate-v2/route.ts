/**
 * GEO v2 Generation API Route
 * 7-Stage Pipeline with USP-Centric Architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import {
  multiQuerySearch,
  getSectionContext,
  fetchContentGenerationContext,
} from '@/lib/rag/search'
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
import {
  createGenerationCacheKey,
  getHybridCache,
  setHybridCache,
  getHybridCacheStats,
} from '@/lib/cache/hybrid-cache'
import type {
  GEOv2GenerateResponse,
  PipelineProgress,
  GroundingSource,
  UniqueSellingPoint,
  FAQItem,
  CaseStudy,
  CaseStudyResult,
} from '@/types/geo-v2'
import type {
  ProductCategory,
  PlaybookSection,
  SamsungContentType,
  VideoFormat,
  PlaybookSearchResult,
} from '@/types/playbook'
import { calculateContentQualityScores } from '@/lib/scoring/content-quality'
import { generateImageAltTexts } from '@/lib/geo-v2/image-alt-generator'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ==========================================
// RETRY HELPER FOR TRANSIENT FAILURES
// ==========================================

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  context?: string
  /** If true, will not retry even on retryable errors */
  noRetry?: boolean
}

interface ErrorClassification {
  isRetryable: boolean
  isRateLimit: boolean
  isServerError: boolean
  isNetworkError: boolean
  suggestedDelayMultiplier: number
}

/**
 * Classify errors for smarter retry behavior
 */
function classifyError(error: Error, rawError: unknown): ErrorClassification {
  const errorMessage = error.message.toLowerCase()
  const errorCode = (rawError as { code?: string })?.code?.toLowerCase() || ''
  const statusCode = (rawError as { status?: number })?.status

  // Rate limit detection (429 or Gemini quota errors)
  const isRateLimit =
    statusCode === 429 ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('resource exhausted') ||
    errorMessage.includes('too many requests')

  // Server errors (5xx)
  const isServerError =
    (statusCode && statusCode >= 500 && statusCode < 600) ||
    errorMessage.includes('internal server error') ||
    errorMessage.includes('service unavailable') ||
    errorMessage.includes('bad gateway')

  // Network/connection errors
  const isNetworkError =
    errorCode === 'econnreset' ||
    errorCode === 'etimedout' ||
    errorCode === 'econnrefused' ||
    errorCode === 'enotfound' ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('socket') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch failed')

  // Determine if retryable
  const isRetryable = isRateLimit || isServerError || isNetworkError

  // Suggest delay multiplier based on error type
  let suggestedDelayMultiplier = 1
  if (isRateLimit) {
    suggestedDelayMultiplier = 3 // Much longer wait for rate limits
  } else if (isServerError) {
    suggestedDelayMultiplier = 2 // Moderate wait for server issues
  }

  return {
    isRetryable,
    isRateLimit,
    isServerError,
    isNetworkError,
    suggestedDelayMultiplier
  }
}

/**
 * Retry wrapper with exponential backoff for Gemini API calls
 * Handles ECONNRESET, timeout, rate limits, and other transient failures
 *
 * Tuned for less aggressive retry behavior:
 * - Longer base delay (1500ms) to avoid hammering API
 * - Proportional jitter (10-30% of delay)
 * - Special handling for rate limits with longer backoff
 * - Maximum 3 retries with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1500, // Increased from 1000 for less aggressive retry
    maxDelayMs = 15000, // Increased from 10000
    context = 'API call',
    noRetry = false
  } = options

  let lastError: Error | null = null
  let consecutiveRateLimits = 0

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      // Reset rate limit counter on success
      consecutiveRateLimits = 0
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const classification = classifyError(lastError, error)

      // Don't retry if explicitly disabled or not retryable
      if (noRetry || !classification.isRetryable || attempt === maxRetries) {
        const reason = noRetry
          ? 'retry disabled'
          : !classification.isRetryable
            ? 'non-retryable error'
            : 'max retries reached'
        console.error(`[${context}] ${reason}:`, lastError.message)
        throw lastError
      }

      // Track consecutive rate limits for circuit-breaker behavior
      if (classification.isRateLimit) {
        consecutiveRateLimits++
        // If we hit multiple rate limits, use even longer delays
        if (consecutiveRateLimits >= 2) {
          console.warn(`[${context}] Multiple rate limits detected, backing off significantly`)
        }
      }

      // Calculate delay with exponential backoff
      const backoffFactor = Math.pow(2, attempt - 1)
      const rateMultiplier = classification.suggestedDelayMultiplier
      const consecutiveMultiplier = consecutiveRateLimits >= 2 ? 2 : 1

      const baseExponentialDelay = baseDelayMs * backoffFactor * rateMultiplier * consecutiveMultiplier
      const cappedDelay = Math.min(baseExponentialDelay, maxDelayMs)

      // Proportional jitter (10-30% of delay) for better distribution
      const jitterPercent = 0.1 + Math.random() * 0.2
      const jitter = cappedDelay * jitterPercent
      const delay = cappedDelay + jitter

      const errorType = classification.isRateLimit
        ? 'rate-limit'
        : classification.isServerError
          ? 'server-error'
          : 'network-error'

      console.warn(
        `[${context}] Attempt ${attempt}/${maxRetries} failed ` +
        `(${errorType}: ${lastError.message.substring(0, 100)}), ` +
        `retrying in ${Math.round(delay)}ms...`
      )

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
  // Samsung Standard Fields (Part 5.4)
  contentType?: 'intro' | 'unboxing' | 'how_to' | 'shorts' | 'teaser' | 'brand' | 'esg' | 'documentary' | 'official_replay'
  videoFormat?: 'feed_16x9' | 'shorts_9x16'
  fixedHashtags?: string[]
  useFixedHashtags?: boolean
  vanityLinkCode?: string
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
      // Samsung Standard Fields (Part 5.4)
      contentType = 'intro',
      videoFormat = 'feed_16x9',
      fixedHashtags = [],
      useFixedHashtags = false,
      vanityLinkCode = '',
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

    // ==========================================
    // CACHE CHECK (skip for regeneration)
    // ==========================================
    const cacheKey = createGenerationCacheKey({
      productName,
      srtContent,
      keywords,
      language,
      pipelineConfig,
    })

    if (!isRegeneration) {
      const cacheResult = await getHybridCache<GEOv2GenerateResponse>(cacheKey)
      if (cacheResult.cacheHit && cacheResult.value) {
        const cacheStats = await getHybridCacheStats()
        console.log(`[GEO v2] 캐시 HIT (L${cacheResult.cacheSource === 'l1' ? '1' : '2'}, L1: ${cacheStats.l1.hitRate}, 총 요청: ${cacheStats.overall.totalRequests})`)
        return NextResponse.json({
          ...cacheResult.value,
          cached: true,
          cacheSource: cacheResult.cacheSource,
          cacheStats: {
            l1HitRate: cacheStats.overall.l1HitRate,
            l2HitRate: cacheStats.overall.l2HitRate,
            l1Size: cacheStats.l1.size,
            l2Size: cacheStats.l2?.totalEntries ?? 0,
          },
        })
      }
      console.log(`[GEO v2] 캐시 MISS - 새 콘텐츠 생성 중`)
    }

    console.log(`[GEO v2] 파이프라인 시작: ${pipelineConfig}${isRegeneration ? ` (재생성: ${regenerationFocus})` : ''}`)
    console.log(`[GEO v2] 제품: ${productName}, 키워드: ${keywords.length}개`)

    // ==========================================
    // LOAD TUNING CONFIGURATION
    // ==========================================
    const tuningConfig = await loadTuningConfig()
    const tuningConfigSummary = getTuningConfigSummary(tuningConfig)
    console.log(`[GEO v2] 튜닝 설정 로드됨: ${tuningConfig.source}`)
    console.log(`[GEO v2] 프롬프트: DB에서 ${tuningConfigSummary.promptsLoaded}개, 가중치: ${tuningConfigSummary.weightsSource}`)

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

    // Fetch all context in parallel: grounding signals, playbook context, AND Samsung-specific RAG context
    const [groundingSignals, playbookContext, samsungRAGContext] = await Promise.all([
      fetchGroundingSignals(productName, keywords, launchDate, enhancedGrounding),
      (usePlaybook && isPineconeConfigured())
        ? fetchPlaybookContext(productName, keywords, productCategory, enhancedUSP)
        : Promise.resolve([]),
      // Fetch Samsung content-type-specific RAG context for style examples
      isPineconeConfigured()
        ? fetchContentGenerationContext({
            productName,
            keywords,
            contentType: contentType as SamsungContentType,
            videoFormat: videoFormat as VideoFormat,
            productCategory,
          })
        : Promise.resolve({
            contentTypeExamples: [],
            qaFormatExamples: [],
            hashtagExamples: [],
            openerExamples: [],
            correctedExamples: [],
          }),
    ])

    console.log(`[GEO v2] 데이터 가져오기 완료: ${Date.now() - startTime}ms`)
    console.log(`[GEO v2] 그라운딩 신호: ${groundingSignals.length}개, 플레이북 청크: ${playbookContext.length}개`)
    console.log(`[GEO v2] 삼성 RAG 컨텍스트: 콘텐츠 유형 ${samsungRAGContext.contentTypeExamples.length}개, Q&A 형식 ${samsungRAGContext.qaFormatExamples.length}개, 해시태그 예시 ${samsungRAGContext.hashtagExamples.length}개`)
    if (isRegeneration) {
      console.log(`[GEO v2] 재생성 모드: enhancedGrounding=${enhancedGrounding}, enhancedUSP=${enhancedUSP}`)
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
      tuningConfig,
      // Samsung Standard Fields (Part 5.4)
      { contentType, videoFormat, vanityLinkCode },
      // Samsung RAG context for style examples
      {
        openerExamples: samsungRAGContext.openerExamples,
        correctedExamples: samsungRAGContext.correctedExamples,
        contentTypeExamples: samsungRAGContext.contentTypeExamples,
      }
    )

    // Extract grounding sources from description generation
    const descriptionGroundingSources = extractSourcesFromGrounding(descriptionResult.groundingChunks)

    // Fallback: Convert grounding signals to sources if Gemini native grounding is not available
    // This ensures USP enrichment can still work with Google/Perplexity search results
    const signalBasedSources = convertSignalsToSources(groundingSignals)
    const combinedGroundingSources = descriptionGroundingSources.length > 0
      ? descriptionGroundingSources
      : signalBasedSources

    console.log(`[GEO v2] 설명 생성 완료: Gemini 소스 ${descriptionGroundingSources.length}개, 신호 기반 소스 ${signalBasedSources.length}개`)

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

    console.log(`[GEO v2] USP 추출 완료: ${uspResult.usps.length}개, 방식: ${uspResult.extractionMethod}`)

    // ==========================================
    // STAGES 2-6: PARALLEL EXECUTION BLOCK
    // Chapters, FAQ, Case Studies, Step-by-step, Keywords all run concurrently
    // ==========================================
    const isTutorialContent = detectTutorialContent(srtContent)
    const parallelStagesStart = Date.now()

    const [chaptersResult, faqResult, stepByStepResult, caseStudiesResult, keywordsResult] = await Promise.all([
      // Stage 2: Chapters (depends only on srtContent)
      generateChapters(srtContent, productName, tuningConfig),
      // Stage 3: FAQ (depends on USPs) - with Q&A format examples from RAG
      generateFAQ(productName, srtContent, uspResult.usps, groundingSignals, language, tuningConfig, samsungRAGContext.qaFormatExamples),
      // Stage 4: Step-by-step (optional, depends on srtContent)
      isTutorialContent
        ? generateStepByStep(srtContent, productName, language, tuningConfig)
        : Promise.resolve(null),
      // Stage 5: Case Studies (depends on USPs)
      generateCaseStudies(productName, uspResult.usps, groundingSignals, language, tuningConfig),
      // Stage 6: Keywords (independent - can run in parallel)
      generateKeywords(productName, srtContent, keywords, groundingSignals, language, tuningConfig),
    ])

    console.log(`[GEO v2] 병렬 단계 완료: ${Date.now() - parallelStagesStart}ms`)
    console.log(`[GEO v2] 챕터: ${chaptersResult.timestamps.split('\n').length}개 항목`)
    console.log(`[GEO v2] FAQ: ${faqResult.faqs.length}개 Q&A`)
    if (stepByStepResult) {
      console.log(`[GEO v2] 단계별 안내: ${stepByStepResult.steps.length}개 단계`)
    }
    console.log(`[GEO v2] 활용 사례: ${caseStudiesResult.caseStudies.length}개`)

    // ==========================================
    // STAGE 6.5: HASHTAG GENERATION
    // ==========================================
    // Use fixed hashtags if provided, otherwise AI-generate (Samsung Standard Part 5.4)
    const hashtagResult = useFixedHashtags && fixedHashtags.length > 0
      ? {
          hashtags: fixedHashtags,
          categories: {
            brand: fixedHashtags.filter(h => h.includes('Galaxy') || h.includes('Samsung')),
            features: fixedHashtags.filter(h => h.includes('AI') || h.includes('Camera')),
            industry: [],
          },
          reasoning: 'Using pre-defined hashtags as per Samsung standard',
        }
      : await generateHashtags(
          productName,
          descriptionResult.description.full,
          uspResult.usps,
          keywordsResult,
          language,
          tuningConfig,
          // Samsung hashtag order examples from RAG (P0-2: #GalaxyAI first, #Samsung last)
          samsungRAGContext.hashtagExamples
        )

    console.log(`[GEO v2] 키워드: ${keywordsResult.product.length + keywordsResult.generic.length}개`)
    console.log(`[GEO v2] 해시태그: ${hashtagResult.hashtags.length}개 (${useFixedHashtags ? '고정' : 'AI 생성'})`)

    // ==========================================
    // STAGE 6.6: IMAGE ALT TEXT GENERATION
    // ==========================================
    const imageAltResult = await generateImageAltTexts({
      productName,
      productDescription: descriptionResult.description.full,
      usps: uspResult.usps,
      keywords,
      language,
    })

    console.log(`[GEO v2] 이미지 Alt 텍스트: ${imageAltResult.totalTemplates}개 템플릿, 평균 SEO 점수: ${imageAltResult.metadata.avgSeoScore}`)

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

    // Calculate content quality scores (semantic similarity, anti-fabrication, and keyword density)
    const contentQualityScores = calculateContentQualityScores({
      srtContent,
      generatedDescription: descriptionResult.description.full,
      faqAnswers: faqResult.faqs.map(f => f.answer),
      caseStudies: caseStudiesResult.caseStudies.map(cs => `${cs.scenario} ${cs.solution}`),
      usps: uspResult.usps.map(u => `${u.feature}: ${u.differentiation} - ${u.userBenefit}`),
      groundingData: groundingSignals.map(s => s.term).filter(Boolean),
      keywords, // Use input keywords for density calculation
    })

    // Calculate legacy component scores for backward compatibility
    // Use programmatic keyword density if available, otherwise fallback to AI-estimated
    const keywordDensityScore = contentQualityScores.keywordDensity
      ? Math.min(15, Math.round(contentQualityScores.keywordDensity.score * 15))
      : Math.min(15, Math.round(keywordsResult.densityScore / 100 * 15))
    const aiExposureScore = Math.min(25, Math.round((uspResult.groundingQuality / 100) * 25))
    const questionPatternsScore = Math.min(20, Math.round((faqResult.faqs.length / 7) * 20))
    const sentenceStructureScore = 12 // Would be calculated from actual content analysis
    const lengthComplianceScore = calculateLengthComplianceScore(descriptionResult.description.full)

    // Log keyword density details
    if (contentQualityScores.keywordDensity) {
      const kd = contentQualityScores.keywordDensity
      console.log(`[GEO v2] 키워드 밀도 - 점수: ${kd.score.toFixed(2)}, 밀도: ${kd.densityPercentage.toFixed(2)}%, 출현: ${kd.totalKeywordOccurrences}/${kd.totalWordCount} 단어`)
      console.log(`[GEO v2] 키워드 상세: ${kd.keywordBreakdown.map(k => `${k.keyword}(${k.occurrences})`).join(', ')}`)
    }

    console.log(`[GEO v2] 콘텐츠 품질 - 의미 유사도: ${contentQualityScores.semanticSimilarity.score.toFixed(2)}, 허위 정보 방지: ${contentQualityScores.antiFabrication.score.toFixed(2)} (${contentQualityScores.antiFabrication.violationCount}개 위반)`)

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

    console.log(`[GEO v2] 최종 점수: ${finalScore.total}/100 (${geoScoreResult.weightsSource} 가중치)`)
    console.log(`[GEO v2] GEO 상세: ${geoScoreResult.breakdown.map(b => `${b.label}: ${b.weightedScore.toFixed(2)}`).join(', ')}`)
    console.log(`[GEO v2] 파이프라인 완료: ${Date.now() - startTime}ms`)

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
      isFixedHashtags: useFixedHashtags && fixedHashtags.length > 0,
      hashtagCategories: hashtagResult.categories,
      finalScore,
      groundingMetadata,
      imageAltResult,
      // Include programmatic keyword density breakdown for transparency
      keywordDensityDetails: contentQualityScores.keywordDensity ? {
        score: contentQualityScores.keywordDensity.score,
        densityPercentage: contentQualityScores.keywordDensity.densityPercentage,
        totalKeywordOccurrences: contentQualityScores.keywordDensity.totalKeywordOccurrences,
        totalWordCount: contentQualityScores.keywordDensity.totalWordCount,
        keywordBreakdown: contentQualityScores.keywordDensity.keywordBreakdown,
        distribution: contentQualityScores.keywordDensity.distribution,
      } : undefined,
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

    // ==========================================
    // CACHE STORAGE (only for non-regeneration)
    // ==========================================
    if (!isRegeneration) {
      // Save to hybrid cache (L1 in-memory + L2 Supabase)
      await setHybridCache(cacheKey, productName, keywords, response)
      console.log(`[GEO v2] 결과가 하이브리드 캐시에 저장됨 (L1 + L2)`)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GEO v2] 파이프라인 오류:', error)

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
 * Uses ONLY dynamic prompts from tuning configuration (no hardcoded content)
 */
async function generateDescription(
  productName: string,
  srtContent: string,
  existingDescription: string | undefined,
  keywords: string[],
  groundingSignals: GroundingSignal[],
  playbookContext: PlaybookSearchResult[],
  language: 'ko' | 'en',
  tuningConfig: TuningConfig,
  // Samsung Standard Fields (Part 5.4)
  samsungOptions?: {
    contentType?: string
    videoFormat?: string
    vanityLinkCode?: string
  },
  // Samsung RAG context for style examples
  samsungRAGContext?: {
    openerExamples: PlaybookSearchResult[]
    correctedExamples: PlaybookSearchResult[]
    contentTypeExamples: PlaybookSearchResult[]
  }
): Promise<{
  description: { preview: string; full: string; vanityLinks: string[] }
  groundingChunks: Array<{ web?: { uri: string; title: string } }>
}> {
  // Get complete stage prompt from tuning configuration
  // This includes all methodology, rules, and scoring criteria from prompt-loader.ts
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'description',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'high',
    // Samsung Standard Fields (Part 5.4) - pass to prompt composition
    contentType: samsungOptions?.contentType as 'intro' | 'unboxing' | 'how_to' | 'shorts' | 'teaser' | 'brand' | 'esg' | 'documentary' | 'official_replay' | undefined,
    videoFormat: samsungOptions?.videoFormat as 'feed_16x9' | 'shorts_9x16' | undefined,
    vanityLinkCode: samsungOptions?.vanityLinkCode,
    variables: {
      product_name: productName,
      keywords: keywords.join(', '),
    },
  })

  console.log(`[단계:설명] ${source} 프롬프트 사용${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  // Build Samsung RAG examples section if available
  const ragExamplesSection = samsungRAGContext && (
    samsungRAGContext.openerExamples.length > 0 ||
    samsungRAGContext.correctedExamples.length > 0 ||
    samsungRAGContext.contentTypeExamples.length > 0
  ) ? `

## SAMSUNG STYLE EXAMPLES (from RAG - follow these patterns)
${samsungRAGContext.openerExamples.length > 0 ? `
### Opener Patterns for ${samsungOptions?.contentType || 'intro'}:
${samsungRAGContext.openerExamples.slice(0, 2).map((ex, i) => `Example ${i + 1}: ${ex.content.slice(0, 300)}...`).join('\n')}
` : ''}
${samsungRAGContext.contentTypeExamples.length > 0 ? `
### Content Type Examples:
${samsungRAGContext.contentTypeExamples.slice(0, 2).map((ex, i) => `Example ${i + 1}: ${ex.content.slice(0, 300)}...`).join('\n')}
` : ''}
${samsungRAGContext.correctedExamples.length > 0 ? `
### Samsung Style Corrections (IMPORTANT - follow corrected format):
${samsungRAGContext.correctedExamples.slice(0, 2).map((ex, i) => `Corrected Example ${i + 1}: ${ex.content.slice(0, 300)}...`).join('\n')}
` : ''}` : ''

  // User prompt contains ONLY runtime context - all instructions are in systemInstruction
  const userPrompt = `Generate optimized description for ${productName}:

## VIDEO TRANSCRIPT (CRITICAL: PRESERVE ORIGINAL TONE & MANNER)
${srtContent.slice(0, 3000)}

## EXISTING DESCRIPTION (if any)
${existingDescription || 'None provided'}

## TARGET KEYWORDS
${keywords.join(', ')}

## USER INTENT SIGNALS
${groundingSignals.slice(0, 5).map(s => `- ${s.term} (${s.score}%)`).join('\n')}
${ragExamplesSection}

## CRITICAL INSTRUCTIONS
1. **톤 & 매너 보존 (TONE & MANNER PRESERVATION)**:
   - 원본 SRT의 말투, 문체, 어조를 **그대로** 유지하세요
   - 형식적/비형식적 언어 스타일을 변경하지 마세요
   - 오직 GEO 강화 요소(키워드, 검색 최적화)만 자연스럽게 추가하세요
   - 원본의 감정적 톤(친근함, 전문적임, 열정적임 등)을 유지하세요

2. **줄바꿈 (LINE BREAKS)**:
   - 가독성을 위해 문단별로 적절히 줄바꿈(\\n\\n)을 포함하세요
   - 3-4문장마다 새 문단으로 구분하세요
   - 주요 특징/기능 소개 전후로 줄바꿈을 넣으세요

3. **GEO 강화 요소만 추가**:
   - 타겟 키워드를 자연스럽게 포함
   - 검색 의도에 맞는 문구 추가
   - 원본 내용을 과도하게 변경하지 마세요

OUTPUT FORMAT (JSON):
{
  "preview": "exact first 130 characters (110-130 chars, must contain product name + key feature + benefit)",
  "full": "complete description with proper line breaks (\\n\\n between paragraphs), preserving original tone, 300-1000 chars",
  "vanityLinks": ["suggested vanity link name (e.g., ZFlip7_Intro_yt)"]
}`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
    console.log('[설명] 응답 키:', Object.keys(response))
    console.log('[설명] 응답 텍스트 유형:', typeof response.text)
    console.log('[설명] 응답 텍스트 길이:', response.text?.length || 0)
    console.log('[설명] 응답 미리보기:', response.text?.slice(0, 200))

    // Check for candidates and error information
    const responseAny = response as unknown as Record<string, unknown>
    if (responseAny.candidates) {
      console.log('[설명] 후보:', JSON.stringify(responseAny.candidates, null, 2).slice(0, 500))
    }
    if (responseAny.promptFeedback) {
      console.log('[설명] 프롬프트 피드백:', JSON.stringify(responseAny.promptFeedback))
    }
    if (responseAny.error) {
      console.error('[설명] API 오류:', JSON.stringify(responseAny.error))
    }

    const content = response.text
    if (!content) throw new Error('No description generated')

    const parsed = safeJsonParse(content, { preview: '', full: '', vanityLinks: [] }, 'Description')

    // Ensure full description exists, fallback to preview or empty string
    const fullDescription = parsed.full || parsed.preview || ''

    // Sanitize for fabrications
    const sanitized = sanitizeContent(fullDescription)
    if (sanitized.wasModified) {
      console.log(`[설명] ${sanitized.modifications.length}개의 잠재적 허위 정보 수정됨`)
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
    console.error('[설명] 생성 실패:', error)
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
  // Get complete stage prompt from tuning configuration
  // This includes all methodology, rules, and quality criteria from prompt-loader.ts
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'chapters',
    engine: 'gemini',
    language: 'en',
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[단계:챕터] ${source} 프롬프트 사용${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
    console.log('[챕터] 응답 키:', Object.keys(response))
    console.log('[챕터] 응답 텍스트 유형:', typeof response.text)
    console.log('[챕터] 응답 텍스트 길이:', response.text?.length || 0)
    console.log('[챕터] 응답 미리보기:', response.text?.slice(0, 200))

    const content = response.text
    if (!content) throw new Error('No chapters generated')

    const parsed = safeJsonParse(content, { timestamps: '' }, 'Chapters')
    return {
      timestamps: parsed.timestamps || '',
      autoGenerated: true,
    }
  } catch (error) {
    console.error('[챕터] 생성 실패:', error)
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
  tuningConfig: TuningConfig,
  // Samsung Q&A format examples from RAG (P0-1: Q:/A: format)
  qaFormatExamples: PlaybookSearchResult[] = []
): Promise<{ faqs: FAQItem[]; queryPatternOptimization: boolean }> {
  // Get complete stage prompt from tuning configuration
  // This includes all Query Fan-Out methodology from prompt-loader.ts
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'faq',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'medium',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:FAQ] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const uspSummary = usps.map((usp, i) =>
    `USP ${i + 1}: ${usp.feature} - ${usp.userBenefit}`
  ).join('\n')

  // Build Q&A format examples section from RAG
  const qaExamplesSection = qaFormatExamples.length > 0 ? `

## SAMSUNG Q&A FORMAT EXAMPLES (CRITICAL - follow this exact format)
IMPORTANT: Use "Q:" and "A:" with COLON (not period). This is Samsung standard.
${qaFormatExamples.slice(0, 2).map((ex, i) => `
Example ${i + 1}:
${ex.content.slice(0, 400)}
`).join('\n')}
` : ''

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate FAQ for ${productName}:

## UNIQUE SELLING POINTS (from grounded research)
${uspSummary}

## USER SEARCH SIGNALS
${groundingSignals.slice(0, 5).map(s => `- ${s.term}`).join('\n')}

## VIDEO TRANSCRIPT
${srtContent.slice(0, 3000)}
${qaExamplesSection}
## TASK
Generate 5-7 Q&A pairs optimized for AEO (Answer Engine Optimization) using Query Fan-Out methodology.
Each question must be 10-15 words, conversational, and cover different query fan-out angles.
IMPORTANT: Questions MUST start with "Q:" (colon) and answers MUST start with "A:" (colon) - this is Samsung standard format.`,
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
  // Get complete stage prompt from tuning configuration
  // Using chapters stage as step-by-step is similar instructional content
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'chapters',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:StepByStep] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
  // Get complete stage prompt from tuning configuration
  // This includes all case study quality standards and anti-fabrication rules from prompt-loader.ts
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'case_studies',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'high',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:CaseStudies] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  const uspContext = usps.slice(0, 3).map((usp, i) =>
    `USP ${i + 1}: ${usp.feature}\n  - Benefit: ${usp.userBenefit}\n  - Confidence: ${usp.confidence}`
  ).join('\n\n')

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
  // Get complete stage prompt from tuning configuration
  // This includes all methodology, scoring criteria, and output requirements from prompt-loader.ts
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
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

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
  tuningConfig: TuningConfig,
  // Samsung hashtag order examples from RAG (P0-2: #GalaxyAI first, #Samsung last)
  hashtagOrderExamples: PlaybookSearchResult[] = []
): Promise<{
  hashtags: string[]
  categories: {
    brand: string[]
    features: string[]
    industry: string[]
  }
  reasoning?: string
}> {
  // Get complete stage prompt from tuning configuration
  // This includes all methodology, hashtag strategy, and formatting rules from prompt-loader.ts
  const { prompt: systemInstruction, promptVersionId, source } = getStagePrompt(tuningConfig, {
    stage: 'hashtags',
    engine: 'gemini',
    language,
    antiFabricationLevel: 'low',
    variables: {
      product_name: productName,
    },
  })

  console.log(`[Stage:Hashtags] Using ${source} prompt${promptVersionId ? ` (v${promptVersionId.slice(-8)})` : ''}`)

  // Build hashtag order examples section from RAG
  const hashtagExamplesSection = hashtagOrderExamples.length > 0 ? `

## SAMSUNG HASHTAG ORDER EXAMPLES (CRITICAL - follow this exact order)
IMPORTANT: #GalaxyAI MUST be first (if AI features present), #Samsung MUST be last. Max 3-5 hashtags.
${hashtagOrderExamples.slice(0, 2).map((ex, i) => `
Example ${i + 1}:
${ex.content.slice(0, 300)}
`).join('\n')}
` : ''

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
${hashtagExamplesSection}
Generate 5-8 strategic hashtags following the categorization strategy.
IMPORTANT: If product has AI features, #GalaxyAI MUST be first. #Samsung MUST always be last. Max 3-5 hashtags total.`

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
        model: 'gemini-3-flash-preview',
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
