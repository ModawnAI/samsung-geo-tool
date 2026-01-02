/**
 * Samsung Marketing Strategy Playbook Intelligent Ingestion
 * Specialized ingestion logic with extensive metadata extraction
 * for maximum generation utility in RAG applications
 */

import { getPineconeClient, PLAYBOOK_NAMESPACE, PLAYBOOK_INDEX_NAME } from '@/lib/pinecone/client'
import { generateEmbeddings, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/lib/rag/embeddings'
import type {
  PlaybookMetadata,
  PlaybookSection,
  ContentType,
  ContentPurpose,
  ChunkingConfig,
  SECTION_TITLES,
} from '@/types/playbook'
import { createClient } from '@supabase/supabase-js'

// Section hierarchy tracking
interface SectionContext {
  mainSection: string
  mainSectionKo: string
  mainSectionEn: PlaybookSection
  subsection: string
  subsectionKo: string
  subsubsection: string
  depth: number
}

// Parsed chunk with rich metadata
interface EnrichedChunk {
  content: string
  index: number
  startOffset: number
  endOffset: number
  sectionContext: SectionContext
  metadata: Partial<PlaybookMetadata>
}

// Persona definitions from the playbook
const PERSONA_KEYWORDS: Record<string, string[]> = {
  tech_enthusiast: ['테크 얼리어답터', 'tech enthusiast', '기술', '혁신', '최신', '스펙', 'AI', '성능'],
  eco_conscious: ['친환경', 'eco', '지속가능', '환경', 'sustainable', '에코'],
  premium_seeker: ['프리미엄', 'premium', '럭셔리', '고급', '최고급', 'flagship'],
  health_wellness: ['건강', '웰니스', 'health', 'wellness', '운동', '수면', '피트니스'],
  lifestyle_focused: ['라이프스타일', 'lifestyle', '일상', '편리', '생활'],
  productivity_focused: ['생산성', 'productivity', '업무', '효율', '작업'],
  creative_professional: ['크리에이터', 'creator', '창작', '콘텐츠 제작', '촬영'],
  value_seeker: ['가성비', 'value', '합리적', '실용'],
}

// Channel keywords
const CHANNEL_KEYWORDS: Record<string, string[]> = {
  instagram: ['인스타그램', 'instagram', 'IG', '릴스', 'reels', '스토리'],
  youtube: ['유튜브', 'youtube', 'YT', '쇼츠', 'shorts', '영상'],
  tiktok: ['틱톡', 'tiktok', 'TT'],
  blog: ['블로그', 'blog', '포스트'],
  email: ['이메일', 'email', 'EDM', '뉴스레터'],
  website: ['웹사이트', 'website', '랜딩페이지', 'landing'],
  samsung_members: ['삼성 멤버스', 'samsung members'],
  samsung_newsroom: ['삼성 뉴스룸', 'newsroom'],
  paid_media: ['페이드', 'paid', '광고', 'ad'],
  seo: ['검색', 'SEO', 'search'],
  geo: ['GEO', 'AI 검색', 'chatgpt', 'perplexity', 'gemini'],
}

// Campaign phase keywords
const CAMPAIGN_PHASE_KEYWORDS: Record<string, string[]> = {
  teaser: ['티저', 'teaser', '사전', '예고', '커밍순'],
  launch: ['런칭', 'launch', '출시', '론칭', '공개'],
  sustain: ['서스테인', 'sustain', '유지', '지속'],
  always_on: ['얼웨이즈온', 'always-on', 'always on', '상시'],
}

// Content format keywords
const CONTENT_FORMAT_KEYWORDS: Record<string, string[]> = {
  headline: ['헤드라인', 'headline', '제목', 'title'],
  body_copy: ['바디카피', 'body', '본문', '내용'],
  cta: ['CTA', '콜투액션', 'call to action', '클릭유도'],
  hashtag: ['해시태그', 'hashtag', '#'],
  description: ['설명', 'description', '디스크립션'],
  caption: ['캡션', 'caption'],
  script: ['스크립트', 'script', '대본'],
}

// Tone markers
const TONE_KEYWORDS: Record<string, string[]> = {
  confident: ['자신감', 'confident', '당당', '확신'],
  human: ['휴먼', 'human', '감성적', '따뜻', '공감'],
  empowering: ['임파워링', 'empowering', '힘을 주는', '응원'],
  innovative: ['혁신적', 'innovative', '새로운', '창의적'],
  premium: ['프리미엄', 'premium', '고급', '품격'],
  playful: ['재미있는', 'playful', '위트', '유머'],
  trustworthy: ['신뢰', 'trust', '믿음직한', '안심'],
}

// Use case tags mapping
const USE_CASE_MAPPINGS: Record<string, string[]> = {
  headline_writing: ['헤드라인', '제목', 'headline', 'title'],
  body_copy_writing: ['바디카피', 'body copy', '본문'],
  cta_generation: ['CTA', '콜투액션', 'call to action'],
  tone_guidance: ['톤앤매너', 'tone', '문체', '어조'],
  brand_voice: ['브랜드 보이스', 'brand voice', '목소리'],
  persona_targeting: ['페르소나', 'persona', '타겟'],
  channel_optimization: ['채널', 'channel', '플랫폼'],
  campaign_planning: ['캠페인', 'campaign', '기획'],
  creative_direction: ['크리에이티브', 'creative', '비주얼'],
  content_review: ['검수', 'review', '체크리스트', 'checklist'],
  no_go_prevention: ['금지', 'no-go', '하지 말아야', '피해야'],
  example_reference: ['예시', 'example', '사례'],
  template_usage: ['템플릿', 'template', '양식'],
  measurement: ['측정', 'KPI', '성과', 'metric'],
  ai_content: ['AI', '인공지능', 'ChatGPT', '생성형'],
}

/**
 * Main function to ingest Samsung Marketing Strategy Playbook
 */
export async function ingestSamsungPlaybook(
  markdownContent: string,
  options: {
    version?: string
    uploadedBy?: string
    chunkingConfig?: Partial<ChunkingConfig>
  } = {}
): Promise<{
  documentId: string
  totalChunks: number
  status: 'indexed' | 'failed'
  errorMessage?: string
}> {
  const documentId = `playbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const version = options.version || '2025.1'
  const uploadedBy = options.uploadedBy || 'system'

  const chunkingConfig: ChunkingConfig = {
    maxChunkSize: 1500, // Larger chunks for better context
    chunkOverlap: 300,
    minChunkSize: 200,
    preserveParagraphs: true,
    ...options.chunkingConfig,
  }

  try {
    console.log('Starting Samsung Marketing Strategy Playbook ingestion...')

    // Parse markdown into section-aware chunks
    const enrichedChunks = parsePlaybookMarkdown(markdownContent, chunkingConfig)
    console.log(`Parsed ${enrichedChunks.length} enriched chunks`)

    // Prepare metadata for all chunks
    const chunksWithMetadata = enrichedChunks.map((chunk, index) => {
      const fullMetadata = buildFullMetadata(chunk, {
        documentId,
        chunkIndex: index,
        totalChunks: enrichedChunks.length,
        version,
        uploadedBy,
      })

      // Flatten metadata for Pinecone (no nested objects allowed)
      const flatMetadata: Record<string, string | number | boolean | string[]> = {
        content: chunk.content,
        documentId: fullMetadata.documentId || '',
        chunkIndex: fullMetadata.chunkIndex || 0,
        totalChunks: fullMetadata.totalChunks || 0,
        version: fullMetadata.version || '',
        uploadedBy: fullMetadata.uploadedBy || '',
        section: fullMetadata.section || 'other',
        sectionTitle: fullMetadata.sectionTitle || '',
        subsection: fullMetadata.subsection || '',
        subsubsection: fullMetadata.subsubsection || '',
        sectionDepth: fullMetadata.sectionDepth || 0,
        productCategory: fullMetadata.productCategory || 'all',
        language: fullMetadata.language || 'ko',
        contentType: fullMetadata.contentType || 'general',
        contentPurpose: fullMetadata.contentPurpose || 'general_guidance',
        primaryPersona: fullMetadata.primaryPersona || '',
        relevantChannels: fullMetadata.relevantChannels || [],
        campaignPhases: fullMetadata.campaignPhases || [],
        toneIndicators: fullMetadata.toneIndicators || [],
        contentFormats: fullMetadata.contentFormats || [],
        useCaseTags: fullMetadata.useCaseTags || [],
        productMentions: fullMetadata.productMentions || [],
        hasExample: fullMetadata.hasExample || false,
        hasTemplate: fullMetadata.hasTemplate || false,
        hasDoNot: fullMetadata.hasDoNot || false,
        hasMetrics: fullMetadata.hasMetrics || false,
        hasTable: fullMetadata.hasTable || false,
        wordCount: fullMetadata.wordCount || 0,
        charCount: fullMetadata.charCount || 0,
        indexedAt: fullMetadata.indexedAt || new Date().toISOString(),
      }

      return {
        id: `${documentId}_chunk_${index}`,
        content: chunk.content,
        metadata: flatMetadata,
      }
    })

    console.log(`Generating embeddings with OpenAI ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS} dimensions)...`)

    // Generate embeddings for all chunks using OpenAI
    const texts = chunksWithMetadata.map(c => c.content)
    const embeddings = await generateEmbeddings(texts)

    console.log(`Generated ${embeddings.length} embeddings`)

    // Prepare vectors for Pinecone upsert
    const vectors = chunksWithMetadata.map((chunk, index) => ({
      id: chunk.id,
      values: embeddings[index],
      metadata: chunk.metadata,
    }))

    console.log('Upserting vectors to Pinecone...')

    // Upsert to Pinecone in batches
    const pinecone = getPineconeClient()
    const index = pinecone.index(PLAYBOOK_INDEX_NAME)

    const batchSize = 50 // Smaller batches due to larger metadata
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await index.namespace(PLAYBOOK_NAMESPACE).upsert(batch)
      console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`)
    }

    // Store document record
    await storeDocumentRecord({
      id: documentId,
      name: 'Samsung Marketing Strategy Playbook 2025',
      fileName: 'Samsung_Marketing_Strategy_Playbook_2025.md',
      fileType: 'md',
      section: 'playbook_overview',
      productCategory: 'all',
      language: 'ko',
      version,
      totalChunks: enrichedChunks.length,
      status: 'indexed',
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      indexedAt: new Date().toISOString(),
    })

    console.log(`Successfully ingested playbook with ${enrichedChunks.length} chunks`)

    return {
      documentId,
      totalChunks: enrichedChunks.length,
      status: 'indexed',
    }
  } catch (error) {
    console.error('Playbook ingestion error:', error)

    return {
      documentId,
      totalChunks: 0,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Parse playbook markdown with section awareness and rich metadata extraction
 */
function parsePlaybookMarkdown(
  markdown: string,
  config: ChunkingConfig
): EnrichedChunk[] {
  const lines = markdown.split('\n')
  const chunks: EnrichedChunk[] = []

  // Section context tracking
  let currentContext: SectionContext = {
    mainSection: '',
    mainSectionKo: '',
    mainSectionEn: 'other',
    subsection: '',
    subsectionKo: '',
    subsubsection: '',
    depth: 0,
  }

  let currentChunk = ''
  let chunkStartOffset = 0
  let currentOffset = 0

  for (const line of lines) {
    const lineLength = line.length + 1 // +1 for newline

    // Detect header and update context
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headerMatch) {
      // Save current chunk if exists
      if (currentChunk.trim().length >= config.minChunkSize) {
        chunks.push(createEnrichedChunk(
          currentChunk.trim(),
          chunks.length,
          chunkStartOffset,
          currentOffset,
          { ...currentContext }
        ))
        currentChunk = ''
        chunkStartOffset = currentOffset
      }

      const headerLevel = headerMatch[1].length
      const headerText = headerMatch[2].trim()

      // Update context based on header level
      currentContext = updateSectionContext(currentContext, headerLevel, headerText)
    }

    // Add line to current chunk
    currentChunk += line + '\n'
    currentOffset += lineLength

    // Check if we need to create a new chunk
    if (currentChunk.length >= config.maxChunkSize) {
      // Find a good break point
      const breakPoint = findBreakPoint(currentChunk, config)

      if (breakPoint > config.minChunkSize) {
        const chunkContent = currentChunk.slice(0, breakPoint).trim()
        chunks.push(createEnrichedChunk(
          chunkContent,
          chunks.length,
          chunkStartOffset,
          chunkStartOffset + breakPoint,
          { ...currentContext }
        ))

        // Keep overlap for next chunk
        const overlapStart = Math.max(0, breakPoint - config.chunkOverlap)
        currentChunk = currentChunk.slice(overlapStart)
        chunkStartOffset = currentOffset - currentChunk.length
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length >= config.minChunkSize) {
    chunks.push(createEnrichedChunk(
      currentChunk.trim(),
      chunks.length,
      chunkStartOffset,
      currentOffset,
      { ...currentContext }
    ))
  }

  return chunks
}

/**
 * Update section context based on header
 */
function updateSectionContext(
  current: SectionContext,
  headerLevel: number,
  headerText: string
): SectionContext {
  const SECTION_TITLES_MAP: Record<string, { ko: string; en: PlaybookSection }> = {
    '플레이북 개요': { ko: '플레이북 개요', en: 'playbook_overview' },
    '브랜드 핵심 정의': { ko: '브랜드 핵심 정의', en: 'brand_core' },
    '타겟 오디언스 & 인사이트': { ko: '타겟 오디언스 & 인사이트', en: 'target_audience' },
    '타겟 오디언스': { ko: '타겟 오디언스 & 인사이트', en: 'target_audience' },
    '브랜드 메시지 구조': { ko: '브랜드 메시지 구조', en: 'messaging_framework' },
    '톤앤매너 가이드': { ko: '톤앤매너 가이드', en: 'tone_voice' },
    '콘텐츠 전략 프레임': { ko: '콘텐츠 전략 프레임', en: 'content_strategy' },
    '콘텐츠 전략': { ko: '콘텐츠 전략 프레임', en: 'content_strategy' },
    '콘텐츠 유형별 가이드': { ko: '콘텐츠 유형별 가이드', en: 'content_type_playbook' },
    '콘텐츠 유형별': { ko: '콘텐츠 유형별 가이드', en: 'content_type_playbook' },
    '채널별 운영 가이드': { ko: '채널별 운영 가이드', en: 'channel_playbook' },
    '채널별 운영': { ko: '채널별 운영 가이드', en: 'channel_playbook' },
    '크리에이티브 가이드': { ko: '크리에이티브 가이드', en: 'creative_guidelines' },
    '콘텐츠 제작 프로세스': { ko: '콘텐츠 제작 프로세스', en: 'production_process' },
    '제작 프로세스': { ko: '콘텐츠 제작 프로세스', en: 'production_process' },
    '성과 측정 & 개선': { ko: '성과 측정 & 개선', en: 'measurement_optimization' },
    '성과 측정': { ko: '성과 측정 & 개선', en: 'measurement_optimization' },
    '실패 사례 & No-Go': { ko: '실패 사례 & No-Go', en: 'failure_patterns' },
    '실패 사례': { ko: '실패 사례 & No-Go', en: 'failure_patterns' },
    'No-Go': { ko: '실패 사례 & No-Go', en: 'failure_patterns' },
    'AI 콘텐츠 가이드': { ko: 'AI 콘텐츠 가이드', en: 'ai_content_guide' },
    'AI 콘텐츠': { ko: 'AI 콘텐츠 가이드', en: 'ai_content_guide' },
    '외부 파트너 가이드': { ko: '외부 파트너 가이드', en: 'partner_guidelines' },
    '외부 파트너': { ko: '외부 파트너 가이드', en: 'partner_guidelines' },
    '발행 전 체크리스트': { ko: '발행 전 체크리스트', en: 'pre_publish_checklist' },
    '체크리스트': { ko: '발행 전 체크리스트', en: 'pre_publish_checklist' },
  }

  const newContext = { ...current }

  // Check if this is a main section header
  const sectionInfo = Object.entries(SECTION_TITLES_MAP).find(([key]) =>
    headerText.includes(key)
  )

  if (headerLevel === 1 || headerLevel === 2) {
    if (sectionInfo) {
      newContext.mainSection = headerText
      newContext.mainSectionKo = sectionInfo[1].ko
      newContext.mainSectionEn = sectionInfo[1].en
      newContext.subsection = ''
      newContext.subsectionKo = ''
      newContext.subsubsection = ''
      newContext.depth = 1
    } else if (current.mainSection) {
      // It's a subsection under the current main section
      newContext.subsection = headerText
      newContext.subsectionKo = headerText
      newContext.subsubsection = ''
      newContext.depth = 2
    }
  } else if (headerLevel === 3) {
    newContext.subsection = headerText
    newContext.subsectionKo = headerText
    newContext.subsubsection = ''
    newContext.depth = 2
  } else if (headerLevel === 4) {
    newContext.subsubsection = headerText
    newContext.depth = 3
  }

  return newContext
}

/**
 * Create an enriched chunk with initial metadata
 */
function createEnrichedChunk(
  content: string,
  index: number,
  startOffset: number,
  endOffset: number,
  sectionContext: SectionContext
): EnrichedChunk {
  return {
    content,
    index,
    startOffset,
    endOffset,
    sectionContext,
    metadata: extractInitialMetadata(content, sectionContext),
  }
}

/**
 * Extract initial metadata from content
 */
function extractInitialMetadata(
  content: string,
  context: SectionContext
): Partial<PlaybookMetadata> {
  const lowerContent = content.toLowerCase()

  return {
    hasExamples: detectHasExamples(content),
    hasTemplates: detectHasTemplates(content),
    hasTables: detectHasTables(content),
    hasQuotes: detectHasQuotes(content),
    hasChecklist: detectHasChecklist(content),
    hasNoGoRules: detectHasNoGoRules(content),
    hasDoRules: detectHasDoRules(content),
    contentPurpose: detectContentPurpose(content, context),
    contentType: detectContentType(content),
    targetPersonas: extractPersonas(content),
    applicableChannels: extractChannels(content),
    campaignPhases: extractCampaignPhases(content),
    contentFormat: detectContentFormat(content),
    useCaseTags: extractUseCaseTags(content),
    keywords: extractKeywords(content),
    toneMarkers: extractToneMarkers(content),
    priorityLevel: detectPriorityLevel(content, context),
    specificityLevel: detectSpecificityLevel(content),
  }
}

/**
 * Build full metadata for a chunk
 */
function buildFullMetadata(
  chunk: EnrichedChunk,
  docInfo: {
    documentId: string
    chunkIndex: number
    totalChunks: number
    version: string
    uploadedBy: string
  }
): PlaybookMetadata {
  const { content, sectionContext, metadata } = chunk

  return {
    // Document identification
    documentId: docInfo.documentId,
    chunkId: `${docInfo.documentId}_chunk_${docInfo.chunkIndex}`,
    chunkIndex: docInfo.chunkIndex,
    totalChunks: docInfo.totalChunks,

    // Hierarchical content organization
    section: sectionContext.mainSectionEn,
    sectionKo: sectionContext.mainSectionKo,
    subsection: sectionContext.subsection,
    subsectionKo: sectionContext.subsectionKo,
    subsubsection: sectionContext.subsubsection,
    pageNumber: Math.floor(chunk.startOffset / 3000) + 1,
    sectionDepth: sectionContext.depth,

    // Classification
    productCategory: 'all',
    contentType: metadata.contentType || 'text',

    // Localization
    language: 'ko',

    // Version control
    version: docInfo.version,
    uploadedAt: new Date().toISOString(),
    uploadedBy: docInfo.uploadedBy,

    // Content
    content: content,

    // Enhanced metadata
    contentPurpose: metadata.contentPurpose || 'general',
    targetPersonas: metadata.targetPersonas || [],
    hasExamples: metadata.hasExamples || false,
    hasTemplates: metadata.hasTemplates || false,
    hasTables: metadata.hasTables || false,
    hasQuotes: metadata.hasQuotes || false,
    hasChecklist: metadata.hasChecklist || false,
    hasNoGoRules: metadata.hasNoGoRules || false,
    hasDoRules: metadata.hasDoRules || false,
    useCaseTags: metadata.useCaseTags || [],
    specificityLevel: metadata.specificityLevel || 'guideline',
    relatedSections: determineRelatedSections(sectionContext.mainSectionEn),
    applicableChannels: metadata.applicableChannels || [],
    campaignPhases: metadata.campaignPhases || [],
    contentFormat: metadata.contentFormat || 'general',
    priorityLevel: metadata.priorityLevel || 'reference',
    keywords: metadata.keywords || [],
    toneMarkers: metadata.toneMarkers || [],
  }
}

// Detection helper functions

function detectHasExamples(content: string): boolean {
  const patterns = [
    /예시[:\s]/i,
    /example[:\s]/i,
    /예[:\s]*$/m,
    /사례[:\s]/i,
    /✓/,
    /✗/,
    /○/,
    /●/,
    /→.*예/,
  ]
  return patterns.some((p) => p.test(content))
}

function detectHasTemplates(content: string): boolean {
  const patterns = [
    /템플릿/i,
    /template/i,
    /\[.*입력.*\]/,
    /\{.*\}/,
    /___/,
    /양식/,
  ]
  return patterns.some((p) => p.test(content))
}

function detectHasTables(content: string): boolean {
  return /\|.*\|.*\|/.test(content) || /^\s*\|/.test(content)
}

function detectHasQuotes(content: string): boolean {
  const patterns = [
    /^>/m,
    /"[^"]{20,}"/,
    /"[^"]{20,}"/,
    /『.*』/,
    /「.*」/,
  ]
  return patterns.some((p) => p.test(content))
}

function detectHasChecklist(content: string): boolean {
  const patterns = [
    /\[\s*\]/,
    /\[x\]/i,
    /☐/,
    /☑/,
    /체크리스트/i,
    /checklist/i,
    /✓.*\n.*✓/,
  ]
  return patterns.some((p) => p.test(content))
}

function detectHasNoGoRules(content: string): boolean {
  const patterns = [
    /No-?Go/i,
    /금지/,
    /하지 말아야/,
    /피해야/,
    /절대.*안/,
    /사용 금지/,
    /❌/,
    /✗/,
    /지양/,
    /배제/,
  ]
  return patterns.some((p) => p.test(content))
}

function detectHasDoRules(content: string): boolean {
  const patterns = [
    /해야 할/,
    /권장/,
    /필수/,
    /반드시/,
    /✓/,
    /✅/,
    /지향/,
    /추천/,
  ]
  return patterns.some((p) => p.test(content))
}

function detectContentPurpose(content: string, context: SectionContext): ContentPurpose {
  const section = context.mainSectionEn

  // Map sections to purposes
  const sectionPurposeMap: Partial<Record<PlaybookSection, ContentPurpose>> = {
    playbook_overview: 'general',
    brand_core: 'brand_definition',
    target_audience: 'audience_insight',
    messaging_framework: 'messaging_framework',
    tone_voice: 'tone_guidance',
    content_strategy: 'content_strategy',
    content_type_playbook: 'content_template',
    channel_playbook: 'channel_guidance',
    creative_guidelines: 'creative_direction',
    production_process: 'process_workflow',
    measurement_optimization: 'measurement_kpi',
    failure_patterns: 'failure_prevention',
    ai_content_guide: 'ai_guidance',
    partner_guidelines: 'partner_guidelines',
    pre_publish_checklist: 'quality_checklist',
  }

  // Check for specific content patterns that override section-based purpose
  if (detectHasNoGoRules(content)) return 'failure_prevention'
  if (detectHasTemplates(content)) return 'content_template'
  if (detectHasChecklist(content)) return 'quality_checklist'
  if (detectHasExamples(content) && content.length < 500) return 'example_reference'

  return sectionPurposeMap[section] || 'general'
}

function detectContentType(content: string): ContentType {
  if (detectHasTables(content)) return 'table'
  if (/^[-•*]\s/m.test(content)) return 'bullet_points'
  if (/^#{1,4}\s/m.test(content)) return 'heading'
  if (detectHasQuotes(content)) return 'quote'
  if (detectHasExamples(content)) return 'example'
  return 'text'
}

function extractPersonas(content: string): string[] {
  const personas: string[] = []
  const lowerContent = content.toLowerCase()

  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))) {
      personas.push(persona)
    }
  }

  return personas
}

function extractChannels(content: string): string[] {
  const channels: string[] = []
  const lowerContent = content.toLowerCase()

  for (const [channel, keywords] of Object.entries(CHANNEL_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))) {
      channels.push(channel)
    }
  }

  return channels
}

function extractCampaignPhases(content: string): string[] {
  const phases: string[] = []
  const lowerContent = content.toLowerCase()

  for (const [phase, keywords] of Object.entries(CAMPAIGN_PHASE_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))) {
      phases.push(phase)
    }
  }

  return phases
}

function detectContentFormat(content: string): string {
  const lowerContent = content.toLowerCase()

  for (const [format, keywords] of Object.entries(CONTENT_FORMAT_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))) {
      return format
    }
  }

  return 'general'
}

function extractUseCaseTags(content: string): string[] {
  const tags: string[] = []
  const lowerContent = content.toLowerCase()

  for (const [tag, keywords] of Object.entries(USE_CASE_MAPPINGS)) {
    if (keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))) {
      tags.push(tag)
    }
  }

  return tags
}

function extractKeywords(content: string): string[] {
  // Extract important Korean and English terms
  const koreanTerms = content.match(/[가-힣]{2,}/g) || []
  const englishTerms = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []

  // Filter and dedupe
  const allTerms = [...new Set([...koreanTerms, ...englishTerms])]
    .filter((term) => term.length >= 2 && term.length <= 30)
    .slice(0, 15) // Limit keywords

  return allTerms
}

function extractToneMarkers(content: string): string[] {
  const markers: string[] = []
  const lowerContent = content.toLowerCase()

  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
    if (keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))) {
      markers.push(tone)
    }
  }

  return markers
}

function detectPriorityLevel(
  content: string,
  context: SectionContext
): 'critical' | 'important' | 'reference' | 'supplementary' {
  // Critical sections
  const criticalSections: PlaybookSection[] = [
    'brand_core',
    'tone_voice',
    'failure_patterns',
  ]
  if (criticalSections.includes(context.mainSectionEn)) return 'critical'

  // Important indicators
  if (detectHasNoGoRules(content)) return 'critical'
  if (/필수|반드시|핵심|중요/.test(content)) return 'important'
  if (detectHasTemplates(content)) return 'important'

  // Reference vs supplementary
  if (detectHasExamples(content)) return 'reference'
  if (context.depth >= 3) return 'supplementary'

  return 'reference'
}

function detectSpecificityLevel(
  content: string
): 'principle' | 'guideline' | 'example' | 'template' | 'checklist' {
  if (detectHasChecklist(content)) return 'checklist'
  if (detectHasTemplates(content)) return 'template'
  if (detectHasExamples(content)) return 'example'
  if (/원칙|철학|가치|핵심/.test(content)) return 'principle'
  return 'guideline'
}

function determineRelatedSections(section: PlaybookSection): string[] {
  const relationships: Partial<Record<PlaybookSection, string[]>> = {
    brand_core: ['tone_voice', 'messaging_framework'],
    tone_voice: ['brand_core', 'content_type_playbook'],
    messaging_framework: ['brand_core', 'content_strategy'],
    content_strategy: ['channel_playbook', 'content_type_playbook'],
    content_type_playbook: ['channel_playbook', 'tone_voice'],
    channel_playbook: ['content_strategy', 'creative_guidelines'],
    creative_guidelines: ['channel_playbook', 'brand_core'],
    production_process: ['pre_publish_checklist', 'partner_guidelines'],
    measurement_optimization: ['content_strategy', 'channel_playbook'],
    failure_patterns: ['tone_voice', 'brand_core'],
    ai_content_guide: ['tone_voice', 'pre_publish_checklist'],
    partner_guidelines: ['brand_core', 'creative_guidelines'],
    pre_publish_checklist: ['production_process', 'failure_patterns'],
  }

  return relationships[section] || []
}

function findBreakPoint(text: string, config: ChunkingConfig): number {
  // Look for paragraph breaks
  const paragraphBreak = text.lastIndexOf('\n\n', config.maxChunkSize)
  if (paragraphBreak > config.minChunkSize) {
    return paragraphBreak + 2
  }

  // Look for sentence breaks
  const sentenceBreaks = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '。', '！', '？']
  let bestBreak = -1

  for (const ending of sentenceBreaks) {
    const pos = text.lastIndexOf(ending, config.maxChunkSize)
    if (pos > config.minChunkSize && pos > bestBreak) {
      bestBreak = pos + ending.length
    }
  }

  if (bestBreak > 0) return bestBreak

  // Fall back to line break
  const lineBreak = text.lastIndexOf('\n', config.maxChunkSize)
  if (lineBreak > config.minChunkSize) {
    return lineBreak + 1
  }

  return config.maxChunkSize
}

// Supabase helper
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

async function storeDocumentRecord(record: {
  id: string
  name: string
  fileName: string
  fileType: string
  section: PlaybookSection
  productCategory: string
  language: string
  version: string
  totalChunks: number
  status: string
  uploadedAt: string
  uploadedBy: string
  indexedAt: string
}): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase not configured, skipping document record storage')
    return
  }

  try {
    const { error } = await supabase.from('playbook_documents').upsert({
      id: record.id,
      name: record.name,
      file_name: record.fileName,
      file_type: record.fileType,
      section: record.section,
      product_category: record.productCategory,
      language: record.language,
      version: record.version,
      total_chunks: record.totalChunks,
      status: record.status,
      uploaded_at: record.uploadedAt,
      uploaded_by: record.uploadedBy,
      indexed_at: record.indexedAt,
    })

    if (error) {
      console.error('Error storing document record:', error)
    }
  } catch (err) {
    console.error('Error storing document record:', err)
  }
}
