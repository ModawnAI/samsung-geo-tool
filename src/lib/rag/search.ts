import { CohereClient } from 'cohere-ai'
import { getPineconeClient, PLAYBOOK_NAMESPACE, RERANK_MODELS, type RerankModel } from '@/lib/pinecone/client'
import type {
  PlaybookSearchRequest,
  PlaybookSearchResult,
  RAGContext,
  PlaybookMetadata,
  PlaybookSection,
  ProductCategory,
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
  } = request

  // Build metadata filter
  const filter = buildMetadataFilter({ productCategory, section, language })

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
  } = {}
): Promise<RAGContext> {
  const startTime = Date.now()

  const {
    productCategory,
    section,
    topKPerQuery = 5,
    finalTopN = 10,
    deduplicateByContent = true,
  } = options

  // Execute all queries in parallel
  const searchPromises = queries.map((query) =>
    searchPlaybook({
      query,
      productCategory,
      section,
      topK: topKPerQuery,
      rerankTopN: 0, // Skip individual reranking, do final rerank
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

  const processingTimeMs = Date.now() - startTime

  return {
    query: combinedQuery,
    results: rerankedResults,
    totalResults: rerankedResults.length,
    processingTimeMs,
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
 */
function buildMetadataFilter(options: {
  productCategory?: ProductCategory | 'all'
  section?: PlaybookSection
  language?: 'en' | 'ko'
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {}

  if (options.productCategory && options.productCategory !== 'all') {
    filter.productCategory = { $eq: options.productCategory }
  }

  if (options.section) {
    filter.section = { $eq: options.section }
  }

  if (options.language) {
    filter.language = { $eq: options.language }
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
