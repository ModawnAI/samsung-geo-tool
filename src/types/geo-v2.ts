/**
 * Samsung GEO Tool v2 Types
 * USP-Centric Architecture with Google Grounding Integration
 */

// ==========================================
// USP (Unique Selling Point) Types
// ==========================================

export type USPCategory =
  | 'Camera'
  | 'Display'
  | 'Performance'
  | 'AI'
  | 'Design'
  | 'Battery'
  | 'Security'
  | 'Audio'
  | 'Connectivity'
  | 'Software'
  | 'Other'

// ==========================================
// Content Type & Video Format (Samsung Standard)
// ==========================================

export type ContentType =
  | 'intro'           // Introduction Film
  | 'unboxing'        // Unboxing
  | 'how_to'          // How-to Guide
  | 'shorts'          // Shorts (9:16)
  | 'teaser'          // Teaser
  | 'brand'           // Brand Campaign
  | 'esg'             // ESG/Sustainability
  | 'documentary'     // Documentary
  | 'official_replay' // Official Replay (Events)

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  intro: 'Introduction Film',
  unboxing: 'Unboxing',
  how_to: 'How-to Guide',
  shorts: 'Shorts',
  teaser: 'Teaser',
  brand: 'Brand Campaign',
  esg: 'ESG/Sustainability',
  documentary: 'Documentary',
  official_replay: 'Official Replay',
}

export type VideoFormat = 'feed_16x9' | 'shorts_9x16'

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  feed_16x9: 'Feed (16:9)',
  shorts_9x16: 'Shorts (9:16)',
}

export type InputMethod = 'youtube_url' | 'srt_upload' | 'text_input'

export const INPUT_METHOD_LABELS: Record<InputMethod, string> = {
  youtube_url: 'YouTube URL',
  srt_upload: 'SRT Upload',
  text_input: 'Text Input',
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface USPEvidence {
  sources: string[]
  quotes: string[]
  searchQueries?: string[]
}

export interface UniqueSellingPoint {
  feature: string
  category: USPCategory
  differentiation: string
  userBenefit: string
  evidence: USPEvidence
  confidence: ConfidenceLevel
}

export interface USPExtractionResult {
  usps: UniqueSellingPoint[]
  competitiveContext: string
  extractionMethod: 'grounded' | 'generative'
  groundingQuality: number // 0-100
}

// ==========================================
// Grounding Quality Scoring (10pt)
// ==========================================

export interface GroundingQualityScore {
  citationDensity: number    // 0-3pts: % of content with grounding support
  sourceAuthority: number    // 0-4pts: Quality of sources (samsung.com = Tier 1)
  coverage: number           // 0-3pts: How well grounding covers all sections
  total: number              // 0-10pts
  breakdown: {
    citationPercentage: number
    tier1Sources: number
    tier2Sources: number
    tier3Sources: number
    sectionsWithGrounding: number
    totalSections: number
  }
}

// Source authority tiers - Enhanced for comprehensive detection
export const SOURCE_AUTHORITY_TIERS = {
  // Tier 1: Official Samsung sources (highest authority)
  tier1: [
    'samsung.com',
    'news.samsung.com',
    'samsung.co.kr',
    'samsungmobilepress.com',
    'samsungnewsroom.com',
    'samsung.cn',
    'samsung.co.uk',
    'samsung.de',
    'samsung.fr',
    'samsung.es',
    'samsung.it',
    'samsung.co.jp',
    'samsung.com.au',
    'samsung.com.br',
    'semiconductor.samsung.com',
    'samsungdisplay.com',
    'research.samsung.com',
  ],
  // Tier 2: Trusted tech media and publications
  tier2: [
    // Major tech publications
    'gsmarena.com',
    'theverge.com',
    'techcrunch.com',
    'cnet.com',
    'techradar.com',
    'tomsguide.com',
    'androidauthority.com',
    'engadget.com',
    'wired.com',
    'arstechnica.com',
    'zdnet.com',
    'pcmag.com',
    'tomshardware.com',
    'anandtech.com',
    'xda-developers.com',
    'androidcentral.com',
    '9to5google.com',
    'androidpolice.com',
    'phonearena.com',
    'dpreview.com',
    'notebookcheck.net',
    // Business/mainstream tech coverage
    'bloomberg.com',
    'reuters.com',
    'forbes.com',
    'businessinsider.com',
    'wsj.com',
    'nytimes.com',
    'bbc.com',
    'theguardian.com',
    // Samsung-focused media
    'sammobile.com',
    // General tech media
    'gizmodo.com',
    'mashable.com',
    'digitaltrends.com',
    'howtogeek.com',
    'slashgear.com',
    'bgr.com',
    'pocketnow.com',
    'thenextweb.com',
  ],
  // Tier 3: Community and social sources
  tier3: [
    'reddit.com',
    'youtube.com',
    'twitter.com',
    'x.com',
    'medium.com',
    'quora.com',
    'facebook.com',
    'linkedin.com',
    'instagram.com',
    'tiktok.com',
    'discord.com',
    'github.com',
    'stackoverflow.com',
    'forums.androidcentral.com',
    'xda-forums.com',
  ],
} as const

// ==========================================
// Grounding Metadata Aggregation
// ==========================================

export interface GroundingSource {
  uri: string
  title: string
  usedIn: string[]  // Which sections used this source
  accessCount?: number
  tier: 1 | 2 | 3 | 4
  isBlacklisted?: boolean  // Whether domain is in active blacklist
  blacklistReason?: string // Reason for blacklisting (if applicable)
}

export interface GroundingMetadata {
  webSearchQueries: string[]
  sources: GroundingSource[]
  citationDensity: number
  totalCitations: number
  uniqueSources: number
}

// ==========================================
// Anti-Fabrication Guardrails
// ==========================================

export const SAFE_LANGUAGE_PATTERNS = {
  // Safe language for low-confidence/new products
  safe: [
    'Designed for',
    'Enables professionals to',
    'Potential improvement in',
    'Built to support',
    'Optimized for',
    'Created for users who',
    'Engineered to deliver',
    'Crafted for',
  ],
  // Forbidden fabrications (never use without evidence)
  forbidden: [
    /\d+%\s+(faster|better|improved|increase|improvement)/i,
    /studies\s+show/i,
    /research\s+indicates/i,
    /proven\s+to/i,
    /scientifically\s+verified/i,
    /experts\s+agree/i,
    /users\s+report\s+\d+%/i,
  ],
} as const

export interface FabricationCheck {
  hasFabrication: boolean
  violations: string[]
  suggestions: string[]
}

// ==========================================
// Case Study Types
// ==========================================

export interface CaseStudy {
  title: string
  scenario: string
  solution: string
  linkedUSPs: string[]  // USP features this case connects to
  evidence: {
    sources: string[]
    confidence: ConfidenceLevel
  }
}

export interface CaseStudyResult {
  caseStudies: CaseStudy[]
  extractionMethod: 'grounded' | 'generative'
}

// ==========================================
// FAQ with USP Connection
// ==========================================

export interface FAQItem {
  question: string
  answer: string
  linkedUSPs: string[]  // USP features this FAQ addresses
  confidence: ConfidenceLevel
}

export interface FAQResult {
  faqs: FAQItem[]
  queryPatternOptimization: boolean  // Optimized for Query Fan-Out
}

// ==========================================
// Pipeline Stage Types
// ==========================================

export type PipelineStage =
  | 'description'      // Stage 1: Description with grounding
  | 'usp_extraction'   // Stage 1.5: USP Extraction with grounding
  | 'chapters'         // Stage 2: Chapters (no grounding)
  | 'faq'              // Stage 3: FAQ with grounding, USP-connected
  | 'step_by_step'     // Stage 4: Step-by-step (no grounding)
  | 'case_studies'     // Stage 5: Case studies with grounding
  | 'keywords'         // Stage 6: Keywords (no grounding)
  | 'grounding_aggregation' // Stage 7: Aggregate grounding metadata

export interface StageConfig {
  name: PipelineStage
  requiresGrounding: boolean
  dependsOn: PipelineStage[]
  canParallelize: boolean
}

export const PIPELINE_STAGES: StageConfig[] = [
  { name: 'description', requiresGrounding: true, dependsOn: [], canParallelize: false },
  { name: 'usp_extraction', requiresGrounding: true, dependsOn: ['description'], canParallelize: false },
  { name: 'chapters', requiresGrounding: false, dependsOn: ['usp_extraction'], canParallelize: true },
  { name: 'faq', requiresGrounding: true, dependsOn: ['usp_extraction'], canParallelize: true },
  { name: 'step_by_step', requiresGrounding: false, dependsOn: ['faq'], canParallelize: true },
  { name: 'case_studies', requiresGrounding: true, dependsOn: ['usp_extraction'], canParallelize: true },
  { name: 'keywords', requiresGrounding: false, dependsOn: ['description'], canParallelize: false },
  { name: 'grounding_aggregation', requiresGrounding: false, dependsOn: ['faq', 'case_studies'], canParallelize: false },
]

// ==========================================
// Progress Tracking
// ==========================================

export interface PipelineProgress {
  stage: PipelineStage
  percentage: number
  message: string
  startedAt?: string
  completedAt?: string
}

export const STAGE_PROGRESS_MAP: Record<PipelineStage, { percentage: number; message: string }> = {
  description: { percentage: 15, message: 'Description generation with Google Search' },
  usp_extraction: { percentage: 30, message: 'USP extraction with evidence' },
  chapters: { percentage: 50, message: 'Generating chapters (parallel)' },
  faq: { percentage: 50, message: 'Generating FAQ with grounding (parallel)' },
  step_by_step: { percentage: 70, message: 'Step-by-step guide (parallel)' },
  case_studies: { percentage: 70, message: 'Case studies with evidence (parallel)' },
  keywords: { percentage: 85, message: 'Keywords and grounding aggregation' },
  grounding_aggregation: { percentage: 95, message: 'Finalizing grounding metadata' },
}

// ==========================================
// Enhanced Generation Response
// ==========================================

export interface KeywordDensityDetails {
  score: number // 0-1 scale
  densityPercentage: number // Actual density as percentage
  totalKeywordOccurrences: number
  totalWordCount: number
  keywordBreakdown: Array<{
    keyword: string
    occurrences: number
    variants: string[]
  }>
  distribution: {
    description: number
    faq: number
    caseStudies: number
    usps: number
  }
}

export interface GEOv2GenerateResponse {
  description: {
    preview: string        // First 130 characters
    full: string           // Full description
    vanityLinks: string[]  // Suggested vanity links
  }
  uspResult: USPExtractionResult
  chapters: {
    timestamps: string
    autoGenerated: boolean
  }
  faq: FAQResult
  stepByStep?: {
    steps: string[]
    isTutorialContent: boolean
  }
  caseStudies?: CaseStudyResult
  keywords: {
    product: string[]
    generic: string[]
    densityScore: number
    questionScore?: number
    structureScore?: number
    lengthScore?: number
    preliminaryTotal?: number
  }
  hashtags: string[]
  isFixedHashtags?: boolean  // True if using pre-defined fixed hashtags (Samsung Standard)
  hashtagCategories?: {
    brand: string[]
    features: string[]
    industry: string[]
  }
  finalScore: GEOv2Score
  groundingMetadata?: GroundingMetadata
  imageAltResult?: ImageAltResult // Image alt text templates for SEO
  keywordDensityDetails?: KeywordDensityDetails // Programmatic keyword density breakdown
  progress?: PipelineProgress[]
  tuningMetadata?: {
    configSource: 'database' | 'default' | 'mixed'
    promptVersionId: string | null
    weightsVersionId: string | null
    weightsName: string
    loadedAt: string
    scoreBreakdown?: Array<{
      metric: string
      label: string
      score: number
      weight: number
      weightedScore: number
      contribution: number
    }>
  }
}

export interface GEOv2Score {
  keywordDensity: number       // 15pts (was 20 in v1)
  aiExposure: number           // 25pts (was 30 in v1)
  questionPatterns: number     // 20pts
  sentenceStructure: number    // 15pts
  lengthCompliance: number     // 15pts
  groundingQuality: GroundingQualityScore  // 10pts NEW
  total: number                // 100pts
}

// ==========================================
// Export Types
// ==========================================

export interface ExportOptions {
  format: 'json' | 'text'
  includeSources: boolean
  includeScores: boolean
  includeUSPs: boolean
}

export interface TextExportSections {
  description: boolean
  usps: boolean
  faq: boolean
  chapters: boolean
  caseStudies: boolean
  groundingSources: boolean
  scores: boolean
}

// ==========================================
// Analytics Types
// ==========================================

export interface SourceClickEvent {
  sourceUri: string
  sourceTitle: string
  section: string
  timestamp: string
  sessionId: string
}

export interface AnalyticsData {
  sourceClicks: SourceClickEvent[]
  totalClicks: number
  clicksBySource: Record<string, number>
  clicksBySection: Record<string, number>
}

// ==========================================
// Image Alt Text Generation Types
// ==========================================

export type ImageCategory =
  | 'front_view'        // 제품 전면
  | 'back_view'         // 제품 후면
  | 'side_view'         // 제품 측면
  | 'camera_closeup'    // 카메라 클로즈업
  | 'display_closeup'   // 디스플레이 클로즈업
  | 'lifestyle'         // 라이프스타일
  | 'color_options'     // 색상 옵션
  | 'package_contents'  // 패키지 구성품
  | 'feature_highlight' // 기능 하이라이트
  | 'comparison'        // 비교 이미지
  | 'accessories'       // 액세서리

export const IMAGE_CATEGORY_LABELS: Record<ImageCategory, { ko: string; en: string; description: string }> = {
  front_view: { ko: '제품 전면', en: 'Front View', description: '제품의 정면 이미지' },
  back_view: { ko: '제품 후면', en: 'Back View', description: '카메라 모듈 등 후면 이미지' },
  side_view: { ko: '제품 측면', en: 'Side View', description: '두께, 버튼 등 측면 이미지' },
  camera_closeup: { ko: '카메라 클로즈업', en: 'Camera Close-up', description: '카메라 시스템 상세 이미지' },
  display_closeup: { ko: '디스플레이 클로즈업', en: 'Display Close-up', description: '화면, 베젤 상세 이미지' },
  lifestyle: { ko: '라이프스타일', en: 'Lifestyle', description: '실제 사용 환경에서의 이미지' },
  color_options: { ko: '색상 옵션', en: 'Color Options', description: '다양한 색상 변형 이미지' },
  package_contents: { ko: '패키지 구성품', en: 'Package Contents', description: '박스 내용물 이미지' },
  feature_highlight: { ko: '기능 하이라이트', en: 'Feature Highlight', description: '특정 기능 강조 이미지' },
  comparison: { ko: '비교 이미지', en: 'Comparison', description: '타 제품 또는 이전 모델과의 비교' },
  accessories: { ko: '액세서리', en: 'Accessories', description: '케이스, 충전기 등 액세서리' },
}

export interface ImageAltTemplate {
  category: ImageCategory
  altTextKo: string          // Korean alt text
  altTextEn: string          // English alt text
  keywords: string[]         // Keywords naturally integrated
  characterCount: {
    ko: number
    en: number
  }
  seoScore: number           // 0-100, how SEO-optimized
  accessibilityScore: number // 0-100, how accessible
}

export interface ImageAltResult {
  productName: string
  templates: ImageAltTemplate[]
  generatedAt: string
  totalTemplates: number
  metadata: {
    uspsIncorporated: string[]   // Which USPs were used
    keywordsIncorporated: string[]
    avgCharCount: number
    avgSeoScore: number
  }
}
