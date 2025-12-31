# AEO/GEO Prompts & System Documentation

> **Samsung Content GEO/AEO Optimizer**
> **Generated**: 2026-01-01
> **Purpose**: Complete documentation of all Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) prompts

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concepts](#2-core-concepts)
3. [YouTube Analysis Prompts](#3-youtube-analysis-prompts)
   - [Stage 1: Description Generation](#stage-1-description-generation)
   - [Stage 1.5: USP Extraction](#stage-15-usp-extraction)
   - [Stage 2: Timestamp Chapters](#stage-2-timestamp-chapters)
   - [Stage 3: FAQ Generation](#stage-3-faq-generation)
   - [Stage 4: Step-by-Step](#stage-4-step-by-step)
   - [Stage 5: Keywords Extraction](#stage-5-keywords-extraction)
   - [Stage 6: Hashtag Generation](#stage-6-hashtag-generation)
   - [Stage 7: Final Description Assembly](#stage-7-final-description-assembly)
4. [Image Analysis Prompts](#4-image-analysis-prompts)
   - [Vision Analysis](#vision-analysis)
   - [Alt Text & Description Generation](#alt-text--description-generation)
5. [Scoring System](#5-scoring-system)
   - [GEO/AEO Score Calculation](#geoaeo-score-calculation)
   - [Keyword Analyzer](#keyword-analyzer)
   - [Grounding Quality Scorer](#grounding-quality-scorer)
6. [Schema Markup](#6-schema-markup)
7. [Grounding Strategy](#7-grounding-strategy)

---

## 1. Overview

### What is GEO/AEO?

**GEO (Generative Engine Optimization)**: Optimizing content for AI-powered search engines and generative AI systems (ChatGPT, Claude, Gemini, Perplexity) that generate answers from indexed content.

**AEO (Answer Engine Optimization)**: Optimizing content structure to be extracted and presented as direct answers in search results (Featured Snippets, AI Overviews).

### Core Philosophy

From the GEO strategy document:

> "GEO/AEO is still SEO. Fundamentally, not much has changed. Your potential customers are searching for things. When they're searching for your products or services, you want them to find you."

**Key Insight**: 76% of AI overview citations pull from Top 10 pages (Ahrefs data).

---

## 2. Core Concepts

### 2.1 GEO/AEO Principles

```yaml
Content_Structure:
  Chunking: "AI parses pages into small pieces, not top-to-bottom reading"
  Modular_Sections: "Each section should be independently identifiable (like Google's Passage Ranking)"

Organization_Methods:
  Lists_Tables: "Complex info should use lists and tables for clarity"
  Semantic_HTML: "Use heading hierarchy (H1, H2) and structured elements"
  Titles_Headers: "Maintain as primary ranking signals for AI systems"

Question_Answer:
  Direct_QA_Pairs: "AI assistants extract Q&A directly for responses"
  User_Intent: "Answer real user questions, not just SEO-optimized ones"

Semantic_Clarity:
  Avoid_Vague: "No 'innovative', 'eco-friendly' without measurable context"
  Measurable_Context: "Add facts and figures"
  Synonyms: "Use meaning-reinforcing synonyms"
  No_Decorative: "Remove meaningless decorative symbols"
```

### 2.2 Samsung Content Specifications

```yaml
YouTube_Description:
  First_130_Characters:
    Purpose: "GEO/AEO optimized core message"
    Structure: "[Product Name] + [Key Feature] + [User Benefit]"
    Example: "Introducing the all-new Galaxy Z Flip7. From pro-level 50 MP selfies to personalized briefings—experience pocket-perfect AI"

  Full_Description:
    Sections:
      - Opening: "First 130 characters"
      - Learn_More_CTA: "http://smsng.co/[Vanity_Link]"
      - Timestamps: "00:00 format chapter structure"
      - FAQ: "Q: / A: format, 4-7 items"
      - Step_by_Step: "If needed (How-to content)"
      - Hashtags: "#GalaxyAI #Product #Feature #Samsung"

Keyword_Strategy:
  Product_Specific:
    - Product names (Galaxy Z Flip7, Galaxy S25 Ultra)
    - Unique features (FlexWindow, ProVisual Engine, Audio Eraser)

  Generic_Competitive:
    - Industry terms (50 MP camera, AI-powered, foldable phone)
    - Score AI exposure with these keywords
```

---

## 3. YouTube Analysis Prompts

### Stage 1: Description Generation

**File**: `lib/gemini/prompts.ts` - `createDescriptionPrompt()`

**Purpose**: Generate YouTube description optimized for GEO/AEO with first 130 characters prioritized.

```typescript
export function createDescriptionPrompt(
  productName: string,
  videoTitle: string,
  srtTranscript: string,
  existingDescription?: string
): string {
  return `You are a GEO/AEO optimization expert for Samsung content.

CONTEXT:
- Product: ${productName}
- Video Title: ${videoTitle}
- Video Transcript: ${srtTranscript.substring(0, 3000)}...
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

OUTPUT FORMAT (JSON):
{
  "first_130": "exact first 130 characters",
  "full_description": "complete description without timestamps/FAQ/hashtags",
  "vanity_link": "suggested vanity link name (e.g., ZFlip7_Intro_yt)"
}`;
}
```

---

### Stage 1.5: USP Extraction

**File**: `lib/gemini/prompts.ts` - `createUSPPrompt()`

**Purpose**: Extract Unique Selling Points as foundation for all downstream content.

```typescript
export function createUSPPrompt(
  productName: string,
  description: string,
  transcript: string
): string {
  return `You are extracting unique selling points for ${productName}.

CONTENT PRIORITIZATION - 2-STAGE STRATEGY:

STAGE 1 - VIDEO CONTENT (Primary - HIGHEST PRIORITY):
Extract USPs DIRECTLY from video content (description and transcript):
1. Identify features explicitly mentioned or demonstrated in the video
2. Focus on what the video emphasizes and showcases
3. Extract specific examples, demonstrations, and use cases shown
4. Prioritize content that appears in both description AND transcript
5. Use the video's own language and framing

STAGE 2 - GROUNDING FALLBACK (Last Resort - LOWEST PRIORITY):
Use grounding ONLY if Stage 1 provides insufficient detail:
1. Supplement with specific ${productName} specifications from official sources
2. Validate that grounding content MATCHES video emphasis
3. DO NOT use grounding content that contradicts or diverges from video

GROUNDING QUERY GENERATION - MANDATORY EXECUTION PROTOCOL:

🔴 CRITICAL: You MUST EXECUTE ALL [REQUIRED] queries below.

📋 Generate 10-15 search queries for EACH USP extracted from video content:

QUERY TYPES per USP Feature (MANDATORY - use all 5 site types):
- Official: "${productName} [USP feature] specifications site:samsung.com" [REQUIRED]
- Community: "${productName} [USP feature] reddit OR site:reddit.com/r/samsung" [REQUIRED]
- Review Sites: "${productName} [USP feature] site:gsmarena.com OR site:techradar.com" [REQUIRED]
- Video Content: "${productName} [USP feature] site:youtube.com" [REQUIRED]
- Competitive: "${productName} [USP feature] vs [competitor]" [REQUIRED]

ANTI-MISMATCH RULES:
❌ DO NOT prioritize grounding over video content
❌ DO NOT include features not mentioned in video
❌ DO NOT let external content overshadow video emphasis
✅ Video content = Ground truth
✅ Grounding = Supplementary detail only

TASK:
Extract 2-8 unique selling points that differentiate ${productName}.

CRITICAL RULES:
✅ Focus on ${productName}'s own unique features (NO competitor comparison)
✅ Use measurable specifications (50 MP, 3.4-inch, etc.)
✅ Categorize USPs: Camera, Display, Performance, AI, Design, Battery, Security

CONFIDENCE LEVEL RULES:
✅ Video content-based USPs: ALWAYS set confidence: "high"
✅ Grounding-supplemented USPs: Set confidence: "high"
CRITICAL: There is NO "low" or "medium" confidence.

OUTPUT FORMAT (JSON):
{
  "usps": [
    {
      "feature": "50 MP FlexWindow selfies",
      "category": "Camera",
      "differentiation": "Uses rear camera for selfies via 3.4-inch cover display",
      "user_benefit": "Professional-quality selfies without opening the phone",
      "evidence": {
        "sources": ["Video content"] or ["https://samsung.com/..."],
        "quotes": ["50 MP main camera with FlexWindow preview mode"]
      },
      "confidence": "high"
    }
  ],
  "competitive_context": "Brief market positioning summary",
  "extraction_method": "grounded"
}`;
}
```

---

### Stage 2: Timestamp Chapters

**File**: `lib/gemini/prompts.ts` - `createChaptersPrompt()`

**Purpose**: Create GEO/AEO-optimized timestamp chapters for video navigation and search.

```typescript
export function createChaptersPrompt(
  srtContent: string,
  youtubeUrl: string,
  contentCategory: string
): string {
  return `You are creating GEO/AEO-optimized timestamp chapters for YouTube video navigation.

INPUT:
- SRT Transcript: ${srtContent.substring(0, 5000)}...
- Video URL: ${youtubeUrl}
- Video Purpose: ${contentCategory}

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
- "02:30 Really cool stuff" → Marketing fluff

OUTPUT FORMAT (JSON):
{
  "chapters": [
    {"time": "00:00", "title": "Intro"},
    {"time": "00:16", "title": "Design"},
    {"time": "00:33", "title": "50MP Camera"},
    ...
  ],
  "reasoning": "Brief explanation of chapter selection strategy"
}`;
}
```

---

### Stage 3: FAQ Generation

**File**: `lib/gemini/prompts.ts` - `createFAQPrompt()`

**Purpose**: Generate AEO-optimized FAQ using Query Fan-Out methodology.

```typescript
export function createFAQPrompt(
  productName: string,
  usps: Array<{feature: string, user_benefit: string}>,
  generatedDescription: string,
  srtTranscript: string
): string {
  const uspSummary = usps.map(u => `- ${u.feature}: ${u.user_benefit}`).join('\n');

  return `You are creating FAQ for Samsung product content optimized for Query Fan-Out.

INPUT:
- Product: ${productName}
- Description: ${generatedDescription}
- Transcript: ${srtTranscript.substring(0, 3000)}...

UNIQUE SELLING POINTS (from grounded research):
${uspSummary}

GROUNDING INSTRUCTION - MANDATORY FAQ QUERY EXECUTION PROTOCOL:

🔴 CRITICAL: You MUST EXECUTE ALL [REQUIRED] queries below.

📋 Generate 8-12 search queries based ONLY on USPs and features mentioned in the video.

QUERY GENERATION per USP/Feature from Video (MANDATORY - use all 5 site types):

1. **Official Specifications** [REQUIRED]:
   - "${productName} [USP feature] specifications site:samsung.com"
   - "${productName} [USP feature] technical details site:samsung.com"

2. **Community Discussions** [REQUIRED]:
   - "${productName} [USP feature] reddit OR site:reddit.com/r/samsung"

3. **Expert Reviews** [REQUIRED]:
   - "${productName} [USP feature] site:gsmarena.com OR site:techradar.com"

4. **Video Demonstrations** [REQUIRED]:
   - "${productName} [USP feature] site:youtube.com"

5. **Competitive Comparisons** [REQUIRED]:
   - "${productName} [USP feature] vs [competitor]"

TASK:
Generate 5-7 Q&A pairs optimized for AEO (Answer Engine Optimization) using Query Fan-Out methodology.

QUERY FAN-OUT STRATEGY:
AI systems generate multiple related subqueries from a single user question. Address these patterns:
1. Core feature question: How USPs solve user problems
2. Benefit/Use case question: Real-world applications of USPs
3. Implementation/How-to question: How to use USP features
4. Specification question: Technical details of USPs
5. Troubleshooting question: Common issues with USP features
6. Alternative question: When USPs provide advantage
7. Comparative question: How USPs differentiate from alternatives

RULES:
1. Questions MUST:
   - Be 10-15 words (conversational search pattern, not 2-3 words)
   - Start with How/What/Why/When/Where
   - Reflect real user intent with natural language
   - Cover different query fan-out angles
   - Be specific to product features or usage scenarios

2. Answers MUST:
   - Be direct and factual (passage-level complete)
   - Include measurable details (specs, numbers, percentages)
   - Avoid vague marketing language ("innovative", "eco-friendly")
   - Be semantically complete (answer works independently)
   - Be concise (2-4 sentences, 50-100 words)

3. Examples of good vs bad questions:
   ❌ Bad: "What is Galaxy Z Flip7's battery life?" (too short, 7 words)
   ✅ Good: "How long does the Galaxy Z Flip7 battery last with heavy social media use and video streaming throughout the day?" (18 words, conversational)

   ❌ Bad: "What are the camera features?" (vague, 5 words)
   ✅ Good: "What makes the Galaxy Z Flip7 camera better for selfies compared to traditional smartphones like iPhone 16?" (16 words, comparative)

CRITICAL: SCORING OPTIMIZATION (TARGET: 85+ points)

QUESTION PATTERNS (17-20 points target):
✅ ALL questions MUST start with How/What/Why/When/Where (5pts)
✅ Questions must be 10-20 words, conversational and natural (5pts)
✅ Answers must be 50-150 words, direct and factual (5pts)
✅ Generate exactly 5-7 FAQs covering different query fan-out angles (5pts)

OUTPUT FORMAT (JSON):
{
  "faqs": [
    {"question": "How does...", "answer": "The..."},
    ...
  ],
  "count": 5-7
}`;
}
```

---

### Stage 4: Step-by-Step

**File**: `lib/gemini/prompts.ts` - `createStepByStepPrompt()`

**Purpose**: Determine if step-by-step instructions are needed and generate them.

```typescript
export function createStepByStepPrompt(
  contentCategory: string,
  generatedDescription: string,
  srtTranscript: string
): string {
  return `You are determining if step-by-step instructions are needed for this video.

INPUT:
- Content Category: ${contentCategory}
- Description: ${generatedDescription}
- Transcript: ${srtTranscript.substring(0, 3000)}...

TASK:
1. Determine if step-by-step instructions would benefit users
2. If yes, create them in a clear, actionable format

CRITERIA FOR "YES" (needed = true):
- Video is How-to, Tutorial, or Guided Demo
- Feature requires specific sequence of actions
- User might struggle without guidance
- Video demonstrates a process or workflow

CRITERIA FOR "NO" (needed = false):
- Purely promotional (Intro films, product showcases)
- No actionable steps shown
- Too simple to require instructions
- Conceptual or informational only

OUTPUT FORMAT (JSON):
{
  "needed": true or false,
  "reasoning": "2-3 sentences explaining why step-by-step is or isn't needed",
  "steps": [
    "Step 1: Clear, actionable instruction.",
    "Step 2: Next action with specific details.",
    ...
  ]
}`;
}
```

---

### Stage 5: Keywords Extraction

**File**: `lib/gemini/prompts.ts` - `createKeywordsPrompt()`

**Purpose**: Extract and analyze keywords for GEO/AEO scoring.

```typescript
export function createKeywordsPrompt(
  finalDescription: string,
  faqs: string,
  productName: string
): string {
  return `You are extracting and analyzing keywords for GEO/AEO scoring.

INPUT:
- Description: ${finalDescription}
- FAQs: ${faqs}
- Product: ${productName}

TASK:
1. Extract keywords (product-specific and generic)
2. Categorize them
3. Provide scoring based on GEO/AEO criteria

CATEGORIES:
- Product-specific: Product names, unique features (e.g., Galaxy Z Flip7, FlexWindow, ProVisual Engine)
- Generic competitive: Industry terms (e.g., 50 MP camera, AI-powered, foldable phone)

SCORING CRITERIA (70 points total - AI exposure calculated separately):
1. Keyword density (20pts):
   - Product name in first 30 chars: 5pts
   - 3+ feature keywords: 5pts
   - Natural placement (no stuffing): 5pts
   - Synonym usage: 5pts

2. Question patterns (20pts):
   - How/What/Why/When/Where questions: 5pts
   - User intent reflected: 5pts
   - Direct, clear answers: 5pts
   - 4-7 FAQ count: 5pts

3. Sentence structure (15pts):
   - Chunkable content (modular sections): 5pts
   - Lists/tables/structured format: 5pts
   - Semantic clarity (no vague terms): 5pts

4. Length compliance (15pts):
   - First 130 chars optimized: 5pts
   - Description under 5000 chars: 5pts
   - Appropriate detail level: 5pts

OUTPUT FORMAT (JSON):
{
  "product_keywords": ["keyword1", "keyword2"],
  "generic_keywords": ["keyword1", "keyword2"],
  "density_score": 0-20,
  "question_score": 0-20,
  "structure_score": 0-15,
  "length_score": 0-15,
  "preliminary_total": 0-70
}`;
}
```

---

### Stage 6: Hashtag Generation

**File**: `lib/gemini/prompts.ts` - `createHashtagsPrompt()`

**Purpose**: Generate strategic hashtags for YouTube SEO optimization.

```typescript
export function createHashtagsPrompt(
  productName: string,
  description: string,
  usps: Array<{feature: string, category: string}>,
  keywords: { product_keywords: string[]; generic_keywords: string[] }
): string {
  return `You are generating strategic hashtags for YouTube SEO optimization.

INPUT:
- Product: ${productName}
- Description: ${description.substring(0, 500)}...
- Key Features: ${usps.map(u => u.feature).join(', ')}
- Product Keywords: ${keywords.product_keywords.join(', ')}
- Generic Keywords: ${keywords.generic_keywords.join(', ')}

TASK:
Generate 5-8 strategic hashtags optimized for YouTube discovery and SEO.

HASHTAG STRATEGY:

1. BRAND HASHTAGS (1-2 required):
   - Product name without spaces: #GalaxyZFlip7
   - Brand tags: #Samsung #GalaxyAI #WithGalaxy

2. FEATURE HASHTAGS (2-3 required):
   - From USP features and categories
   - Technical specifications (e.g., #50MPCamera #FlexWindow #FoldablePhone)
   - Key capabilities (e.g., #AICamera #ProVisualEngine)

3. INDUSTRY HASHTAGS (2-3 required):
   - Broader category terms for discovery
   - Trending tech hashtags
   - Use case hashtags (e.g., #MobilePhotography #TechReview #Smartphone)

FORMATTING RULES:
1. No spaces - use CamelCase for readability
2. Start with # symbol
3. Keep each hashtag under 20 characters
4. Total character count under 100
5. First 3 hashtags appear in YouTube search - prioritize discoverability

PRIORITIZATION:
- Position 1: Product name (most specific)
- Position 2-3: Key differentiating features
- Position 4-5: Category/industry terms
- Position 6-8: Trending/broad reach terms

FORBIDDEN:
❌ Generic tags like #tech #phone #new
❌ Overly long hashtags (>20 characters)
❌ Competitor brand names (iPhone, Pixel, etc.)

OUTPUT FORMAT (JSON):
{
  "hashtags": ["#GalaxyZFlip7", "#FlexWindow", "#FoldablePhone", ...],
  "categories": {
    "brand": ["#GalaxyZFlip7", "#Samsung", "#GalaxyAI"],
    "features": ["#FlexWindow", "#50MPCamera", "#FoldablePhone"],
    "industry": ["#MobilePhotography", "#TechReview", "#Smartphone"]
  },
  "reasoning": "Explanation of hashtag selection strategy"
}`;
}
```

---

### Stage 7: Final Description Assembly

**File**: `lib/gemini/prompts.ts` - `assembleFinalDescription()`

**Purpose**: Assemble complete YouTube description from all generated components.

```typescript
export function assembleFinalDescription(
  description: string,
  chapters: Array<{time: string, title: string}>,
  faqs: Array<{question: string, answer: string}>,
  hashtags: string[],
  vanityLink: string = 'http://smsng.co/galaxy'
): string {
  // Format chapters with timestamps
  const chaptersFormatted = chapters
    .map(ch => `${ch.time} ${ch.title}`)
    .join('\n');

  // Format Q&A (select top 3 most valuable for GEO/AEO)
  const qaFormatted = faqs
    .slice(0, 3)
    .map(faq => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join('\n\n');

  // Format hashtags (5-8 strategic tags for YouTube SEO)
  const hashtagsFormatted = hashtags.slice(0, 8).join(' ');

  // Assembly template optimized for GEO/AEO
  const finalDescription = `${description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ Timestamps:
${chaptersFormatted}

${hashtagsFormatted}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Q&A:
${qaFormatted}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Learn more: ${vanityLink}`;

  return finalDescription;
}
```

---

## 4. Image Analysis Prompts

### Vision Analysis

**File**: `lib/gemini/prompts.ts` - `createVisionPrompt()`

**Purpose**: Analyze image for Samsung marketing content.

```typescript
export function createVisionPrompt(marketingText?: string): string {
  return `You are analyzing an image for Samsung marketing content.

${marketingText ? `MARKETING TEXT CONTEXT:\n${marketingText}\n` : ''}

TASK:
Describe the image in detail for creating alt text and description.

FOCUS ON:
- Product shown (model, color, position)
- Visual elements (background, lighting, composition)
- Context (usage scenario, lifestyle setting)
- Text or graphics visible in image
- Key features being highlighted

OUTPUT FORMAT (JSON):
{
  "visual_description": "Detailed neutral description of what's in the image",
  "key_elements": ["element1", "element2", "element3", ...],
  "suggested_context": "How this relates to product messaging and target audience"
}`;
}
```

---

### Alt Text & Description Generation

**File**: `lib/gemini/prompts.ts` - `createImageMetadataPrompt()`

**Purpose**: Generate SEO-optimized, customer-centric alt text using 4-Layer structure.

```typescript
export function createImageMetadataPrompt(
  visionAnalysis: string,
  marketingText: string,
  productName: string
): string {
  return `You are a B2B marketing expert creating SEO-optimized, customer-centric alt text for Samsung products.

CRITICAL INSIGHT:
Alt text is a strategic asset that:
1. Answers customer search intent (long-tail queries)
2. Connects product features to business outcomes
3. Positions in answer engine results (AEO/GEO)

INPUT:
- Visual Analysis: ${visionAnalysis}
- Marketing Text: ${marketingText}
- Product: ${productName}

STRATEGIC FRAMEWORK: 4-Layer Alt Text Structure

Layer 1: TARGET AUDIENCE (Who needs this?)
- Examples: "content creators", "mobile professionals", "selfie enthusiasts"

Layer 2: PROBLEM/NEED (What pain point?)
- Specific challenge the product solves
- Use customer language, not technical jargon

Layer 3: SOLUTION (How does product solve it?)
- ${productName}'s unique feature or capability
- Measurable specifications (NOT vague adjectives)

Layer 4: KEY BENEFIT (What's the measurable outcome?)
- Quantified improvements or specific advantages

ALT TEXT COMPOSITION RULES:

1. STRUCTURE:
   "[Target] [achieve/get/use] [specific outcome] with ${productName}'s [feature] [benefit]"

   ✅ Good: "Content creators capture pro-level 50 MP selfies with Galaxy Z Flip7's FlexWindow preview mode"
   ❌ Bad: "Galaxy Z Flip7 smartphone with camera on marble surface"

2. LENGTH OPTIMIZATION (TWO versions):

   A) Mobile-optimized (50-60 characters):
      - Front-load product name + key differentiator
      - Example: "Galaxy Z Flip7 FlexWindow for hands-free calls"

   B) Desktop-optimized (100-125 characters):
      - Full 4-layer structure
      - Example: "Mobile professionals achieve hands-free video calls with Galaxy Z Flip7's 3.4-inch FlexWindow display"

3. LONG-TAIL KEYWORD STRATEGY:
   - Combine: [Product Category] + [Specific Feature] + [Use Case]
   - Examples:
     * "foldable phone with cover display for notifications"
     * "compact smartphone with 50 MP camera for selfies"

4. SEMANTIC SEARCH OPTIMIZATION:
   - Write naturally (conversational tone)
   - Include cause-effect relationships
   - Match voice search patterns

5. FORBIDDEN ELEMENTS:
   ❌ Vague adjectives: "innovative", "sleek", "advanced", "revolutionary"
   ❌ Keyword stuffing
   ❌ Generic filler: "showing", "featuring", "displaying"

   ✅ Replace with measurable claims:
   - "innovative" → "first 3.4-inch foldable cover display"
   - "advanced camera" → "50 MP dual-camera with AI Zoom"

SCORING OPTIMIZATION (TARGET: 85+ points):

1. KEYWORD DENSITY (17-19 points):
   ✅ Place ${productName} within first 50 characters
   ✅ Include 3+ feature keywords
   ✅ Use 2+ synonym groups naturally

2. AI EXPOSURE (25-28 points):
   ✅ Include 3+ competitive keywords
   ✅ Use specific technical terms

3. SENTENCE STRUCTURE (13-14 points):
   ✅ Include at least 1 measurable specification
   ✅ Use natural language

4. LENGTH COMPLIANCE (13-14 points):
   ✅ alt_text: 80-125 characters (desktop)
   ✅ alt_text_mobile: 50-60 characters
   ✅ description: 150-500 characters

OUTPUT FORMAT (JSON):
{
  "alt_text": "100-125 character desktop-optimized version",
  "alt_text_mobile": "50-60 character mobile-optimized version",
  "target_audience": "identified audience segment",
  "problem_addressed": "pain point this solves",
  "solution_feature": "product feature highlighted",
  "key_benefit": "measurable outcome",
  "long_tail_keywords": ["keyword phrase 1", "keyword phrase 2"],
  "description": "engaging Instagram description here",
  "hashtags": ["#GalaxyAI", "#ProductName", "#Feature", ...]
}`;
}
```

---

## 5. Scoring System

### GEO/AEO Score Calculation

**File**: `lib/scoring/geo-aeo-scorer.ts`

**Total Score**: 100 points

#### v1 Scoring (without Grounding)
| Category | Points |
|----------|--------|
| Keyword Density | 20 |
| AI Exposure | 30 |
| Question Patterns | 20 |
| Sentence Structure | 15 |
| Length Compliance | 15 |
| **Total** | **100** |

#### v2 Scoring (with Grounding)
| Category | Points |
|----------|--------|
| Keyword Density | 15 |
| AI Exposure | 25 |
| Question Patterns | 20 |
| Sentence Structure | 15 |
| Length Compliance | 15 |
| Grounding Quality | 10 |
| **Total** | **100** |

```typescript
export function calculateGEOAEOScore(
  description: string,
  first130: string,
  faqs: Array<{ question: string; answer: string }>,
  productName: string,
  aiExposureScore: number,
  altText?: string,
  groundingMetadata?: GroundingMetadata
): KeywordScore {
  const useV2Scoring = groundingMetadata !== undefined;

  // 1. Keyword Density (v1: 20pts | v2: 15pts)
  const keywordDensity = useV2Scoring
    ? (calculateKeywordDensity(description, productName) / 20) * 15
    : calculateKeywordDensity(description, productName);

  // 2. AI Exposure (v1: 30pts | v2: 25pts)
  const aiExposure = useV2Scoring
    ? (aiExposureScore / 30) * 25
    : aiExposureScore;

  // 3. Question Patterns (20pts - unchanged)
  const questionPatterns = calculateQuestionScore(faqs);

  // 4. Sentence Structure (15pts - unchanged)
  const sentenceStructure = calculateStructureScore(description);

  // 5. Length Compliance (15pts - unchanged)
  const lengthCompliance = calculateLengthScore(first130, description, altText);

  // 6. Grounding Quality (v2 only: 10pts)
  const groundingQuality = useV2Scoring
    ? calculateGroundingQuality(groundingMetadata)
    : undefined;

  // Total
  const total = useV2Scoring
    ? keywordDensity + aiExposure + questionPatterns + sentenceStructure + lengthCompliance + (groundingQuality || 0)
    : keywordDensity + aiExposure + questionPatterns + sentenceStructure + lengthCompliance;

  return {
    keyword_density: Math.round(keywordDensity * 10) / 10,
    ai_exposure: Math.round(aiExposure * 10) / 10,
    question_patterns: Math.round(questionPatterns * 10) / 10,
    sentence_structure: Math.round(sentenceStructure * 10) / 10,
    length_compliance: Math.round(lengthCompliance * 10) / 10,
    grounding_quality: groundingQuality !== undefined
      ? Math.round(groundingQuality * 10) / 10
      : undefined,
    total: Math.min(Math.round(total * 10) / 10, 100),
  };
}
```

---

### Keyword Analyzer

**File**: `lib/scoring/keyword-analyzer.ts`

#### Keyword Density (20 points)

```typescript
export function calculateKeywordDensity(text: string, productName: string): number {
  let score = 0;

  // 1. Product Name Position (0-5pts)
  const productPosition = text.toLowerCase().indexOf(productName.toLowerCase());
  if (productPosition >= 0 && productPosition <= 30) score += 5;      // First 30 chars
  else if (productPosition > 30 && productPosition <= 80) score += 4; // 31-80 chars
  else if (productPosition > 80 && productPosition <= 150) score += 3;// 81-150 chars
  else if (productPosition > 150) score += 2;                         // After 150

  // 2. Feature Keyword Diversity (0-5pts)
  const featureKeywords = ['camera', 'ai', 'display', 'battery', 'performance', 'screen', 'processor', 'design', 'lens', 'photo'];
  const foundFeatures = featureKeywords.filter(kw => text.toLowerCase().includes(kw));
  if (foundFeatures.length >= 5) score += 5;
  else if (foundFeatures.length >= 4) score += 4.5;
  else if (foundFeatures.length >= 3) score += 4;
  else if (foundFeatures.length >= 2) score += 3;
  else if (foundFeatures.length >= 1) score += 2;

  // 3. Natural Keyword Placement (0-5pts) - Penalize stuffing
  const words = text.split(/\s+/);
  const keywordRepetition = words.filter(w =>
    w.toLowerCase().includes(productName.toLowerCase().split(' ')[0])
  ).length;
  const repetitionRate = keywordRepetition / words.length;

  if (repetitionRate > 0 && repetitionRate <= 0.08) score += 5;      // ≤8% - Very natural
  else if (repetitionRate <= 0.12) score += 4.5;                     // ≤12% - Natural
  else if (repetitionRate <= 0.18) score += 4;                       // ≤18% - Acceptable
  else if (repetitionRate <= 0.25) score += 3;                       // ≤25% - Slightly high
  else score += 2;                                                    // >25% - Stuffing

  // 4. Synonym Usage (0-5pts)
  const synonymPairs = [
    ['phone', 'device', 'smartphone', 'mobile'],
    ['camera', 'lens', 'optics', 'photography', 'photo'],
    ['display', 'screen', 'panel'],
    ['battery', 'power', 'charge'],
  ];
  const usedSynonyms = synonymPairs.filter(pair =>
    pair.filter(word => text.toLowerCase().includes(word)).length >= 1
  );
  if (usedSynonyms.length >= 3) score += 5;
  else if (usedSynonyms.length >= 2) score += 4;
  else if (usedSynonyms.length >= 1) score += 3;
  else score += 1;

  return Math.min(score, 20);
}
```

#### Sentence Structure (15 points)

```typescript
export function calculateStructureScore(text: string): number {
  let score = 0;

  // 1. Chunking Possibility (0-3pts)
  const sections = text.split('\n\n').filter(s => s.trim().length > 0);
  if (sections.length >= 3) score += 3;
  else if (sections.length >= 2) score += 2.5;
  else if (text.split('\n').length >= 2) score += 1.5;
  else score += 1.0;

  // 2. List/Table Usage (0-3pts)
  const listMatches = text.match(/[-•]\s+/g) || [];
  const numberedMatches = text.match(/\d+\.\s+/g) || [];
  const totalListItems = listMatches.length + numberedMatches.length;
  if (totalListItems >= 5) score += 3;
  else if (totalListItems >= 3) score += 2.5;
  else if (totalListItems >= 1) score += 1.5;
  else score += 0.5;

  // 3. Semantic Clarity - Penalize vague terms (0-3pts)
  const vagueTerms = [
    'innovative', 'revolutionary', 'cutting-edge', 'state-of-the-art',
    'amazing', 'incredible', 'awesome', 'fantastic', 'best-in-class'
  ];
  const foundVague = vagueTerms.filter(term => text.toLowerCase().includes(term));
  if (foundVague.length === 0) score += 3;
  else if (foundVague.length <= 1) score += 2.5;
  else if (foundVague.length <= 2) score += 2;
  else if (foundVague.length <= 4) score += 1.5;
  else score += 1;

  // 4. Technical Specificity (0-3pts)
  const technicalPatterns = [
    /\d+\s*(mp|megapixel|mah|ghz|gb|tb|mm|inch|hz|w|watt|%|percent)/gi,
    /\d+x\s*(faster|slower|more|brighter)/gi,
    /\d+(\.\d+)?\s*(inch|mm|cm)/gi,
  ];
  let technicalCount = 0;
  technicalPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) technicalCount += matches.length;
  });
  if (technicalCount >= 5) score += 3;
  else if (technicalCount >= 3) score += 2.5;
  else if (technicalCount >= 1) score += 2;
  else score += 0;

  // 5. Entity Density (0-3pts)
  const entities = [
    /Samsung|Galaxy|Knox|FlexWindow|ProVisual|Bixby/gi,
    /iPhone|Pixel|Snapdragon|Exynos|Android|iOS/gi,
    /AI|ML|OLED|AMOLED|LED|LCD|5G|WiFi|Bluetooth/gi,
  ];
  const entityMatches = entities.flatMap(pattern => text.match(pattern) || []);
  const wordCount = text.split(/\s+/).length;
  const entityDensity = (entityMatches.length / wordCount) * 100;

  if (entityDensity >= 2) score += 3;
  else if (entityDensity >= 1) score += 2.5;
  else if (entityDensity >= 0.5) score += 2;
  else score += 1;

  return Math.min(score, 15);
}
```

---

### Grounding Quality Scorer

**File**: `lib/scoring/grounding-scorer.ts`

**Total**: 10 points

| Component | Points | Description |
|-----------|--------|-------------|
| Citation Density | 3 | % of content with grounding support |
| Source Authority | 4 | Quality and trustworthiness of sources |
| Coverage | 3 | How well grounding covers key content sections |

#### Authority Tiers

```typescript
const AUTHORITY_TIERS = {
  // Tier 1: Official manufacturer sites (4.0 pts)
  tier1: {
    score: 4.0,
    domains: ['samsung.com', 'apple.com', 'google.com']
  },

  // Tier 2: Trusted tech review sites (3.0 pts)
  tier2: {
    score: 3.0,
    domains: [
      'gsmarena.com', 'theverge.com', 'techradar.com',
      'engadget.com', 'arstechnica.com', 'cnet.com',
      'tomshardware.com', 'anandtech.com'
    ]
  },

  // Tier 3: General tech news (2.0 pts)
  tier3: {
    score: 2.0,
    domains: [
      'techcrunch.com', 'wired.com', 'zdnet.com',
      'pcmag.com', 'digitaltrends.com'
    ]
  },

  // Tier 4: Other sources (1.0 pt)
  tier4: {
    score: 1.0,
    domains: []  // Catch-all
  }
};
```

---

## 6. Schema Markup

**File**: `types/schema.ts`

The system generates Schema.org structured data for AI systems to parse content.

### FAQ Schema

```typescript
export interface FAQSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}
```

### HowTo Schema

```typescript
export interface HowToSchema {
  "@context": "https://schema.org";
  "@type": "HowTo";
  name: string;
  description: string;
  step: Array<{
    "@type": "HowToStep";
    position: number;
    name: string;
    text: string;
  }>;
}
```

### Product Schema

```typescript
export interface ProductSchema {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  brand: {
    "@type": "Brand";
    name: "Samsung";
  };
  offers?: {
    "@type": "Offer";
    url: string;
    priceCurrency?: string;
    availability?: string;
  };
}
```

### VideoObject Schema

```typescript
export interface VideoObjectSchema {
  "@context": "https://schema.org";
  "@type": "VideoObject";
  name: string;
  description: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  contentUrl: string;
}
```

---

## 7. Grounding Strategy

### Mandatory Query Distribution

All prompts that use Google Grounding follow this distribution:

| Source Type | Queries | Example |
|-------------|---------|---------|
| Official (samsung.com) | 3-4 | `${productName} FlexWindow specifications site:samsung.com` |
| Community (Reddit) | 2-3 | `${productName} FlexWindow reddit OR site:reddit.com/r/samsung` |
| Review Sites | 2-3 | `${productName} review site:gsmarena.com OR site:techradar.com` |
| Video Content | 2-3 | `${productName} hands on site:youtube.com` |
| General/Competitive | 2-3 | `${productName} FlexWindow vs iPhone Dynamic Island` |

### Content Prioritization Strategy

```yaml
STAGE 1 - VIDEO CONTENT (Primary - HIGHEST PRIORITY):
  - Extract from video transcript and description
  - Use video's own language and framing
  - Prioritize features shown in both description AND transcript

STAGE 2 - GROUNDING FALLBACK (Last Resort - LOWEST PRIORITY):
  - Supplement with official specifications
  - Validate grounding content MATCHES video emphasis
  - DO NOT let external content overshadow video
```

### Confidence Level Rules

All generated content receives `confidence: "high"` because:
1. Video content represents official product messaging (ground truth)
2. Grounding validates and supplements video content
3. Only features explicitly demonstrated or mentioned are extracted

---

## Target Score Ranges

| Score | Grade | Assessment |
|-------|-------|------------|
| 90-100 | A+ | Perfect optimization |
| 85-90 | A | Very good optimization (TARGET) |
| 75-85 | B | Good optimization |
| 70-75 | C | Acceptable |
| <70 | D | Needs improvement |

### Target by Category

| Category | Target Score | Percentage |
|----------|--------------|------------|
| Keyword Density | 17-19 / 20 | 85-95% |
| AI Exposure | 25-28 / 30 | 83-93% |
| Question Patterns | 17-20 / 20 | 85-100% |
| Sentence Structure | 13-14 / 15 | 87-93% |
| Length Compliance | 13-14 / 15 | 87-93% |
| Grounding Quality | 8-10 / 10 | 80-100% |

---

## Summary

This documentation covers the complete AEO/GEO prompt system including:

- **7 YouTube Analysis Stages**: Description → USP → Chapters → FAQ → Steps → Keywords → Hashtags → Assembly
- **2 Image Analysis Stages**: Vision Analysis → Alt Text/Description Generation
- **100-point Scoring System**: Keyword Density, AI Exposure, Question Patterns, Structure, Length, Grounding
- **Schema Markup Generation**: FAQ, HowTo, Product, VideoObject schemas
- **Mandatory Grounding Strategy**: 5-source diversification with authority tiering

All prompts are designed to achieve **85+ points** through:
- Measurable specifications instead of vague marketing language
- Conversational question patterns (10-15 words)
- Video content prioritization with grounding validation
- Expert attribution for AI trust signals
