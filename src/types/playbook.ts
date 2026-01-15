/**
 * Samsung Marketing Playbook Vector Database Types
 * Custom metadata schema for RAG-based content optimization
 * Enhanced with extensive metadata for maximum generation utility
 */

// Pinecone vector metadata for Samsung Marketing Playbook
// Index signature required for Pinecone RecordMetadata compatibility
export interface PlaybookMetadata {
  // Document identification
  documentId: string
  chunkId: string
  chunkIndex: number
  totalChunks: number

  // Hierarchical content organization
  section: PlaybookSection
  sectionKo: string // Korean section title
  subsection: string
  subsectionKo: string // Korean subsection title
  subsubsection: string // Third level hierarchy
  pageNumber: number
  sectionDepth: number // 1=main, 2=sub, 3=subsub

  // Samsung-specific classification
  productCategory: ProductCategory | 'all'
  contentType: ContentType

  // Localization
  language: 'en' | 'ko'

  // Version control
  version: string
  uploadedAt: string
  uploadedBy: string

  // Content preview for search results
  content: string // The actual text content (for reranking)

  // === ENHANCED METADATA FOR GENERATION UTILITY ===

  // Content purpose classification
  contentPurpose: ContentPurpose

  // Target audience/persona relevance
  targetPersonas: string[] // e.g., ['tech_enthusiast', 'eco_conscious', 'premium_seeker']

  // Content quality indicators
  hasExamples: boolean
  hasTemplates: boolean
  hasTables: boolean
  hasQuotes: boolean
  hasChecklist: boolean
  hasNoGoRules: boolean // Contains things NOT to do
  hasDoRules: boolean // Contains explicit guidance on what TO do

  // Use case tags for retrieval optimization
  useCaseTags: string[] // e.g., ['headline_writing', 'cta_generation', 'tone_guidance']

  // Content specificity level
  specificityLevel: 'principle' | 'guideline' | 'example' | 'template' | 'checklist'

  // Related sections for cross-referencing
  relatedSections: string[]

  // Channel applicability
  applicableChannels: string[] // e.g., ['instagram', 'youtube', 'blog', 'email']

  // Campaign phase applicability
  campaignPhases: string[] // e.g., ['teaser', 'launch', 'sustain', 'always_on']

  // Content format guidance
  contentFormat: string // e.g., 'headline', 'body_copy', 'cta', 'hashtag', 'description'

  // Priority/importance level
  priorityLevel: 'critical' | 'important' | 'reference' | 'supplementary'

  // Keyword extraction for better matching
  keywords: string[]

  // Sentiment/tone markers
  toneMarkers: string[] // e.g., ['confident', 'human', 'empowering', 'innovative']

  // Index signature for Pinecone compatibility
  [key: string]: string | number | boolean | string[]
}

// Content purpose classification
export type ContentPurpose =
  | 'brand_definition'      // Core brand identity and values
  | 'audience_insight'      // Target audience understanding
  | 'messaging_framework'   // Message structure and hierarchy
  | 'tone_guidance'         // Voice and tone instructions
  | 'content_strategy'      // Strategic content planning
  | 'content_template'      // Ready-to-use templates
  | 'channel_guidance'      // Channel-specific instructions
  | 'creative_direction'    // Visual and creative guidelines
  | 'process_workflow'      // Production and approval processes
  | 'measurement_kpi'       // Success metrics and KPIs
  | 'failure_prevention'    // What NOT to do (no-go rules)
  | 'ai_guidance'           // AI content generation rules
  | 'partner_guidelines'    // External partner instructions
  | 'quality_checklist'     // Pre-publish quality checks
  | 'example_reference'     // Concrete examples
  | 'general'               // General information

// Main sections of Samsung Marketing Playbook (aligned with 2025 Strategy Playbook)
export type PlaybookSection =
  | 'playbook_overview'        // 1. 플레이북 개요
  | 'brand_core'               // 2. 브랜드 핵심 정의
  | 'target_audience'          // 3. 타겟 오디언스 & 인사이트
  | 'messaging_framework'      // 4. 브랜드 메시지 구조
  | 'tone_voice'               // 5. 톤앤매너 가이드
  | 'content_strategy'         // 6. 콘텐츠 전략 프레임
  | 'content_type_playbook'    // 7. 콘텐츠 유형별 가이드
  | 'channel_playbook'         // 8. 채널별 운영 가이드
  | 'creative_guidelines'      // 9. 크리에이티브 가이드
  | 'production_process'       // 10. 콘텐츠 제작 프로세스
  | 'measurement_optimization' // 11. 성과 측정 & 개선
  | 'failure_patterns'         // 12. 실패 사례 & No-Go
  | 'ai_content_guide'         // 13. AI 콘텐츠 가이드
  | 'partner_guidelines'       // 14. 외부 파트너 가이드
  | 'pre_publish_checklist'    // 15. 발행 전 체크리스트
  | 'other'

// Section title mapping (Korean to English)
export const SECTION_TITLES: Record<string, { ko: string; en: PlaybookSection }> = {
  '플레이북 개요': { ko: '플레이북 개요', en: 'playbook_overview' },
  '브랜드 핵심 정의': { ko: '브랜드 핵심 정의', en: 'brand_core' },
  '타겟 오디언스 & 인사이트': { ko: '타겟 오디언스 & 인사이트', en: 'target_audience' },
  '브랜드 메시지 구조': { ko: '브랜드 메시지 구조', en: 'messaging_framework' },
  '톤앤매너 가이드': { ko: '톤앤매너 가이드', en: 'tone_voice' },
  '콘텐츠 전략 프레임': { ko: '콘텐츠 전략 프레임', en: 'content_strategy' },
  '콘텐츠 유형별 가이드': { ko: '콘텐츠 유형별 가이드', en: 'content_type_playbook' },
  '채널별 운영 가이드': { ko: '채널별 운영 가이드', en: 'channel_playbook' },
  '크리에이티브 가이드': { ko: '크리에이티브 가이드', en: 'creative_guidelines' },
  '콘텐츠 제작 프로세스': { ko: '콘텐츠 제작 프로세스', en: 'production_process' },
  '성과 측정 & 개선': { ko: '성과 측정 & 개선', en: 'measurement_optimization' },
  '실패 사례 & No-Go': { ko: '실패 사례 & No-Go', en: 'failure_patterns' },
  'AI 콘텐츠 가이드': { ko: 'AI 콘텐츠 가이드', en: 'ai_content_guide' },
  '외부 파트너 가이드': { ko: '외부 파트너 가이드', en: 'partner_guidelines' },
  '발행 전 체크리스트': { ko: '발행 전 체크리스트', en: 'pre_publish_checklist' },
}

// Samsung product categories (aligned with Samsung.com navigation)
export type ProductCategory =
  | 'featured'       // 기획전
  | 'mobile'         // 모바일
  | 'tv_audio'       // TV/영상·음향
  | 'kitchen'        // 주방가전
  | 'living'         // 리빙가전
  | 'pc'             // PC/주변기기
  | 'wearables'      // 웨어러블
  | 'harman'         // 하만
  | 'accessories'    // 소모품/액세서리
  | 'ai_club'        // AI 구독클럽

// Content types in the playbook
export type ContentType =
  | 'text'
  | 'table'
  | 'image_caption'
  | 'bullet_points'
  | 'heading'
  | 'quote'
  | 'example'

// Document chunk for processing
export interface DocumentChunk {
  id: string
  content: string
  metadata: Omit<PlaybookMetadata, 'chunkId' | 'content'>
}

// Ingestion request for API
export interface IngestRequest {
  documentName: string
  content: string
  fileType: 'pdf' | 'docx' | 'txt' | 'md'
  section?: PlaybookSection
  productCategory?: ProductCategory | 'all'
  language?: 'en' | 'ko'
  version?: string
}

// Samsung content type for video descriptions (aligned with Implementation Plan Section 5.1)
export type SamsungContentType =
  | 'intro'           // Introduction Film
  | 'unboxing'        // Unboxing
  | 'how_to'          // How-to Guide
  | 'shorts'          // Shorts (9:16)
  | 'teaser'          // Teaser
  | 'brand'           // Brand Campaign
  | 'esg'             // ESG/Sustainability
  | 'documentary'     // Documentary
  | 'official_replay' // Official Replay

// Video format (aligned with Implementation Plan Section 1.3)
export type VideoFormat = 'feed_16x9' | 'shorts_9x16'

// Description section (aligned with Implementation Plan Section 1.1)
export type DescriptionSection =
  | 'opening'     // Opening patterns
  | 'body'        // Feature descriptions
  | 'timestamps'  // Timestamp format
  | 'steps'       // How-to steps
  | 'qa'          // Q&A section
  | 'hashtags'    // Hashtag section
  | 'disclaimer'  // Legal disclaimers
  | 'full'        // Full description

// Style element (aligned with Implementation Plan Section 1.4)
export type StyleElement =
  | 'qa_format'       // Q:/A: format examples
  | 'hashtag_order'   // #GalaxyAI first, #Samsung last
  | 'opener_pattern'  // Opening sentence patterns
  | 'emoji_usage'     // Approved emojis
  | 'spacing'         // Unit spacing (76.1 Wh)
  | 'capitalization'  // Product name capitalization
  | 'vanity_link'     // smsng.co link format
  | 'general'         // General content

// Search request for RAG (extended for Samsung content metadata)
export interface PlaybookSearchRequest {
  query: string
  productCategory?: ProductCategory | 'all'
  section?: PlaybookSection
  topK?: number
  rerankTopN?: number
  language?: 'en' | 'ko'
  includeScores?: boolean
  // Samsung content-specific filters (Implementation Plan aligned)
  samsungContentType?: SamsungContentType
  videoFormat?: VideoFormat
  descriptionSection?: DescriptionSection
  styleElement?: StyleElement
  hasCorrections?: boolean // Filter for Samsung-corrected examples
  hasQASection?: boolean
  hasHashtags?: boolean
}

// Search result with reranking
export interface PlaybookSearchResult {
  id: string
  content: string
  score: number
  rerankScore?: number
  metadata: PlaybookMetadata
}

// RAG context for content generation
export interface RAGContext {
  query: string
  results: PlaybookSearchResult[]
  totalResults: number
  processingTimeMs: number
  filterStats?: {
    beforeFilter: number
    afterFilter: number
    minScoreUsed: number
  }
}

// Playbook document record in Supabase
export interface PlaybookDocument {
  id: string
  name: string
  fileName: string
  fileType: string
  section: PlaybookSection
  productCategory: ProductCategory | 'all'
  language: 'en' | 'ko'
  version: string
  totalChunks: number
  status: 'processing' | 'indexed' | 'failed'
  errorMessage?: string
  uploadedAt: string
  uploadedBy: string
  indexedAt?: string
}

// Ingestion status response
export interface IngestionStatus {
  documentId: string
  status: 'processing' | 'indexed' | 'failed'
  chunksProcessed: number
  totalChunks: number
  errorMessage?: string
}

// Configuration for chunking
export interface ChunkingConfig {
  maxChunkSize: number       // Max characters per chunk (default: 1000)
  chunkOverlap: number       // Overlap between chunks (default: 200)
  minChunkSize: number       // Minimum chunk size (default: 100)
  preserveParagraphs: boolean // Try to preserve paragraph boundaries
}

// Default chunking configuration
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
  preserveParagraphs: true,
}
