/**
 * Samsung GEO Implementation Plan Ingestion Script
 *
 * This script clears the Pinecone index and populates it with
 * structured data from the Samsung GEO Implementation Plan document.
 *
 * Usage:
 *   npx tsx scripts/ingest-geo-implementation-plan.ts
 */

import { Pinecone } from '@pinecone-database/pinecone'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env or .env.local
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile)
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      envContent.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
        }
      })
    }
  }
}
loadEnv()

const PINECONE_INDEX_NAME = 'samsung-marketing-playbook'
const PINECONE_NAMESPACE = 'playbook-v1'

interface ChunkData {
  id: string
  content: string
  metadata: Record<string, string | number | boolean | string[]>
}

// Samsung GEO Implementation Plan Data - structured chunks with metadata
const implementationPlanData: ChunkData[] = [
  // ===== PART 1: SAMSUNG WRITING STYLE ANALYSIS =====
  {
    id: 'geo_style_description_structure',
    content: `Samsung YouTube Description Structure Patterns:

OPENING PATTERNS:
- Standard: "This is the official [type] for/on [product]."
  Example: "This is the official video guide on how to use AI Select on Galaxy Book."
- Alternative: "Introducing the [product]."
  Example: "Introducing the new Galaxy Book5 Pro."

BODY SECTION:
- Feature list + emojis (1-3 max) + benefit
- Example: "Search effortlessly without interrupting your flow—drag it, draw it, and find it! 🔍"

TIMESTAMPS FORMAT:
- Use 00:00 format with 2-5 words per entry
- Example: "00:00 Intro\\n00:16 Search image with AI Select"

HOW-TO STEPS:
- Pattern: "Follow these simple steps to use [feature]:"
- Format: "Step 1: [instruction]\\nStep 2: [instruction]..."`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 0,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Description Structure Patterns',
      subsectionKo: '설명문 구조 패턴',
      subsubsection: '',
      pageNumber: 1,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['youtube_description', 'video_content', 'description_writing'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice', 'channel_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on', 'launch', 'sustain'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['description', 'youtube', 'structure', 'opening', 'timestamps', 'how-to'],
      toneMarkers: ['professional', 'clear', 'instructional'],
    },
  },
  {
    id: 'geo_style_qa_format',
    content: `Samsung Q&A Format Guide (CRITICAL):

CORRECT FORMAT:
Q: [question text]?
A: [answer text]

RULES:
- Use COLON (:) after Q and A, NOT period (.)
- 2-4 Q&A pairs maximum (not 5-7)
- No blank line between Q and A
- Question length: 10-20 words
- Answer length: 50-100 words
- Focus on practical user questions

EXAMPLE:
Q: How do I use AI Select on Galaxy Book?
A: To use AI Select, simply drag or draw around any content on your screen. This allows you to quickly search for related information, translate text, or perform actions without leaving your current task.

INCORRECT (DO NOT USE):
Q. What is AI Select?
A. AI Select is a feature...`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 1,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Q&A Format',
      subsectionKo: 'Q&A 형식',
      subsubsection: '',
      pageNumber: 1,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['faq_writing', 'qa_format', 'youtube_description'],
      specificityLevel: 'guideline',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'faq',
      priorityLevel: 'critical',
      keywords: ['Q&A', 'FAQ', 'colon', 'format', 'question', 'answer'],
      toneMarkers: ['professional', 'helpful', 'clear'],
    },
  },
  {
    id: 'geo_style_hashtag_order',
    content: `Samsung Hashtag Order Guide (CRITICAL):

REQUIRED ORDER:
1. #GalaxyAI (if AI features present, ALWAYS FIRST)
2. #[ProductName] (e.g., #GalaxyZFlip7, #GalaxyBook5Pro)
3. #[ProductSeries] (e.g., #GalaxyS, #GalaxyBook)
4. #Samsung (ALWAYS LAST)

CONSTRAINTS:
- Total: 3-5 hashtags only (NOT 5-8)
- No spaces within hashtags
- Capitalize first letter of each word (CamelCase)
- If user provides fixed hashtags, use those instead

CORRECT EXAMPLES:
#GalaxyAI #GalaxyS25 #GalaxyS #Samsung
#GalaxyAI #GalaxyBook5Pro #GalaxyBook #Samsung
#GalaxyZFlip7 #GalaxyZ #Samsung

INCORRECT (DO NOT USE):
#Samsung #GalaxyAI #GalaxyS25 (wrong order)
#galaxyai #galaxys25 #samsung (wrong capitalization)
#Galaxy AI #Galaxy S25 (spaces in hashtags)`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 2,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Hashtag Guidelines',
      subsectionKo: '해시태그 가이드라인',
      subsubsection: '',
      pageNumber: 2,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['hashtag_generation', 'social_media', 'youtube'],
      specificityLevel: 'guideline',
      relatedSections: ['channel_playbook'],
      applicableChannels: ['youtube', 'instagram', 'twitter'],
      campaignPhases: ['always_on', 'launch', 'sustain'],
      contentFormat: 'hashtag',
      priorityLevel: 'critical',
      keywords: ['hashtag', 'order', 'GalaxyAI', 'Samsung', 'capitalization'],
      toneMarkers: ['brand_consistent'],
    },
  },
  {
    id: 'geo_style_content_types',
    content: `Samsung Content Type Templates:

INTRO CONTENT:
- Opening: "This is the official introduction video for [Product Name]."
- Structure: Opening → Timestamps → Q&A → Hashtags
- Characteristics: Feature-focused, comprehensive

UNBOXING CONTENT:
- Opening: "Unbox the [all-new] [Product Name] and discover what's inside."
- Structure: Opening → Timestamps → "What's new" list → Q&A
- Characteristics: Box contents, first impressions

HOW-TO CONTENT:
- Opening: "This is the official video guide on how to use [Feature] on [Product]."
- Structure: Opening → "Follow steps" → Q&A → Hashtags
- Characteristics: Step-by-step instructions

SHORTS CONTENT:
- Opening: [No opener - start with hook directly]
- Structure: Hook only (1-2 sentences) + minimal hashtags
- Characteristics: 9:16 format, brief, under 200 characters

TEASER CONTENT:
- Opening: "Something [big/new/exciting] is coming..."
- Structure: Minimal, mystery-focused
- Characteristics: 15-30 seconds, hook only

OFFICIAL REPLAY:
- Structure: Event context → Timestamps → Hashtags
- Characteristics: Long-form, comprehensive`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 3,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Content Type Templates',
      subsectionKo: '콘텐츠 유형별 템플릿',
      subsubsection: '',
      pageNumber: 2,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['content_type', 'intro', 'unboxing', 'how_to', 'shorts', 'teaser'],
      specificityLevel: 'template',
      relatedSections: ['channel_playbook', 'tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['launch', 'sustain', 'always_on'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['intro', 'unboxing', 'how-to', 'shorts', 'teaser', 'replay', 'content type'],
      toneMarkers: ['professional', 'engaging'],
    },
  },
  {
    id: 'geo_style_placement_distinction',
    content: `Samsung Video Format Distinction:

FEED (16:9) - Standard Format:
- Aspect Ratio: 16:9 (landscape)
- Description Length: Full (500-1500 characters)
- Structure: Complete structure with all sections
  - Opening statement
  - Feature description
  - Learn more CTA with vanity link
  - Timestamps
  - Q&A section (2-4 pairs)
  - Hashtags (3-5)
  - Disclaimer (if needed, after hashtags)

SHORTS (9:16) - Vertical Format:
- Aspect Ratio: 9:16 (portrait)
- Description Length: Brief (100-200 characters)
- Structure: Minimal
  - Hook only (1-2 sentences)
  - No timestamps
  - No Q&A
  - 1-2 hashtags only: #GalaxyAI #Samsung
  - Total length: Under 200 characters`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 4,
      totalChunks: 25,
      section: 'channel_playbook',
      sectionKo: '채널별 운영 가이드',
      subsection: 'Video Format Guidelines',
      subsectionKo: '영상 형식 가이드라인',
      subsubsection: '',
      pageNumber: 3,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'channel_guidance',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: false,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['video_format', 'feed', 'shorts', 'aspect_ratio'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'description',
      priorityLevel: 'important',
      keywords: ['feed', 'shorts', '16:9', '9:16', 'aspect ratio', 'video format'],
      toneMarkers: ['professional'],
    },
  },
  {
    id: 'geo_style_samsung_conventions',
    content: `Samsung Writing Conventions (Corrections):

CORRECT vs INCORRECT:
| Element | CORRECT | INCORRECT |
|---------|---------|-----------|
| Q&A format | Q: and A: | Q. and A. |
| Unit spacing | 76.1 Wh | 76.1Wh |
| Articles | the all-new | All new |
| Product names | Buds | buds |
| Disclaimer position | After hashtags | Before hashtags |

APPROVED EMOJIS (Limited to 1-3 per description):
📦 🌟 ✨ 🔍 ⌨️ 🚀 🎨 🎬 🤖 🖊️

VANITY LINK FORMAT:
http://smsng.co/[ProductCode]_[VideoType]_yt

Examples:
- GalaxyBook5Pro_Intro_yt
- ZFlip7_How-to_yt
- S25_Unboxing_yt`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 5,
      totalChunks: 25,
      section: 'tone_voice',
      sectionKo: '톤앤매너 가이드',
      subsection: 'Samsung Writing Conventions',
      subsectionKo: '삼성 작성 규칙',
      subsubsection: '',
      pageNumber: 3,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'table',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'tone_guidance',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: false,
      hasTables: true,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['writing_style', 'conventions', 'emojis', 'vanity_link'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'critical',
      keywords: ['conventions', 'emoji', 'vanity link', 'spacing', 'capitalization'],
      toneMarkers: ['brand_consistent', 'professional'],
    },
  },
  // ===== PART 2: OPENING PATTERNS BY CONTENT TYPE =====
  {
    id: 'geo_opener_intro',
    content: `Samsung Opening Pattern - INTRO Content:

PRIMARY PATTERN:
"This is the official introduction video for [Product Name]."

ALTERNATIVE PATTERN:
"Introducing the [all-new] [Product Name]."

EXAMPLES:
- "This is the official introduction video for Galaxy S25 Ultra."
- "Introducing the all-new Galaxy Book5 Pro with Galaxy AI."
- "This is the official introduction video for Galaxy Ring."

STRUCTURE AFTER OPENER:
1. Feature paragraph (3-4 sentences highlighting key features)
2. Learn more CTA with vanity link
3. Timestamps
4. Q&A section (2-3 pairs)
5. Hashtags (#GalaxyAI first, #Samsung last)`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 6,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Opening Patterns - Intro',
      subsectionKo: '오프닝 패턴 - 인트로',
      subsubsection: '',
      pageNumber: 4,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['opener', 'intro', 'introduction', 'youtube_description'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['launch'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['intro', 'introduction', 'opening', 'official video'],
      toneMarkers: ['professional', 'confident'],
    },
  },
  {
    id: 'geo_opener_howto',
    content: `Samsung Opening Pattern - HOW-TO Content:

PRIMARY PATTERN:
"This is the official video guide on how to use [Feature] on [Product]."

ALTERNATIVE PATTERN:
"Learn how to [action] with [Product]."

EXAMPLES:
- "This is the official video guide on how to use AI Select on Galaxy Book."
- "Learn how to customize your Galaxy Watch face with Galaxy Wearable app."
- "This is the official video guide on how to set up Circle to Search on Galaxy S25."

STRUCTURE AFTER OPENER:
1. Brief intro sentence about the feature benefit
2. Learn more CTA
3. Timestamps
4. "Follow these simple steps to use [Feature]:"
   - Step 1: [Instruction]
   - Step 2: [Instruction]
   - Step 3: [Instruction]
5. Q&A section (2-3 pairs)
6. Hashtags
7. *Disclaimer if needed`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 7,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Opening Patterns - How-to',
      subsectionKo: '오프닝 패턴 - 사용법',
      subsubsection: '',
      pageNumber: 4,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['opener', 'how_to', 'tutorial', 'guide', 'youtube_description'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['sustain', 'always_on'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['how-to', 'guide', 'tutorial', 'steps', 'learn how'],
      toneMarkers: ['instructional', 'helpful', 'clear'],
    },
  },
  {
    id: 'geo_opener_unboxing',
    content: `Samsung Opening Pattern - UNBOXING Content:

PRIMARY PATTERN:
"Unbox the [all-new] [Product Name] and discover what's inside."

ALTERNATIVE PATTERN:
"See what's inside the [Product Name] box."

EXAMPLES:
- "Unbox the all-new Galaxy S25 Ultra and discover what's inside."
- "See what's inside the Galaxy Watch Ultra box."
- "Unbox the Galaxy Buds3 Pro and discover what's inside."

STRUCTURE AFTER OPENER:
1. Feature highlights
2. Timestamps
3. "What's new in [Product]?"
   1. [Feature]: [Description]
   2. [Feature]: [Description]
   3. [Feature]: [Description]
4. Q&A section
5. Hashtags`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 8,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Opening Patterns - Unboxing',
      subsectionKo: '오프닝 패턴 - 언박싱',
      subsubsection: '',
      pageNumber: 5,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['opener', 'unboxing', 'whats_new', 'youtube_description'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['launch'],
      contentFormat: 'description',
      priorityLevel: 'important',
      keywords: ['unboxing', 'whats inside', 'whats new', 'box contents'],
      toneMarkers: ['exciting', 'engaging'],
    },
  },
  {
    id: 'geo_opener_shorts',
    content: `Samsung Opening Pattern - SHORTS Content:

PATTERN:
[No opener - start with hook directly]

CHARACTERISTICS:
- Start immediately with the most engaging point
- Maximum 1-2 sentences
- Under 200 characters total
- Focus on single feature or benefit

EXAMPLES:
- "Circle anything on your screen to search instantly with Galaxy AI. 🔍"
- "Galaxy Watch Ultra: Built for the extreme. 🚀"
- "AI-powered noise cancellation that adapts to your environment."

STRUCTURE:
1. Hook (1-2 sentences)
2. 1-2 hashtags only: #GalaxyAI #Samsung

DO NOT INCLUDE:
- Timestamps
- Q&A sections
- Learn more links
- Multiple paragraphs`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 9,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Opening Patterns - Shorts',
      subsectionKo: '오프닝 패턴 - 쇼츠',
      subsubsection: '',
      pageNumber: 5,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['opener', 'shorts', 'hook', 'youtube_shorts'],
      specificityLevel: 'template',
      relatedSections: ['channel_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'description',
      priorityLevel: 'important',
      keywords: ['shorts', 'hook', 'brief', '9:16', 'vertical'],
      toneMarkers: ['punchy', 'engaging', 'concise'],
    },
  },
  {
    id: 'geo_opener_teaser',
    content: `Samsung Opening Pattern - TEASER Content:

PATTERN:
"Something [big/new/exciting] is coming..."

ALTERNATIVE PATTERNS:
- "Get ready for [event/product]."
- "The future of [category] arrives [date]."
- "Stay tuned for the next chapter."

EXAMPLES:
- "Something big is coming. January 22, 2025."
- "Get ready for Galaxy Unpacked."
- "The future of AI is arriving. #GalaxyAI"

CHARACTERISTICS:
- Minimal content, mystery-focused
- 15-30 seconds video duration
- Hook only structure
- Create anticipation without revealing details

STRUCTURE:
1. Mystery hook (1 sentence)
2. Date or event hint (optional)
3. Hashtags (minimal)`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 10,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Opening Patterns - Teaser',
      subsectionKo: '오프닝 패턴 - 티저',
      subsubsection: '',
      pageNumber: 6,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['opener', 'teaser', 'mystery', 'announcement'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube', 'instagram'],
      campaignPhases: ['teaser'],
      contentFormat: 'description',
      priorityLevel: 'important',
      keywords: ['teaser', 'coming soon', 'announcement', 'mystery'],
      toneMarkers: ['mysterious', 'exciting', 'anticipatory'],
    },
  },
  // ===== PART 3: PRODUCT CATEGORIES =====
  {
    id: 'geo_categories_products',
    content: `Samsung Product Categories for GEO Tool:

EXISTING CATEGORIES:
- Smartphones (Galaxy S, Galaxy Z, Galaxy A)
- Watches (Galaxy Watch, Galaxy Watch Ultra)
- Tablets (Galaxy Tab)
- Earbuds (Galaxy Buds)
- Laptops (Galaxy Book)
- VR (Samsung XR)

NEW CATEGORIES TO ADD:
- ESG/Sustainability - Environmental and sustainability content
- Documentary/Film - Documentary films and brand stories
- Campaign/Brand - Brand campaigns and marketing initiatives
- Accessories - Cases, chargers, and other accessories
- Event - Galaxy Unpacked, announcements, live events

CATEGORY-SPECIFIC HANDLING:
- Product categories: Full USP extraction and feature focus
- ESG/Documentary/Campaign: Skip USP extraction, focus on message and story
- Event: Focus on timestamps and key moments`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 11,
      totalChunks: 25,
      section: 'content_strategy',
      sectionKo: '콘텐츠 전략 프레임',
      subsection: 'Product Categories',
      subsectionKo: '제품 카테고리',
      subsubsection: '',
      pageNumber: 6,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'bullet_points',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_strategy',
      targetPersonas: ['content_creator', 'marketing_team', 'product_manager'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['category', 'product', 'classification'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'important',
      keywords: ['category', 'product', 'ESG', 'documentary', 'campaign', 'event'],
      toneMarkers: ['organized', 'systematic'],
    },
  },
  // ===== PART 4: SAMSUNG FEEDBACK REQUIREMENTS =====
  {
    id: 'geo_requirements_hashtag_method',
    content: `Samsung Requirement: Hashtag Generation Method

CURRENT STATE (Problem):
- AI auto-generates hashtags
- Inconsistent ordering
- Variable count (5-8 hashtags)

SAMSUNG REQUEST:
- Pre-defined hashtag insertion (not AI-generated)
- User provides fixed hashtags for campaigns
- AI generation only as reference/fallback

IMPLEMENTATION:
┌─────────────────────────────────────────┐
│ Hashtag Settings                        │
├─────────────────────────────────────────┤
│ ○ Use Fixed Hashtags (Recommended)      │
│   [#GalaxyAI #GalaxyS25 #Samsung    ]   │
│                                         │
│ ○ AI Auto-Generate (Reference only)     │
└─────────────────────────────────────────┘

When Fixed Hashtags are provided:
- Use exactly as provided
- Maintain user-specified order
- Skip AI hashtag generation stage`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 12,
      totalChunks: 25,
      section: 'ai_content_guide',
      sectionKo: 'AI 콘텐츠 가이드',
      subsection: 'Hashtag Generation Method',
      subsectionKo: '해시태그 생성 방식',
      subsubsection: '',
      pageNumber: 7,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'ai_guidance',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['hashtag', 'fixed_hashtags', 'user_input'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube', 'instagram'],
      campaignPhases: ['always_on'],
      contentFormat: 'hashtag',
      priorityLevel: 'important',
      keywords: ['fixed hashtags', 'pre-defined', 'user input', 'campaign hashtags'],
      toneMarkers: ['systematic'],
    },
  },
  {
    id: 'geo_requirements_input_method',
    content: `Samsung Requirement: Data Input Process

CURRENT STATE (Problem):
- YouTube URL only → SRT auto-extraction
- No option for direct content input

SAMSUNG REQUEST:
- Multiple input methods
- Direct SRT file/text input option

IMPLEMENTATION:
Input Method Selection:
┌──────────────┬──────────────┬──────────────┐
│  YouTube URL │  SRT Upload  │  Text Input  │
└──────────────┴──────────────┴──────────────┘

1. YouTube URL (existing):
   - Auto-extract transcript from YouTube
   - Works with public videos

2. SRT Upload (new):
   - Accept .srt files
   - Parse and extract text content
   - Support multiple languages

3. Text Input (new):
   - Direct paste transcript text
   - Manual input for any content
   - Useful for unpublished videos`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 13,
      totalChunks: 25,
      section: 'production_process',
      sectionKo: '콘텐츠 제작 프로세스',
      subsection: 'Input Methods',
      subsectionKo: '입력 방식',
      subsubsection: '',
      pageNumber: 7,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'process_workflow',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: false,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['input_method', 'srt', 'transcript', 'youtube'],
      specificityLevel: 'guideline',
      relatedSections: ['production_process'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'important',
      keywords: ['input', 'SRT', 'transcript', 'upload', 'text input'],
      toneMarkers: ['systematic', 'flexible'],
    },
  },
  // ===== PART 5: PROMPT GAPS AND FIXES =====
  {
    id: 'geo_gaps_description',
    content: `Description Stage Prompt Gaps:

| Current Prompt Says | Samsung Actually Uses | Gap Type |
|---------------------|----------------------|----------|
| No opener template | "This is the official..." | Missing pattern |
| Generic CTA | "Learn more: smsng.co/..." | Missing vanity link |
| No emoji guidance | 1-3 approved emojis | Missing constraint |
| "5-8 strategic hashtags" | 3-5 hashtags, specific order | Wrong count/order |

FIXES REQUIRED:
1. Add opener templates by content type
2. Implement vanity link format: http://smsng.co/[ProductCode]_[VideoType]_yt
3. Add emoji constraints (max 3, from approved list)
4. Change hashtag count to 3-5
5. Enforce hashtag order (#GalaxyAI first, #Samsung last)`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 14,
      totalChunks: 25,
      section: 'ai_content_guide',
      sectionKo: 'AI 콘텐츠 가이드',
      subsection: 'Description Stage Gaps',
      subsectionKo: '설명문 단계 개선점',
      subsubsection: '',
      pageNumber: 8,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'table',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'failure_prevention',
      targetPersonas: ['developer', 'content_creator'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: true,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['prompt_fix', 'description', 'gaps'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['gap', 'fix', 'description', 'prompt', 'improvement'],
      toneMarkers: ['analytical', 'corrective'],
    },
  },
  {
    id: 'geo_gaps_faq',
    content: `FAQ Stage Prompt Gaps:

| Current Prompt Says | Samsung Actually Uses | Gap Type |
|---------------------|----------------------|----------|
| "Q:/A: format" | Q: and A: (colon only) | Wrong notation |
| "5-7 FAQ items" | 2-4 Q&A pairs typically | Too many specified |
| No length guidance | Q: 10-20 words, A: 50-100 | Missing constraint |

CRITICAL FIX:
Change from Q./A. to Q:/A: format

Search and replace all instances:
- "Q." → "Q:"
- "A." → "A:"

Add length constraints:
- Question: 10-20 words
- Answer: 50-100 words
- Total pairs: 2-4 maximum`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 15,
      totalChunks: 25,
      section: 'ai_content_guide',
      sectionKo: 'AI 콘텐츠 가이드',
      subsection: 'FAQ Stage Gaps',
      subsectionKo: 'FAQ 단계 개선점',
      subsubsection: '',
      pageNumber: 8,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'table',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'failure_prevention',
      targetPersonas: ['developer', 'content_creator'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: true,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['prompt_fix', 'faq', 'qa_format', 'gaps'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'faq',
      priorityLevel: 'critical',
      keywords: ['FAQ', 'Q&A', 'colon', 'format', 'length', 'fix'],
      toneMarkers: ['analytical', 'corrective'],
    },
  },
  {
    id: 'geo_gaps_hashtag',
    content: `Hashtag Stage Prompt Gaps:

| Current Prompt Says | Samsung Actually Uses | Gap Type |
|---------------------|----------------------|----------|
| AI-generated hashtags | Pre-defined by campaign | Wrong approach |
| "#ProductName #Feature #Category #Brand" | #GalaxyAI first, #Samsung last | Wrong order |
| 5-8 hashtags | 3-5 hashtags | Wrong count |

CRITICAL FIXES:
1. Change default to "Use Fixed Hashtags" (user-provided)
2. AI generation only as fallback/reference
3. Enforce correct order: #GalaxyAI → #Product → #Series → #Samsung
4. Limit to 3-5 hashtags maximum

CORRECT ORDER TEMPLATE:
1. #GalaxyAI (if AI features present, ALWAYS FIRST)
2. #[ProductName] (e.g., #GalaxyZFlip7)
3. #[ProductSeries] (e.g., #GalaxyZ)
4. #Samsung (ALWAYS LAST)`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 16,
      totalChunks: 25,
      section: 'ai_content_guide',
      sectionKo: 'AI 콘텐츠 가이드',
      subsection: 'Hashtag Stage Gaps',
      subsectionKo: '해시태그 단계 개선점',
      subsubsection: '',
      pageNumber: 9,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'table',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'failure_prevention',
      targetPersonas: ['developer', 'content_creator'],
      hasExamples: false,
      hasTemplates: true,
      hasTables: true,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['prompt_fix', 'hashtag', 'order', 'gaps'],
      specificityLevel: 'guideline',
      relatedSections: ['content_type_playbook'],
      applicableChannels: ['youtube', 'instagram'],
      campaignPhases: ['always_on'],
      contentFormat: 'hashtag',
      priorityLevel: 'critical',
      keywords: ['hashtag', 'order', 'count', 'fix', 'GalaxyAI', 'Samsung'],
      toneMarkers: ['analytical', 'corrective'],
    },
  },
  // ===== PART 6: COMPLETE STRUCTURE TEMPLATES =====
  {
    id: 'geo_template_intro_full',
    content: `COMPLETE INTRO CONTENT TEMPLATE:

This is the official introduction video for [Product Name].

[Feature paragraph: 3-4 sentences describing key features and benefits. Include 1-2 approved emojis if appropriate.]

Learn more: http://smsng.co/[ProductCode]_Intro_yt

TIMESTAMPS:
00:00 Intro
00:15 [Key Feature 1]
00:45 [Key Feature 2]
01:20 [Key Feature 3]
02:00 Conclusion

Q: What makes [Product] stand out from previous models?
A: [50-100 word answer highlighting 2-3 key improvements and their user benefits.]

Q: How does [Key Feature] work on [Product]?
A: [50-100 word answer explaining the feature and practical use cases.]

#GalaxyAI #[ProductName] #[Series] #Samsung

*Features may vary by region and device. Galaxy AI features require Samsung account login.`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 17,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Complete Template - Intro',
      subsectionKo: '완성 템플릿 - 인트로',
      subsubsection: '',
      pageNumber: 9,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['complete_template', 'intro', 'youtube_description'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['launch'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['template', 'intro', 'complete', 'structure', 'full'],
      toneMarkers: ['professional', 'comprehensive'],
    },
  },
  {
    id: 'geo_template_howto_full',
    content: `COMPLETE HOW-TO CONTENT TEMPLATE:

This is the official video guide on how to use [Feature] on [Product].

[Brief intro: 1-2 sentences about what users will learn and the benefit.]

Learn more: http://smsng.co/[ProductCode]_How-to_yt

TIMESTAMPS:
00:00 Introduction
00:10 What is [Feature]
00:30 Step-by-step guide
01:30 Tips and tricks
02:00 Summary

Follow these simple steps to use [Feature]:
Step 1: [Clear instruction]
Step 2: [Clear instruction]
Step 3: [Clear instruction]
Step 4: [Clear instruction] (if needed)

Q: Can I use [Feature] on all Galaxy devices?
A: [50-100 word answer about device compatibility and requirements.]

Q: What are the best use cases for [Feature]?
A: [50-100 word answer with practical examples.]

#GalaxyAI #[ProductName] #[Series] #Samsung

*Feature availability may vary by region and device model.`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 18,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Complete Template - How-to',
      subsectionKo: '완성 템플릿 - 사용법',
      subsubsection: '',
      pageNumber: 10,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['complete_template', 'how_to', 'tutorial', 'youtube_description'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['sustain', 'always_on'],
      contentFormat: 'description',
      priorityLevel: 'critical',
      keywords: ['template', 'how-to', 'complete', 'steps', 'tutorial'],
      toneMarkers: ['instructional', 'helpful'],
    },
  },
  {
    id: 'geo_template_unboxing_full',
    content: `COMPLETE UNBOXING CONTENT TEMPLATE:

Unbox the all-new [Product Name] and discover what's inside. 📦

[Feature highlight: 2-3 sentences about what makes this product special.]

Learn more: http://smsng.co/[ProductCode]_Unboxing_yt

TIMESTAMPS:
00:00 Box overview
00:20 What's inside
00:45 First look at [Product]
01:30 Key features
02:30 Final thoughts

What's new in [Product]?
1. [Feature 1]: [Brief description of benefit]
2. [Feature 2]: [Brief description of benefit]
3. [Feature 3]: [Brief description of benefit]
4. [Feature 4]: [Brief description of benefit]

Q: What accessories come in the box?
A: [50-100 word answer listing box contents and any notable inclusions or exclusions.]

Q: How does [Product] compare to the previous generation?
A: [50-100 word answer highlighting key upgrades and improvements.]

#GalaxyAI #[ProductName] #[Series] #Samsung`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 19,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Complete Template - Unboxing',
      subsectionKo: '완성 템플릿 - 언박싱',
      subsubsection: '',
      pageNumber: 10,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['complete_template', 'unboxing', 'whats_new', 'youtube_description'],
      specificityLevel: 'template',
      relatedSections: ['tone_voice'],
      applicableChannels: ['youtube'],
      campaignPhases: ['launch'],
      contentFormat: 'description',
      priorityLevel: 'important',
      keywords: ['template', 'unboxing', 'complete', 'whats inside', 'box contents'],
      toneMarkers: ['exciting', 'engaging'],
    },
  },
  {
    id: 'geo_template_shorts_full',
    content: `COMPLETE SHORTS CONTENT TEMPLATE:

[Hook: Single punchy sentence about the feature or benefit. Maximum 100 characters.]

#GalaxyAI #Samsung

---

EXAMPLES:

Example 1 (Galaxy AI feature):
Circle anything to search instantly with Galaxy AI. 🔍
#GalaxyAI #Samsung

Example 2 (Product feature):
Galaxy Watch Ultra: 100m water resistance meets premium design.
#GalaxyWatchUltra #Samsung

Example 3 (Quick tip):
Double-tap the back of your Galaxy to open any app. ⚡
#GalaxyAI #GalaxyS25 #Samsung

---

RULES:
- Total length: Under 200 characters
- No timestamps
- No Q&A
- No learn more links
- 1-2 hashtags maximum
- Start with action verb or product name
- One emoji maximum (optional)`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 20,
      totalChunks: 25,
      section: 'content_type_playbook',
      sectionKo: '콘텐츠 유형별 가이드',
      subsection: 'Complete Template - Shorts',
      subsectionKo: '완성 템플릿 - 쇼츠',
      subsubsection: '',
      pageNumber: 11,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'text',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'content_template',
      targetPersonas: ['content_creator', 'marketing_team'],
      hasExamples: true,
      hasTemplates: true,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: false,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['complete_template', 'shorts', 'hook', 'youtube_shorts'],
      specificityLevel: 'template',
      relatedSections: ['channel_playbook'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'description',
      priorityLevel: 'important',
      keywords: ['template', 'shorts', 'complete', 'brief', 'hook'],
      toneMarkers: ['punchy', 'concise'],
    },
  },
  // ===== PART 7: PRIORITY TASKS =====
  {
    id: 'geo_priority_p0_tasks',
    content: `P0 CRITICAL TASKS (Immediate Fix Required):

TASK P0-1: Fix Q&A Format in Prompts
- File: src/lib/tuning/prompt-loader.ts
- Current: "Q:/A: format" or "Q./A." appearing
- Change to: Q: and A: (colon only, no period)
- Validation: Search all files for "Q." and "A." patterns
- Impact: High - Brand inconsistency

TASK P0-2: Fix Hashtag Order in Prompts
- File: src/lib/tuning/prompt-loader.ts
- Current: "#ProductName #KeyFeature #Category #Brand"
- Change to: "#GalaxyAI #[ProductName] #[Series] #Samsung"
- Order: GalaxyAI first (if applicable), Samsung last
- Count: 3-5 hashtags only (not 5-8)
- Impact: High - Brand compliance

These P0 tasks require NO UI changes - only prompt text updates.`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 21,
      totalChunks: 25,
      section: 'production_process',
      sectionKo: '콘텐츠 제작 프로세스',
      subsection: 'P0 Critical Tasks',
      subsectionKo: 'P0 긴급 작업',
      subsubsection: '',
      pageNumber: 11,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'bullet_points',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'process_workflow',
      targetPersonas: ['developer'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: true,
      hasDoRules: true,
      useCaseTags: ['implementation', 'priority', 'p0', 'critical'],
      specificityLevel: 'checklist',
      relatedSections: ['ai_content_guide'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'critical',
      keywords: ['P0', 'critical', 'fix', 'Q&A', 'hashtag', 'urgent'],
      toneMarkers: ['urgent', 'actionable'],
    },
  },
  {
    id: 'geo_priority_p1_tasks',
    content: `P1 HIGH PRIORITY TASKS:

TASK P1-1: Add Content Type Selector UI
- Files: src/types/geo-v2.ts, src/store/generation-store.ts, product-selector.tsx
- Add ContentType enum: intro, unboxing, how_to, shorts, teaser, brand, esg, documentary
- Add UI selector (radio/select component)
- Impact: High - Enables content-specific templates

TASK P1-2: Add Fixed Hashtags Input Field
- Files: src/store/generation-store.ts, keywords-section.tsx
- Add fixedHashtags state and UI component
- Toggle between "Fixed Hashtags" and "AI Generate"
- Impact: High - Addresses Samsung's hashtag requirement

TASK P1-3: Add Samsung Opener Patterns to Prompts
- File: src/lib/tuning/prompt-loader.ts
- Add content-type-specific opening patterns
- "This is the official..." for Intro
- "This is the official video guide..." for How-to
- Impact: Medium - Improves output quality

TASK P1-4: Update Prompts with Content Type Branching
- File: src/lib/tuning/prompt-loader.ts
- Modify composeStagePrompt to accept contentType parameter
- Return content-type-specific templates
- Impact: High - Core feature enablement`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 22,
      totalChunks: 25,
      section: 'production_process',
      sectionKo: '콘텐츠 제작 프로세스',
      subsection: 'P1 High Priority Tasks',
      subsectionKo: 'P1 우선순위 작업',
      subsubsection: '',
      pageNumber: 12,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'bullet_points',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'process_workflow',
      targetPersonas: ['developer'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['implementation', 'priority', 'p1', 'feature'],
      specificityLevel: 'checklist',
      relatedSections: ['ai_content_guide'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'important',
      keywords: ['P1', 'priority', 'content type', 'hashtags', 'opener'],
      toneMarkers: ['actionable', 'systematic'],
    },
  },
  {
    id: 'geo_priority_p2_p3_tasks',
    content: `P2 MEDIUM PRIORITY TASKS:

TASK P2-1: Add Video Format Selector
- Add VideoFormat type: feed_16x9, shorts_9x16
- Add toggle UI between Feed and Shorts
- Apply format-specific constraints to output

TASK P2-2: Add SRT/Text Direct Input Option
- Add InputMethod type: youtube_url, srt_upload, text_input
- Add tab-based selector UI
- Implement SRT parser utility

TASK P2-3: Add Step-by-Step Template for How-to
- Ensure how_to template includes step format
- "Follow these simple steps to use [Feature]:"

---

P3 LOWER PRIORITY TASKS:

TASK P3-1: Add ESG/Documentary Categories
- Add to product categories: ESG, Documentary, Campaign
- Skip USP extraction for non-product categories

TASK P3-2: Add Vanity Link Code Generator
- Add vanityLinkCode input field
- Format: http://smsng.co/[ProductCode]_[VideoType]_yt
- Auto-generate CTA with vanity link`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 23,
      totalChunks: 25,
      section: 'production_process',
      sectionKo: '콘텐츠 제작 프로세스',
      subsection: 'P2-P3 Tasks',
      subsectionKo: 'P2-P3 작업',
      subsubsection: '',
      pageNumber: 12,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'bullet_points',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'process_workflow',
      targetPersonas: ['developer'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['implementation', 'priority', 'p2', 'p3'],
      specificityLevel: 'checklist',
      relatedSections: ['ai_content_guide'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'reference',
      keywords: ['P2', 'P3', 'video format', 'SRT', 'ESG', 'vanity link'],
      toneMarkers: ['actionable', 'systematic'],
    },
  },
  // ===== PART 8: TESTING CHECKLIST =====
  {
    id: 'geo_testing_checklist',
    content: `GEO IMPLEMENTATION TESTING CHECKLIST:

P0 VERIFICATION:
□ Q&A output uses "Q:" and "A:" (not "Q." and "A.")
□ Hashtags start with #GalaxyAI (if AI features) and end with #Samsung
□ Hashtag count is 3-5 (not 5-8)

P1 VERIFICATION:
□ Content Type selector visible and functional
□ Content Type affects output structure
□ Fixed Hashtags field accepts and applies custom hashtags
□ Opener patterns match Samsung standard by content type
□ Intro uses "This is the official introduction video..."
□ How-to uses "This is the official video guide..."

P2 VERIFICATION:
□ Video Format toggle switches output length/structure
□ Shorts output is under 200 characters
□ Shorts output has no timestamps or Q&A
□ SRT upload parses correctly
□ Text input works as expected

P3 VERIFICATION:
□ ESG/Documentary categories available
□ Non-product categories skip USP extraction
□ Vanity link code generates correct format`,
    metadata: {
      documentId: 'geo_implementation_plan',
      chunkIndex: 24,
      totalChunks: 25,
      section: 'pre_publish_checklist',
      sectionKo: '발행 전 체크리스트',
      subsection: 'Testing Checklist',
      subsectionKo: '테스트 체크리스트',
      subsubsection: '',
      pageNumber: 13,
      sectionDepth: 2,
      productCategory: 'all',
      contentType: 'bullet_points',
      language: 'en',
      version: '2025.1',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'ingestion-script',
      contentPurpose: 'quality_checklist',
      targetPersonas: ['developer', 'qa_tester'],
      hasExamples: false,
      hasTemplates: false,
      hasTables: false,
      hasQuotes: false,
      hasChecklist: true,
      hasNoGoRules: false,
      hasDoRules: true,
      useCaseTags: ['testing', 'verification', 'checklist', 'qa'],
      specificityLevel: 'checklist',
      relatedSections: ['production_process'],
      applicableChannels: ['youtube'],
      campaignPhases: ['always_on'],
      contentFormat: 'body_copy',
      priorityLevel: 'important',
      keywords: ['testing', 'checklist', 'verification', 'QA', 'validation'],
      toneMarkers: ['systematic', 'thorough'],
    },
  },
]

async function main() {
  console.log('='.repeat(60))
  console.log('Samsung GEO Implementation Plan - Pinecone Ingestion')
  console.log('='.repeat(60))
  console.log()

  // Check for API key
  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY environment variable is not set')
    process.exit(1)
  }

  const pinecone = new Pinecone({ apiKey })
  const index = pinecone.index(PINECONE_INDEX_NAME)
  const namespace = index.namespace(PINECONE_NAMESPACE)

  // Step 1: Delete all existing vectors
  console.log('🗑️  Step 1: Clearing existing vectors...')
  try {
    await namespace.deleteAll()
    console.log('   ✅ Successfully deleted all vectors from namespace')
  } catch (error) {
    console.error('   ❌ Error deleting vectors:', error)
    // Continue even if delete fails (namespace might be empty)
  }

  // Wait a moment for deletion to propagate
  console.log('   ⏳ Waiting for deletion to propagate...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Step 2: Prepare records for upsert
  console.log()
  console.log('📝 Step 2: Preparing records for ingestion...')
  console.log(`   Total chunks: ${implementationPlanData.length}`)

  const records = implementationPlanData.map((chunk) => ({
    _id: chunk.id,
    content: chunk.content,
    ...chunk.metadata,
  }))

  // Step 3: Upsert records in batches
  console.log()
  console.log('⬆️  Step 3: Upserting records to Pinecone...')

  const batchSize = 10
  let totalUpserted = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    try {
      await namespace.upsertRecords(batch)
      totalUpserted += batch.length
      console.log(`   ✅ Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} (${totalUpserted}/${records.length} records)`)
    } catch (error) {
      console.error(`   ❌ Error upserting batch:`, error)
    }
  }

  // Step 4: Verify
  console.log()
  console.log('🔍 Step 4: Verifying ingestion...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  try {
    const stats = await index.describeIndexStats()
    const namespaceStats = stats.namespaces?.[PINECONE_NAMESPACE]
    console.log(`   Namespace: ${PINECONE_NAMESPACE}`)
    console.log(`   Vector count: ${namespaceStats?.recordCount || 'N/A'}`)
  } catch (error) {
    console.log('   ⚠️ Could not retrieve stats (this is normal for new indexes)')
  }

  console.log()
  console.log('='.repeat(60))
  console.log('✅ Ingestion Complete!')
  console.log('='.repeat(60))
  console.log()
  console.log('Summary:')
  console.log(`   - Index: ${PINECONE_INDEX_NAME}`)
  console.log(`   - Namespace: ${PINECONE_NAMESPACE}`)
  console.log(`   - Records upserted: ${totalUpserted}`)
  console.log()
  console.log('Content includes:')
  console.log('   - Samsung writing style patterns')
  console.log('   - Q&A format guidelines (Q: and A: with colon)')
  console.log('   - Hashtag order rules (#GalaxyAI first, #Samsung last)')
  console.log('   - Content type templates (Intro, How-to, Unboxing, Shorts, Teaser)')
  console.log('   - Video format guidelines (Feed 16:9 vs Shorts 9:16)')
  console.log('   - Complete structure templates')
  console.log('   - Implementation priority tasks (P0, P1, P2, P3)')
  console.log('   - Testing checklist')
  console.log()
}

main().catch(console.error)
