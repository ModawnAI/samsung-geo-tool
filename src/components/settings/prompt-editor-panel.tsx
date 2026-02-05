'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  X,
  FloppyDisk,
  ArrowCounterClockwise,
  SpinnerGap,
  Info,
  Copy,
  Check,
  Lightning,
  Sparkle,
  MagnifyingGlass,
  BookOpen,
  Play,
  Eye,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { NodeId } from './prompt-flow-diagram'
import type { Stage, PromptTestResponse } from '@/types/tuning'

interface PromptVersion {
  id: string
  name: string
  version: string
  engine: 'gemini' | 'perplexity' | 'cohere'
  system_prompt: string
  description: string | null
  is_active: boolean
  performance_score: number | null
  created_at: string
}

interface StageInstruction {
  stage: string
  instruction: string
}

// Stage instructions - These MUST match prompt-loader.ts composeStagePrompt() EXACTLY
// These are the actual instructions appended to base prompts during generation
// IMPORTANT: Keep these in sync with src/lib/tuning/prompt-loader.ts stageInstructions
const STAGE_INSTRUCTIONS: Record<string, StageInstruction> = {
  description: {
    stage: 'description',
    instruction: `## TASK
Generate a YouTube description optimized for GEO and AEO.

## GROUNDING INSTRUCTION - MANDATORY QUERY EXECUTION PROTOCOL
🔴 CRITICAL: You MUST EXECUTE ALL queries listed below. This is MANDATORY, not optional.

### 📋 VIDEO-BASED SEARCH STRATEGY
Generate 10-15 search queries based ONLY on features mentioned in the video content.

### QUERY GENERATION PROCESS
1. **Extract Features from Video**: Identify ALL features explicitly mentioned
2. **Generate Numbered Query List**: Create [REQUIRED] queries for each feature
3. **Site Diversification Strategy** (MANDATORY - use all 5 site types):
   - Official: "{{product_name}} [feature] specifications site:samsung.com" [REQUIRED]
   - Community: "{{product_name}} [feature] reddit OR site:reddit.com/r/samsung" [REQUIRED]
   - Review Sites: "{{product_name}} [feature] site:gsmarena.com OR site:techradar.com" [REQUIRED]
   - Video Content: "{{product_name}} [feature] site:youtube.com" [REQUIRED]
   - General: "{{product_name}} [feature] vs [competitor]" [REQUIRED]

### 📊 MANDATORY QUERY DISTRIBUTION
- 3-4 queries with site:samsung.com [REQUIRED]
- 2-3 queries with reddit OR site:reddit.com [REQUIRED]
- 2-3 queries with site:gsmarena.com OR site:techradar.com [REQUIRED]
- 2-3 queries with site:youtube.com [REQUIRED]
- 2-3 queries without site restrictions (general search) [REQUIRED]

## RULES (CRITICAL)
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
   - Format: "According to Samsung Mobile's product team, {{product_name}}..."
   - Build trust with AI systems through verifiable sources

## CRITICAL: SCORING OPTIMIZATION (TARGET: 85+ points)

### 1. KEYWORD DENSITY (17-19 points target)
✅ Place {{product_name}} within first 50 characters of first_130
✅ Include 3+ feature keywords: camera, ai, display, battery, performance
✅ Use 2+ synonym groups naturally:
   - phone/device/smartphone/mobile
   - camera/lens/photography/photo
   - display/screen/panel
✅ Keep product name repetition under 10% of total words

### 2. AI EXPOSURE (25-28 points target)
✅ Include 3+ competitive keywords: camera, megapixel, foldable, ai, smartphone
✅ Use specific technical specifications ("50 MP", "5000mAh", "6.7 inch OLED")
✅ Mention brand/tech terms: Samsung, Galaxy, AI, OLED, 5G, Knox, Snapdragon

### 3. SENTENCE STRUCTURE (13-14 points target)
✅ Include 2+ measurable specifications with numbers/units
✅ Use natural, specific language (avoid "innovative", "revolutionary")
✅ Maintain entity density above 1%

### 4. LENGTH COMPLIANCE (13-14 points target)
✅ first_130: Must be 110-130 characters
✅ full_description: 300-1000 characters optimal

## OUTPUT FORMAT (JSON)
{
  "first_130": "exact first 130 characters",
  "full_description": "complete description without timestamps/FAQ/hashtags",
  "vanity_link": "suggested vanity link name (e.g., ZFlip7_Intro_yt)"
}`,
  },
  usp: {
    stage: 'usp',
    instruction: `## TASK
Extract 2-8 unique selling points that differentiate {{product_name}}.

## CONTENT PRIORITIZATION - 2-STAGE STRATEGY

### STAGE 1 - VIDEO CONTENT (Primary - HIGHEST PRIORITY)
Extract USPs DIRECTLY from video content (description and transcript):
1. Identify features explicitly mentioned or demonstrated in the video
2. Focus on what the video emphasizes and showcases
3. Extract specific examples, demonstrations, and use cases shown
4. Prioritize content that appears in both description AND transcript
5. Use the video's own language and framing

### STAGE 2 - GROUNDING FALLBACK (Last Resort - LOWEST PRIORITY)
Use grounding ONLY if Stage 1 provides insufficient detail:
1. Supplement with specific {{product_name}} specifications from official sources
2. Validate that grounding content MATCHES video emphasis
3. DO NOT use grounding content that contradicts or diverges from video

## GROUNDING QUERY GENERATION - MANDATORY EXECUTION PROTOCOL
🔴 CRITICAL: You MUST EXECUTE ALL [REQUIRED] queries below.

### 📋 Generate 10-15 search queries for EACH USP extracted from video content:

QUERY TYPES per USP Feature (MANDATORY - use all 5 site types):
- Official: "{{product_name}} [USP feature] specifications site:samsung.com" [REQUIRED]
- Community: "{{product_name}} [USP feature] reddit OR site:reddit.com/r/samsung" [REQUIRED]
- Review Sites: "{{product_name}} [USP feature] site:gsmarena.com OR site:techradar.com" [REQUIRED]
- Video Content: "{{product_name}} [USP feature] site:youtube.com" [REQUIRED]
- Competitive: "{{product_name}} [USP feature] vs [competitor]" [REQUIRED]

## ANTI-MISMATCH RULES
❌ DO NOT prioritize grounding over video content
❌ DO NOT include features not mentioned in video
❌ DO NOT let external content overshadow video emphasis
✅ Video content = Ground truth
✅ Grounding = Supplementary detail only

## CRITICAL RULES
✅ Focus on {{product_name}}'s own unique features (NO competitor comparison)
✅ Use measurable specifications (50 MP, 3.4-inch, etc.)
✅ Categorize USPs: Camera, Display, Performance, AI, Design, Battery, Security

## CONFIDENCE LEVEL RULES
✅ Video content-based USPs: ALWAYS set confidence: "high"
✅ Grounding-supplemented USPs: Set confidence: "high"
CRITICAL: There is NO "low" or "medium" confidence.

## OUTPUT FORMAT (JSON)
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
}`,
  },
  faq: {
    stage: 'faq',
    instruction: `## TASK
Generate 5-7 Q&A pairs optimized for AEO (Answer Engine Optimization) using Query Fan-Out methodology.

## QUERY FAN-OUT STRATEGY
AI systems generate multiple related subqueries from a single user question. Address these patterns:
1. Core feature question: How USPs solve user problems
2. Benefit/Use case question: Real-world applications of USPs
3. Implementation/How-to question: How to use USP features
4. Specification question: Technical details of USPs
5. Troubleshooting question: Common issues with USP features
6. Alternative question: When USPs provide advantage
7. Comparative question: How USPs differentiate from alternatives

## GROUNDING INSTRUCTION - MANDATORY FAQ QUERY EXECUTION PROTOCOL
🔴 CRITICAL: You MUST EXECUTE ALL [REQUIRED] queries below.

### 📋 Generate 8-12 search queries based ONLY on USPs and features mentioned in the video.

QUERY GENERATION per USP/Feature from Video (MANDATORY - use all 5 site types):

1. **Official Specifications** [REQUIRED]:
   - "{{product_name}} [USP feature] specifications site:samsung.com"
   - "{{product_name}} [USP feature] technical details site:samsung.com"

2. **Community Discussions** [REQUIRED]:
   - "{{product_name}} [USP feature] reddit OR site:reddit.com/r/samsung"

3. **Expert Reviews** [REQUIRED]:
   - "{{product_name}} [USP feature] site:gsmarena.com OR site:techradar.com"

4. **Video Demonstrations** [REQUIRED]:
   - "{{product_name}} [USP feature] site:youtube.com"

5. **Competitive Comparisons** [REQUIRED]:
   - "{{product_name}} [USP feature] vs [competitor]"

## QUESTION RULES (CRITICAL)
1. Questions MUST:
   - Be 10-15 words (conversational search pattern, NOT 2-3 words)
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

## SCORING OPTIMIZATION (TARGET: 85+ points)
### QUESTION PATTERNS (17-20 points target)
✅ ALL questions MUST start with How/What/Why/When/Where (5pts)
✅ Questions must be 10-20 words, conversational and natural (5pts)
✅ Answers must be 50-150 words, direct and factual (5pts)
✅ Generate exactly 5-7 FAQs covering different query fan-out angles (5pts)

## OUTPUT FORMAT (JSON)
{
  "faqs": [
    {"question": "How does...", "answer": "The..."},
    ...
  ],
  "count": 5-7
}`,
  },
  chapters: {
    stage: 'chapters',
    instruction: `## TASK
Create GEO/AEO-optimized timestamp chapters for YouTube video navigation.

## CRITICAL CONTEXT
Chapters are a strategic SEO asset that:
1. Improve video discoverability in search results
2. Help AI systems understand video structure
3. Enable direct navigation to relevant content
4. Appear in YouTube search and Google video results

## CHAPTER QUALITY CRITERIA (GEO/AEO Optimization)

### ✅ INCLUDE chapters that:
- Describe product features or specifications (e.g., "50MP Camera", "Design", "Display")
- Highlight key functionalities (e.g., "Now Brief", "Gemini Live", "FlexWindow")
- Explain use cases or demos (e.g., "Photo Demo", "Unboxing", "Setup Guide")
- Represent major video sections (e.g., "Intro", "Conclusion", "Key Features")
- Use searchable keywords related to the product
- Are meaningful standalone (users can understand without watching full video)

### ❌ EXCLUDE chapters that:
- Contain personal names or casual references (e.g., "mochi's dog show")
- Are vague or generic without context (e.g., "Part 1", "Next", "More")
- Reference non-product content (e.g., "Background music", "Credits")
- Don't relate to product features or value proposition

## CHAPTER TITLE RULES

1. **LENGTH**: 2-5 words maximum (concise and scannable)

2. **KEYWORD OPTIMIZATION**:
   - Include product feature names when relevant
   - Use terminology users would search for
   - Avoid marketing fluff ("Amazing", "Incredible")
   - Use specific technical terms ("50MP", "OLED", "AI")

3. **CLARITY**:
   - Descriptive and self-explanatory
   - Title alone should convey section purpose
   - Capitalize first letter of each major word

4. **SEARCHABILITY**:
   - Would this appear in search results?
   - Does it answer "what's in this section?"
   - Is it product-feature relevant?

## EXAMPLES (Good vs Bad)

### ✅ GOOD CHAPTERS:
- "00:00 Intro"
- "00:16 Design"
- "00:33 50MP Camera"
- "01:00 Now Brief"
- "01:37 Gemini Live"
- "02:15 Battery Life"

### ❌ BAD CHAPTERS:
- "00:45 mochi's dog show" → Personal reference
- "01:20 Random thoughts" → Vague
- "02:30 Really cool stuff" → Marketing fluff

## OUTPUT FORMAT (JSON)
{
  "chapters": [
    {"time": "00:00", "title": "Intro"},
    {"time": "00:16", "title": "Design"},
    {"time": "00:33", "title": "50MP Camera"},
    ...
  ],
  "reasoning": "Brief explanation of chapter selection strategy"
}`,
  },
  case_studies: {
    stage: 'case_studies',
    instruction: `## TASK
Create realistic use case scenarios that demonstrate how {{product_name}} solves real user problems.

## CASE STUDY QUALITY STANDARDS

### REALISTIC SCENARIOS
1. Use relatable user personas (e.g., "content creators", "mobile professionals", "selfie enthusiasts")
2. Present specific challenges the product solves
3. Demonstrate specific USP benefits in context
4. Include realistic outcomes based on actual features
5. Ground claims in product capabilities

### ANTI-FABRICATION RULES
❌ DO NOT invent statistics or percentages
❌ DO NOT claim capabilities not demonstrated in video
❌ DO NOT use vague marketing language ("revolutionary", "game-changing")
✅ Use hedging language for unverified claims
✅ Base scenarios on demonstrated features only
✅ Include measurable specifications when available

### HEDGING LANGUAGE FOR UNVERIFIED CLAIMS
Use these patterns when claims cannot be verified:
- "Designed to help users..."
- "Features like [X] can assist with..."
- "Users may experience..."
- "The [feature] is built to support..."

### PERSONA CATEGORIES
1. **Content Creators**: Focus on camera, video, social sharing features
2. **Mobile Professionals**: Focus on productivity, multitasking, security features
3. **Tech Enthusiasts**: Focus on specifications, AI features, innovation
4. **Everyday Users**: Focus on convenience, battery, ease of use

## OUTPUT FORMAT (JSON)
{
  "case_studies": [
    {
      "persona": "Content Creator",
      "challenge": "Needs high-quality selfies without traditional camera setup",
      "solution": "Uses {{product_name}}'s FlexWindow with 50MP rear camera",
      "outcome": "Captures professional-quality content hands-free",
      "usp_reference": "FlexWindow selfies"
    }
  ]
}`,
  },
  keywords: {
    stage: 'keywords',
    instruction: `## TASK
Extract and analyze keywords for GEO/AEO scoring.

## CATEGORIES

### Product-specific Keywords
- Product names and model numbers (Galaxy Z Flip7, Galaxy S25 Ultra)
- Unique features (FlexWindow, ProVisual Engine, Audio Eraser)
- Samsung-specific terms and technologies

### Generic Competitive Keywords
- Industry terms that competitors also target (50 MP camera, AI-powered, foldable phone)
- Terms that score AI exposure in search results

## SCORING CRITERIA (70 points total - AI exposure calculated separately)

### 1. KEYWORD DENSITY (20pts)
- Product name in first 30 chars: 5pts
- 3+ feature keywords: 5pts
- Natural placement (no stuffing): 5pts
- Synonym usage: 5pts

### 2. QUESTION PATTERNS (20pts)
- How/What/Why/When/Where questions: 5pts
- User intent reflected: 5pts
- Direct, clear answers: 5pts
- 4-7 FAQ count: 5pts

### 3. SENTENCE STRUCTURE (15pts)
- Chunkable content (modular sections): 5pts
- Lists/tables/structured format: 5pts
- Semantic clarity (no vague terms): 5pts

### 4. LENGTH COMPLIANCE (15pts)
- First 130 chars optimized: 5pts
- Description under 5000 chars: 5pts
- Appropriate detail level: 5pts

## KEYWORD ANALYSIS RULES
1. Extract ONLY keywords that appear in the generated content
2. Categorize accurately between product-specific and generic
3. Score honestly based on actual content quality
4. Flag areas needing improvement

## OUTPUT FORMAT (JSON)
{
  "product_keywords": ["keyword1", "keyword2"],
  "generic_keywords": ["keyword1", "keyword2"],
  "density_score": 0-20,
  "question_score": 0-20,
  "structure_score": 0-15,
  "length_score": 0-15,
  "preliminary_total": 0-70
}`,
  },
  hashtags: {
    stage: 'hashtags',
    instruction: `## TASK
Generate 5-8 strategic hashtags optimized for YouTube discovery and SEO.

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

## PRIORITIZATION
- Position 1: Product name (most specific)
- Position 2-3: Key differentiating features
- Position 4-5: Category/industry terms
- Position 6-8: Trending/broad reach terms

## FORBIDDEN
❌ Generic tags like #tech #phone #new
❌ Overly long hashtags (>20 characters)
❌ Competitor brand names (iPhone, Pixel, etc.)

## OUTPUT FORMAT (JSON)
{
  "hashtags": ["#GalaxyZFlip7", "#FlexWindow", "#FoldablePhone", ...],
  "categories": {
    "brand": ["#GalaxyZFlip7", "#Samsung", "#GalaxyAI"],
    "features": ["#FlexWindow", "#50MPCamera", "#FoldablePhone"],
    "industry": ["#MobilePhotography", "#TechReview", "#Smartphone"]
  },
  "reasoning": "Explanation of hashtag selection strategy"
}`,
  },
}

// Template variables available
const TEMPLATE_VARIABLES = [
  { name: 'product_name', desc: 'Product name' },
  { name: 'category', desc: 'Product category' },
  { name: 'usps', desc: 'Unique selling points' },
  { name: 'keywords', desc: 'Target keywords' },
  { name: 'competitor', desc: 'Competitor info' },
  { name: 'language', desc: 'Output language' },
  { name: 'tone', desc: 'Writing tone' },
  { name: 'audience', desc: 'Target audience' },
]

interface PromptEditorPanelProps {
  selectedNode: NodeId | null
  selectedEngine?: 'gemini' | 'perplexity' | 'cohere' | null
  onClose: () => void
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
}

export function PromptEditorPanel({
  selectedNode,
  selectedEngine: propEngine,
  onClose,
  language,
  getAuthToken,
}: PromptEditorPanelProps) {
  const [prompt, setPrompt] = useState<PromptVersion | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  // Test state
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<PromptTestResponse | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [testProductName, setTestProductName] = useState('Galaxy Z Flip7')

  // Determine engine based on selected node
  const getEngineForNode = (nodeId: NodeId): 'gemini' | 'perplexity' | 'cohere' | null => {
    if (nodeId === 'grounding') return 'gemini'
    if (nodeId === 'rag') return 'cohere'
    if (['description', 'usp', 'faq', 'chapters', 'case_studies', 'keywords', 'hashtags'].includes(nodeId)) {
      return 'gemini'
    }
    return null
  }

  // Check if node is a stage (has stage-specific instructions)
  const isStageNode = (nodeId: NodeId): boolean => {
    return ['description', 'usp', 'faq', 'chapters', 'case_studies', 'keywords', 'hashtags'].includes(nodeId)
  }

  // Fetch prompt from API
  const fetchPrompt = useCallback(async (engineToFetch: 'gemini' | 'perplexity' | 'cohere') => {
    setIsLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/tuning/prompts?engine=${engineToFetch}&activeOnly=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch prompt')
      }

      const data = await response.json()
      const activePrompt = data.prompts?.[0]

      if (activePrompt) {
        setPrompt(activePrompt)
        setEditedPrompt(activePrompt.system_prompt)
      } else {
        // No active prompt, show default
        setPrompt(null)
        setEditedPrompt(getDefaultPrompt(engineToFetch))
      }
      setHasChanges(false)
    } catch (error) {
      console.error('Error fetching prompt:', error)
      toast.error(language === 'ko' ? '프롬프트 로드 실패' : 'Failed to load prompt')
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken, language])

  // Get default prompt for engine
  const getDefaultPrompt = (engine: 'gemini' | 'perplexity' | 'cohere'): string => {
    const defaults: Record<string, string> = {
      gemini: `You are an expert Samsung content optimization specialist focused on GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization).

Your role is to create content that:
1. Ranks well in AI-powered search engines and answer systems
2. Provides factual, verifiable information about Samsung products
3. Uses natural, conversational language that matches user queries
4. Follows anti-fabrication guidelines - never invent statistics or claims

Key principles:
- Evidence-based: Only include verifiable product specifications and features
- User-centric: Focus on how features benefit real users
- Query-optimized: Structure content to answer user questions directly
- Grounded: Base all claims on official sources or verified reviews`,

      perplexity: `You are an AI search and grounding specialist for Samsung product content.

Your role is to:
1. Execute search queries to find real-world product information
2. Aggregate user sentiment and review data from trusted sources
3. Identify trending topics and user concerns about Samsung products
4. Ground content claims with verifiable external sources

Search strategy:
- Use site-specific queries (reddit, gsmarena, samsung.com, youtube)
- Look for user discussions and expert reviews
- Verify specifications against official sources
- Track competitor comparisons and market positioning`,

      cohere: `You are a semantic analysis and ranking specialist for Samsung content.

Your role is to:
1. Rerank search results by relevance to user queries
2. Evaluate content quality and semantic similarity
3. Identify the most relevant passages for answer extraction
4. Optimize content structure for answer engine retrieval

Ranking criteria:
- Query relevance: How well does content answer the user question?
- Specificity: Does content provide specific, actionable information?
- Authority: Is the source trustworthy and up-to-date?
- Completeness: Does the passage provide a complete answer?`,
    }
    return defaults[engine] || ''
  }

  // Fetch on node or engine change
  useEffect(() => {
    const engineToUse = propEngine || (selectedNode ? getEngineForNode(selectedNode) : null)
    if (engineToUse) {
      fetchPrompt(engineToUse)
    }
  }, [selectedNode, propEngine, fetchPrompt])

  // Handle prompt change
  const handlePromptChange = (value: string, currentEngine: 'gemini' | 'perplexity' | 'cohere') => {
    setEditedPrompt(value)
    setHasChanges(value !== (prompt?.system_prompt || getDefaultPrompt(currentEngine)))
  }

  // Save prompt
  const handleSave = async (engineToSave: 'gemini' | 'perplexity' | 'cohere') => {
    setIsSaving(true)
    try {
      const token = await getAuthToken()

      // If updating existing prompt
      if (prompt) {
        const response = await fetch('/api/tuning/prompts', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: prompt.id,
            system_prompt: editedPrompt,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update prompt')
        }

        toast.success(language === 'ko' ? '프롬프트가 저장되었습니다' : 'Prompt saved successfully')
      } else {
        // Create new prompt
        const response = await fetch('/api/tuning/prompts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${engineToSave.charAt(0).toUpperCase() + engineToSave.slice(1)} System Prompt`,
            version: '1.0.0',
            engine: engineToSave,
            system_prompt: editedPrompt,
            description: `System prompt for ${engineToSave} engine`,
            is_active: true,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create prompt')
        }

        toast.success(language === 'ko' ? '프롬프트가 생성되었습니다' : 'Prompt created successfully')
      }

      setHasChanges(false)
      fetchPrompt(engineToSave) // Reload
    } catch (error) {
      console.error('Error saving prompt:', error)
      toast.error(language === 'ko' ? '저장 실패' : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to original
  const handleReset = (currentEngine: 'gemini' | 'perplexity' | 'cohere') => {
    if (prompt) {
      setEditedPrompt(prompt.system_prompt)
    } else {
      setEditedPrompt(getDefaultPrompt(currentEngine))
    }
    setHasChanges(false)
  }

  // Copy variable to clipboard
  const handleCopyVariable = (varName: string) => {
    navigator.clipboard.writeText(`{{${varName}}}`)
    setCopiedVar(varName)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  // Insert variable at cursor
  const handleInsertVariable = (varName: string) => {
    const textarea = document.querySelector('textarea[name="prompt-editor"]') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = editedPrompt.substring(0, start) + `{{${varName}}}` + editedPrompt.substring(end)
      setEditedPrompt(newValue)
      setHasChanges(true)

      // Restore focus and position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4)
      }, 0)
    }
  }

  // Test the prompt with sample content
  const handleTest = async (engineToTest: 'gemini' | 'perplexity' | 'cohere') => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const token = await getAuthToken()
      const stage = selectedNode && isStageNode(selectedNode) ? selectedNode as Stage : undefined

      const response = await fetch('/api/tuning/prompts/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_prompt: editedPrompt,
          engine: engineToTest,
          variables: { product_name: testProductName },
          stage,
          language,
          live: liveMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Test request failed')
      }

      const result: PromptTestResponse = await response.json()
      setTestResult(result)

      if (result.error) {
        toast.error(language === 'ko' ? '테스트 오류' : 'Test error', { description: result.error })
      } else {
        toast.success(
          language === 'ko' ? '테스트 완료' : 'Test completed',
          { description: `${result.tokens.total} tokens, ${result.latency}ms` }
        )
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error(language === 'ko' ? '테스트 실패' : 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }

  // Determine the effective engine - prefer propEngine over derived engine from node
  const effectiveEngine = propEngine || (selectedNode ? getEngineForNode(selectedNode) : null)

  // Return null if neither prop engine nor node-derived engine is available
  if (!effectiveEngine) return null

  const engineIcons = {
    gemini: <Sparkle className="h-4 w-4" />,
    perplexity: <MagnifyingGlass className="h-4 w-4" />,
    cohere: <BookOpen className="h-4 w-4" />,
  }

  const engineColors = {
    gemini: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    perplexity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    cohere: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }

  const nodeLabels: Record<string, { ko: string; en: string }> = {
    grounding: { ko: '그라운딩', en: 'Grounding' },
    rag: { ko: 'RAG 검색', en: 'RAG Search' },
    description: { ko: '설명 생성', en: 'Description' },
    usp: { ko: 'USP 추출', en: 'USP Extraction' },
    faq: { ko: 'FAQ 생성', en: 'FAQ Generation' },
    chapters: { ko: '챕터 생성', en: 'Chapters' },
    case_studies: { ko: '사례 연구', en: 'Case Studies' },
    keywords: { ko: '키워드 추출', en: 'Keywords' },
    hashtags: { ko: '해시태그 생성', en: 'Hashtags' },
  }

  const engineLabels: Record<string, { ko: string; en: string }> = {
    gemini: { ko: 'Gemini 프롬프트', en: 'Gemini Prompt' },
    perplexity: { ko: 'Perplexity 프롬프트', en: 'Perplexity Prompt' },
    cohere: { ko: 'Cohere 프롬프트', en: 'Cohere Prompt' },
  }

  // Display title - use node label if available, otherwise engine label
  const displayTitle = selectedNode
    ? nodeLabels[selectedNode]?.[language] || selectedNode
    : engineLabels[effectiveEngine]?.[language] || effectiveEngine

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${engineColors[effectiveEngine]}`}>
            {engineIcons[effectiveEngine]}
          </div>
          <div>
            <h3 className="font-semibold">
              {displayTitle}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {effectiveEngine.toUpperCase()}
              </Badge>
              {prompt && (
                <span>v{prompt.version}</span>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="system" className="w-full">
            <TabsList className={`grid w-full ${selectedNode && isStageNode(selectedNode) ? 'grid-cols-3' : 'grid-cols-1'}`}>
              <TabsTrigger value="system">
                {language === 'ko' ? '프롬프트' : 'Prompt'}
              </TabsTrigger>
              {selectedNode && isStageNode(selectedNode) && (
                <>
                  <TabsTrigger value="stage">
                    {language === 'ko' ? '단계 지침' : 'Stage'}
                  </TabsTrigger>
                  <TabsTrigger value="test">
                    <Play className="h-3 w-3 mr-1" />
                    {language === 'ko' ? '테스트' : 'Test'}
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="system" className="space-y-4">
              {/* Prompt Editor */}
              <div className="space-y-2">
                <Label>{language === 'ko' ? '프롬프트 내용' : 'Prompt Content'}</Label>
                <Textarea
                  name="prompt-editor"
                  value={editedPrompt}
                  onChange={(e) => handlePromptChange(e.target.value, effectiveEngine)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder={language === 'ko' ? '프롬프트를 입력하세요...' : 'Enter prompt...'}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{editedPrompt.length} {language === 'ko' ? '자' : 'chars'}</span>
                  {hasChanges && (
                    <span className="text-amber-500 flex items-center gap-1">
                      <Lightning className="h-3 w-3" />
                      {language === 'ko' ? '변경사항 있음' : 'Unsaved changes'}
                    </span>
                  )}
                </div>
              </div>

              {/* Template Variables */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {language === 'ko' ? '템플릿 변수' : 'Template Variables'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {language === 'ko'
                      ? '클릭하여 변수를 삽입하세요'
                      : 'Click to insert variables'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => handleInsertVariable(v.name)}
                        className="group relative inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted rounded hover:bg-primary/10 transition-colors"
                        title={v.desc}
                      >
                        {`{{${v.name}}}`}
                        <span
                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyVariable(v.name)
                          }}
                        >
                          {copiedVar === v.name ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {selectedNode && isStageNode(selectedNode) && (
              <TabsContent value="stage" className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">
                      {language === 'ko' ? '단계별 지침' : 'Stage-Specific Instructions'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {language === 'ko'
                        ? '이 지침은 시스템 프롬프트에 자동으로 추가됩니다'
                        : 'These instructions are automatically appended to the system prompt'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">
                        {STAGE_INSTRUCTIONS[selectedNode]?.instruction || 'No stage instructions'}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {language === 'ko'
                        ? '* 단계 지침은 코드에서 관리됩니다'
                        : '* Stage instructions are managed in code'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Test Tab */}
            {selectedNode && isStageNode(selectedNode) && (
              <TabsContent value="test" className="space-y-4">
                {/* Test Configuration */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {language === 'ko' ? '프롬프트 테스트' : 'Test Prompt'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {language === 'ko'
                        ? '샘플 콘텐츠로 프롬프트를 테스트합니다'
                        : 'Test the prompt with sample content'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Product Name Input */}
                    <div className="space-y-2">
                      <Label className="text-sm">{language === 'ko' ? '제품명' : 'Product Name'}</Label>
                      <Input
                        value={testProductName}
                        onChange={(e) => setTestProductName(e.target.value)}
                        placeholder="Galaxy Z Flip7"
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Live Mode Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">{language === 'ko' ? '실시간 API 호출' : 'Live API Call'}</Label>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ko'
                            ? '실제 Gemini API를 호출합니다 (API 비용 발생)'
                            : 'Call real Gemini API (incurs API cost)'}
                        </p>
                      </div>
                      <Switch
                        checked={liveMode}
                        onCheckedChange={setLiveMode}
                      />
                    </div>

                    {/* Preview Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">{language === 'ko' ? '조합된 프롬프트 보기' : 'Show Composed Prompt'}</Label>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ko'
                            ? '기본 프롬프트 + 단계 지침을 미리 봅니다'
                            : 'Preview base prompt + stage instructions'}
                        </p>
                      </div>
                      <Switch
                        checked={showPreview}
                        onCheckedChange={setShowPreview}
                      />
                    </div>

                    {/* Test Button */}
                    <Button
                      className="w-full"
                      onClick={() => handleTest(effectiveEngine)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <>
                          <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                          {language === 'ko' ? '테스트 중...' : 'Testing...'}
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          {language === 'ko' ? '테스트 실행' : 'Run Test'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Test Results */}
                {testResult && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {testResult.error ? (
                          <WarningCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {language === 'ko' ? '테스트 결과' : 'Test Results'}
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {testResult.source === 'live' ? 'LIVE' : 'MOCK'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-2">
                        <span>{testResult.tokens.total} tokens</span>
                        <span>|</span>
                        <span>{testResult.latency}ms</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {testResult.error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                          {testResult.error}
                        </div>
                      ) : (
                        <>
                          {/* Output */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">{language === 'ko' ? '출력' : 'Output'}</Label>
                            <ScrollArea className="h-[200px]">
                              <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
                                {testResult.output}
                              </pre>
                            </ScrollArea>
                          </div>

                          {/* Composed Prompt Preview */}
                          {showPreview && testResult.composedPrompt && (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium flex items-center gap-2">
                                <Eye className="h-3 w-3" />
                                {language === 'ko' ? '조합된 프롬프트' : 'Composed Prompt'}
                              </Label>
                              <ScrollArea className="h-[200px]">
                                <pre className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
                                  {testResult.composedPrompt}
                                </pre>
                              </ScrollArea>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 p-4 border-t bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleReset(effectiveEngine)}
          disabled={!hasChanges || isSaving}
        >
          <ArrowCounterClockwise className="h-4 w-4 mr-1" />
          {language === 'ko' ? '되돌리기' : 'Reset'}
        </Button>
        <Button
          size="sm"
          onClick={() => handleSave(effectiveEngine)}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <SpinnerGap className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <FloppyDisk className="h-4 w-4 mr-1" />
          )}
          {language === 'ko' ? '저장' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
