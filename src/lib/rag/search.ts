import { CohereClient } from 'cohere-ai'
import { getPineconeClient, PLAYBOOK_NAMESPACE, RERANK_MODELS, type RerankModel } from '@/lib/pinecone/client'
import type {
  PlaybookSearchRequest,
  PlaybookSearchResult,
  RAGContext,
  PlaybookMetadata,
  PlaybookSection,
  ProductCategory,
  SamsungContentType,
  VideoFormat,
  DescriptionSection,
  StyleElement,
} from '@/types/playbook'

// Type for Pinecone search hit fields
interface PineconeHitFields {
  content?: string
  section?: string
  sectionTitle?: string
  subsection?: string
  productCategory?: string
  language?: string
  contentType?: string
  contentPurpose?: string
  primaryPersona?: string
  relevantChannels?: string[]
  campaignPhases?: string[]
  toneIndicators?: string[]
  useCaseTags?: string[]
  hasExample?: boolean
  hasTemplate?: boolean
  hasDoNot?: boolean
  documentId?: string
  chunkIndex?: number
}

// Cohere client singleton
let cohereClient: CohereClient | null = null

function getCohereClient(): CohereClient {
  if (!cohereClient) {
    const apiKey = process.env.COHERE_API_KEY
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is not set')
    }
    cohereClient = new CohereClient({ token: apiKey })
  }
  return cohereClient
}

/**
 * Search the Samsung Marketing Playbook with optional reranking
 * Uses Pinecone's integrated inference (multilingual-e5-large) for embeddings
 */
export async function searchPlaybook(
  request: PlaybookSearchRequest
): Promise<RAGContext> {
  const startTime = Date.now()

  const {
    query,
    productCategory,
    section,
    topK = 10,
    rerankTopN = 5,
    language,
    includeScores = true,
    // Samsung content-specific filters
    samsungContentType,
    videoFormat,
    descriptionSection,
    styleElement,
    hasCorrections,
    hasQASection,
    hasHashtags,
  } = request

  // Build metadata filter with all supported options
  const filter = buildMetadataFilter({
    productCategory,
    section,
    language,
    samsungContentType,
    videoFormat,
    descriptionSection,
    styleElement,
    hasCorrections,
    hasQASection,
    hasHashtags,
  })

  // Get the playbook index with integrated inference
  const pinecone = getPineconeClient()
  const index = pinecone.index('samsung-marketing-playbook')
  const namespace = index.namespace(PLAYBOOK_NAMESPACE)

  // Perform search using Pinecone's integrated inference
  // This uses the index's configured embedding model (multilingual-e5-large)
  const searchResults = await namespace.searchRecords({
    query: {
      topK,
      inputs: { text: query },
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    },
    fields: ['content', 'section', 'sectionTitle', 'subsection', 'productCategory',
             'language', 'contentType', 'contentPurpose', 'primaryPersona',
             'relevantChannels', 'campaignPhases', 'toneIndicators', 'useCaseTags',
             'hasExample', 'hasTemplate', 'hasDoNot', 'documentId', 'chunkIndex'],
  })

  // Transform results
  let results: PlaybookSearchResult[] = (searchResults.result?.hits || []).map((hit) => {
    const fields = hit.fields as PineconeHitFields | undefined
    return {
      id: hit._id || '',
      content: fields?.content || '',
      score: hit._score || 0,
      metadata: {
        content: fields?.content,
        section: fields?.section as PlaybookSection,
        sectionTitle: fields?.sectionTitle,
        subsection: fields?.subsection,
        productCategory: fields?.productCategory,
        language: fields?.language,
        contentType: fields?.contentType,
        contentPurpose: fields?.contentPurpose,
        primaryPersona: fields?.primaryPersona,
        relevantChannels: fields?.relevantChannels,
        campaignPhases: fields?.campaignPhases,
        toneIndicators: fields?.toneIndicators,
        useCaseTags: fields?.useCaseTags,
        hasExample: fields?.hasExample,
        hasTemplate: fields?.hasTemplate,
        hasDoNot: fields?.hasDoNot,
        documentId: fields?.documentId,
        chunkIndex: fields?.chunkIndex,
      } as unknown as PlaybookMetadata,
    }
  })

  // Apply Cohere reranking if we have results
  if (results.length > 0 && rerankTopN > 0) {
    results = await rerankResults(query, results, rerankTopN)
  }

  const processingTimeMs = Date.now() - startTime

  return {
    query,
    results,
    totalResults: results.length,
    processingTimeMs,
  }
}

/**
 * Minimum relevance score thresholds for filtering
 */
const RELEVANCE_THRESHOLDS = {
  default: 0.3,    // Default minimum rerank score
  strict: 0.5,     // Strict filtering for high-quality results
  lenient: 0.15,   // Lenient filtering for broad coverage
} as const

type RelevanceMode = keyof typeof RELEVANCE_THRESHOLDS

/**
 * Perform multi-query search for comprehensive RAG context
 * This is used by the GEO optimization system to align with playbook content
 */
export async function multiQuerySearch(
  queries: string[],
  options: {
    productCategory?: ProductCategory | 'all'
    section?: PlaybookSection
    topKPerQuery?: number
    finalTopN?: number
    deduplicateByContent?: boolean
    minRelevanceScore?: number
    relevanceMode?: RelevanceMode
    // Samsung content-specific filters
    samsungContentType?: SamsungContentType
    videoFormat?: VideoFormat
    descriptionSection?: DescriptionSection
    styleElement?: StyleElement
    hasCorrections?: boolean
    hasQASection?: boolean
    hasHashtags?: boolean
  } = {}
): Promise<RAGContext> {
  const startTime = Date.now()

  const {
    productCategory,
    section,
    topKPerQuery = 5,
    finalTopN = 10,
    deduplicateByContent = true,
    minRelevanceScore,
    relevanceMode = 'default',
    // Samsung content-specific filters
    samsungContentType,
    videoFormat,
    descriptionSection,
    styleElement,
    hasCorrections,
    hasQASection,
    hasHashtags,
  } = options

  // Determine effective minimum relevance score
  const effectiveMinScore = minRelevanceScore ?? RELEVANCE_THRESHOLDS[relevanceMode]

  // Execute all queries in parallel with all filter options
  const searchPromises = queries.map((query) =>
    searchPlaybook({
      query,
      productCategory,
      section,
      topK: topKPerQuery,
      rerankTopN: 0, // Skip individual reranking, do final rerank
      // Pass through Samsung content-specific filters
      samsungContentType,
      videoFormat,
      descriptionSection,
      styleElement,
      hasCorrections,
      hasQASection,
      hasHashtags,
    })
  )

  const searchResults = await Promise.all(searchPromises)

  // Combine and deduplicate results
  const allResults: PlaybookSearchResult[] = []
  const seenIds = new Set<string>()
  const seenContent = new Set<string>()

  for (const context of searchResults) {
    for (const result of context.results) {
      // Deduplicate by ID
      if (seenIds.has(result.id)) continue
      seenIds.add(result.id)

      // Optionally deduplicate by similar content
      if (deduplicateByContent) {
        const contentKey = result.content.slice(0, 200).toLowerCase()
        if (seenContent.has(contentKey)) continue
        seenContent.add(contentKey)
      }

      allResults.push(result)
    }
  }

  // Perform final reranking on combined results
  const combinedQuery = queries.join(' ')
  const rerankedResults = await rerankResults(combinedQuery, allResults, finalTopN)

  // Filter by relevance score
  const filteredResults = rerankedResults.filter(result => {
    const score = result.rerankScore ?? result.score ?? 0
    return score >= effectiveMinScore
  })

  const processingTimeMs = Date.now() - startTime

  console.log(`[RAG] Filtered ${rerankedResults.length} → ${filteredResults.length} results (min score: ${effectiveMinScore})`)

  return {
    query: combinedQuery,
    results: filteredResults,
    totalResults: filteredResults.length,
    processingTimeMs,
    filterStats: {
      beforeFilter: rerankedResults.length,
      afterFilter: filteredResults.length,
      minScoreUsed: effectiveMinScore,
    },
  }
}

/**
 * Search with query expansion for better recall
 * Generates related queries and combines results
 */
export async function expandedSearch(
  query: string,
  options: {
    productCategory?: ProductCategory | 'all'
    section?: PlaybookSection
    expansionQueries?: string[]
    topK?: number
  } = {}
): Promise<RAGContext> {
  const { productCategory, section, expansionQueries, topK = 10 } = options

  // Use provided expansion queries or generate semantic variations
  const queries = expansionQueries || generateQueryExpansions(query)

  // Add the original query
  const allQueries = [query, ...queries]

  return multiQuerySearch(allQueries, {
    productCategory,
    section,
    topKPerQuery: Math.ceil(topK / allQueries.length) + 2,
    finalTopN: topK,
  })
}

/**
 * Rerank results using Cohere
 */
async function rerankResults(
  query: string,
  results: PlaybookSearchResult[],
  topN: number,
  model: RerankModel = RERANK_MODELS.COHERE
): Promise<PlaybookSearchResult[]> {
  if (results.length === 0) return []
  if (results.length <= topN) {
    // If we have fewer results than requested, just return sorted by score
    return results.sort((a, b) => (b.score || 0) - (a.score || 0))
  }

  const cohere = getCohereClient()

  const documents = results.map((r) => r.content)

  const rerankResponse = await cohere.rerank({
    model,
    query,
    documents,
    topN,
    returnDocuments: false,
  })

  // Map reranked results back to original format
  const rerankedResults: PlaybookSearchResult[] = rerankResponse.results.map(
    (reranked) => {
      const originalResult = results[reranked.index]
      return {
        ...originalResult,
        rerankScore: reranked.relevanceScore,
      }
    }
  )

  return rerankedResults.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0))
}

/**
 * Build Pinecone metadata filter from search options
 * Extended to support Samsung content metadata (Implementation Plan aligned)
 */
function buildMetadataFilter(options: {
  productCategory?: ProductCategory | 'all'
  section?: PlaybookSection
  language?: 'en' | 'ko'
  // Samsung content-specific filters
  samsungContentType?: SamsungContentType
  videoFormat?: VideoFormat
  descriptionSection?: DescriptionSection
  styleElement?: StyleElement
  hasCorrections?: boolean
  hasQASection?: boolean
  hasHashtags?: boolean
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {}

  // Core filters
  if (options.productCategory && options.productCategory !== 'all') {
    filter.productCategory = { $eq: options.productCategory }
  }

  if (options.section) {
    filter.section = { $eq: options.section }
  }

  if (options.language) {
    filter.language = { $eq: options.language }
  }

  // Samsung content-specific filters (aligned with ingested data metadata)
  if (options.samsungContentType) {
    filter.contentType = { $eq: options.samsungContentType }
  }

  if (options.videoFormat) {
    filter.videoFormat = { $eq: options.videoFormat }
  }

  if (options.descriptionSection) {
    filter.descriptionSection = { $eq: options.descriptionSection }
  }

  if (options.styleElement) {
    filter.styleElement = { $eq: options.styleElement }
  }

  if (options.hasCorrections !== undefined) {
    filter.hasCorrections = { $eq: options.hasCorrections }
  }

  if (options.hasQASection !== undefined) {
    filter.hasQASection = { $eq: options.hasQASection }
  }

  if (options.hasHashtags !== undefined) {
    filter.hasHashtags = { $eq: options.hasHashtags }
  }

  return filter
}

/**
 * Generate query expansions for better recall
 */
function generateQueryExpansions(query: string): string[] {
  const expansions: string[] = []

  // Samsung product-specific expansions
  const productKeywords: Record<string, string[]> = {
    galaxy: ['samsung galaxy', 'galaxy series', 'galaxy smartphone'],
    phone: ['mobile phone', 'smartphone', 'galaxy phone'],
    watch: ['galaxy watch', 'smartwatch', 'wearable'],
    buds: ['galaxy buds', 'earbuds', 'wireless earbuds'],
    ring: ['galaxy ring', 'smart ring', 'wearable ring'],
    laptop: ['galaxy book', 'samsung laptop', 'notebook'],
    tv: ['samsung tv', 'smart tv', 'neo qled', 'oled tv'],
    appliance: ['home appliance', 'samsung appliance', 'smart home'],
  }

  // Marketing-specific expansions
  const marketingKeywords: Record<string, string[]> = {
    brand: ['branding guidelines', 'brand identity', 'brand voice'],
    marketing: ['marketing strategy', 'marketing campaign', 'marketing guidelines'],
    content: ['content creation', 'content guidelines', 'content strategy'],
    seo: ['seo optimization', 'search optimization', 'keyword strategy'],
    geo: ['generative engine optimization', 'ai search optimization', 'llm optimization'],
    social: ['social media', 'social marketing', 'social content'],
    campaign: ['marketing campaign', 'campaign strategy', 'campaign template'],
  }

  const lowerQuery = query.toLowerCase()

  // Add product-related expansions
  for (const [keyword, synonyms] of Object.entries(productKeywords)) {
    if (lowerQuery.includes(keyword)) {
      expansions.push(...synonyms.slice(0, 2))
    }
  }

  // Add marketing-related expansions
  for (const [keyword, synonyms] of Object.entries(marketingKeywords)) {
    if (lowerQuery.includes(keyword)) {
      expansions.push(...synonyms.slice(0, 2))
    }
  }

  // Limit expansions
  return expansions.slice(0, 3)
}

/**
 * Get section-specific context for content generation
 */
export async function getSectionContext(
  section: PlaybookSection,
  options: {
    productCategory?: ProductCategory | 'all'
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const sectionQueries: Record<PlaybookSection, string> = {
    playbook_overview: 'Samsung marketing playbook overview summary',
    brand_core: 'Samsung brand core values identity guidelines',
    target_audience: 'Target audience persona demographics insights',
    messaging_framework: 'Brand messaging framework key messages structure',
    tone_voice: 'Tone of voice writing style brand voice guidelines',
    content_strategy: 'Content strategy framework planning approach',
    content_type_playbook: 'Content type guidelines best practices formats',
    channel_playbook: 'Channel platform social media guidelines',
    creative_guidelines: 'Visual creative standards imagery photography',
    production_process: 'Content production process workflow',
    measurement_optimization: 'Performance measurement KPIs optimization',
    failure_patterns: 'Failure patterns avoid mistakes no-go examples',
    ai_content_guide: 'AI content GEO optimization generative engine',
    partner_guidelines: 'External partner agency guidelines',
    pre_publish_checklist: 'Pre-publish checklist quality review',
    other: 'Samsung marketing playbook guidelines',
  }

  const result = await searchPlaybook({
    query: sectionQueries[section],
    section,
    productCategory: options.productCategory,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Check if Cohere is configured
 */
export function isCohereConfigured(): boolean {
  return !!process.env.COHERE_API_KEY
}

// ============================================================================
// SAMSUNG CONTENT-TYPE SPECIFIC SEARCH FUNCTIONS
// Aligned with SAMSUNG_GEO_IMPLEMENTATION_PLAN.md
// ============================================================================

/**
 * Search for Samsung content examples by content type
 * Returns examples matching the specified content type (intro, how_to, shorts, etc.)
 */
export async function searchByContentType(
  contentType: SamsungContentType,
  options: {
    productCategory?: ProductCategory | 'all'
    videoFormat?: VideoFormat
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const contentTypeQueries: Record<SamsungContentType, string> = {
    intro: 'Samsung introduction video official film product launch',
    unboxing: 'Samsung unboxing whats inside box contents',
    how_to: 'Samsung how to guide tutorial steps instructions',
    shorts: 'Samsung shorts hook brief 9:16 vertical video',
    teaser: 'Samsung teaser coming soon announcement mystery',
    brand: 'Samsung brand campaign marketing initiative',
    esg: 'Samsung sustainability ESG environment documentary',
    documentary: 'Samsung documentary film story brand narrative',
    official_replay: 'Samsung unpacked event replay official live',
  }

  const result = await searchPlaybook({
    query: contentTypeQueries[contentType],
    samsungContentType: contentType,
    productCategory: options.productCategory,
    videoFormat: options.videoFormat,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Search for Q&A format examples
 * Returns Samsung-corrected examples with proper Q:/A: format
 * Critical for P0-1 implementation (Q&A format fix)
 */
export async function searchQAFormatExamples(
  options: {
    productCategory?: ProductCategory | 'all'
    contentType?: SamsungContentType
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const result = await searchPlaybook({
    query: 'Samsung Q&A format question answer FAQ colon',
    styleElement: 'qa_format',
    hasQASection: true,
    productCategory: options.productCategory,
    samsungContentType: options.contentType,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Search for hashtag order examples
 * Returns examples showing correct hashtag ordering (#GalaxyAI first, #Samsung last)
 * Critical for P0-2 implementation (hashtag order fix)
 */
export async function searchHashtagOrderExamples(
  options: {
    productCategory?: ProductCategory | 'all'
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const result = await searchPlaybook({
    query: 'Samsung hashtag order GalaxyAI Samsung Galaxy',
    styleElement: 'hashtag_order',
    hasHashtags: true,
    productCategory: options.productCategory,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Search for opener pattern examples by content type
 * Returns examples of Samsung opening patterns
 * Critical for P1-3 implementation (Samsung opener patterns)
 */
export async function searchOpenerPatterns(
  contentType: SamsungContentType,
  options: {
    productCategory?: ProductCategory | 'all'
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const openerQueries: Record<SamsungContentType, string> = {
    intro: 'This is the official introduction video introducing Samsung',
    unboxing: 'Unbox the discover whats inside Samsung',
    how_to: 'This is the official video guide how to use Samsung',
    shorts: 'Samsung shorts hook opening brief',
    teaser: 'Something is coming get ready Samsung',
    brand: 'Samsung campaign brand opening',
    esg: 'Samsung sustainability voices of galaxy',
    documentary: 'Samsung documentary film opening',
    official_replay: 'Samsung unpacked event replay',
  }

  const result = await searchPlaybook({
    query: openerQueries[contentType],
    styleElement: 'opener_pattern',
    samsungContentType: contentType,
    productCategory: options.productCategory,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Search for Samsung-corrected examples
 * Returns examples that have been corrected to follow Samsung style guidelines
 */
export async function searchCorrectedExamples(
  options: {
    productCategory?: ProductCategory | 'all'
    contentType?: SamsungContentType
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const result = await searchPlaybook({
    query: 'Samsung corrected style guidelines format',
    hasCorrections: true,
    productCategory: options.productCategory,
    samsungContentType: options.contentType,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Search for video format-specific examples
 * Returns examples for either Feed (16:9) or Shorts (9:16) format
 */
export async function searchByVideoFormat(
  videoFormat: VideoFormat,
  options: {
    productCategory?: ProductCategory | 'all'
    contentType?: SamsungContentType
    topK?: number
  } = {}
): Promise<PlaybookSearchResult[]> {
  const formatQueries: Record<VideoFormat, string> = {
    feed_16x9: 'Samsung YouTube feed video full description timestamps Q&A hashtags',
    shorts_9x16: 'Samsung shorts 9:16 vertical brief hook under 200 characters',
  }

  const result = await searchPlaybook({
    query: formatQueries[videoFormat],
    videoFormat,
    productCategory: options.productCategory,
    samsungContentType: options.contentType,
    topK: options.topK || 5,
    rerankTopN: options.topK || 5,
  })

  return result.results
}

/**
 * Combined search for content generation context
 * Fetches examples relevant to the specific content generation task
 * Used by generate-v2 pipeline for RAG context
 */
export async function fetchContentGenerationContext(
  options: {
    productName: string
    keywords: string[]
    contentType: SamsungContentType
    videoFormat: VideoFormat
    productCategory?: ProductCategory | 'all'
  }
): Promise<{
  contentTypeExamples: PlaybookSearchResult[]
  qaFormatExamples: PlaybookSearchResult[]
  hashtagExamples: PlaybookSearchResult[]
  openerExamples: PlaybookSearchResult[]
  correctedExamples: PlaybookSearchResult[]
}> {
  const { productName, keywords, contentType, videoFormat, productCategory } = options

  // Fetch all relevant context in parallel
  const [
    contentTypeExamples,
    qaFormatExamples,
    hashtagExamples,
    openerExamples,
    correctedExamples,
  ] = await Promise.all([
    // Content type examples
    searchByContentType(contentType, { productCategory, videoFormat, topK: 3 }),
    // Q&A format examples (for FAQ generation)
    searchQAFormatExamples({ productCategory, contentType, topK: 2 }),
    // Hashtag order examples (for hashtag generation)
    searchHashtagOrderExamples({ productCategory, topK: 2 }),
    // Opener pattern examples (for description generation)
    searchOpenerPatterns(contentType, { productCategory, topK: 2 }),
    // Samsung-corrected examples (for style reference)
    searchCorrectedExamples({ productCategory, contentType, topK: 2 }),
  ])

  console.log(`[RAG] Content generation context fetched:`)
  console.log(`  - Content type (${contentType}): ${contentTypeExamples.length} examples`)
  console.log(`  - Q&A format: ${qaFormatExamples.length} examples`)
  console.log(`  - Hashtag order: ${hashtagExamples.length} examples`)
  console.log(`  - Opener patterns: ${openerExamples.length} examples`)
  console.log(`  - Corrected examples: ${correctedExamples.length} examples`)

  return {
    contentTypeExamples,
    qaFormatExamples,
    hashtagExamples,
    openerExamples,
    correctedExamples,
  }
}
