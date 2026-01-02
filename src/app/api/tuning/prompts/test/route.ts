import { NextRequest, NextResponse } from 'next/server'
import type { PromptTestRequest, PromptTestResponse, Engine, Stage, GroundingSource, GroundingTestResult } from '@/types/tuning'
import { composeStagePrompt, interpolatePrompt } from '@/lib/tuning/prompt-loader'
import { GoogleGenAI, Type } from '@google/genai'

// Initialize Gemini client
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null

// Source tier classification (Samsung official = 1, Tech media = 2, Community = 3, Unknown = 4)
function getSourceTier(url: string): 1 | 2 | 3 | 4 {
  if (!url) return 4
  const lowerUrl = url.toLowerCase()

  // Tier 1: Samsung official sources
  if (lowerUrl.includes('samsung.com') ||
      lowerUrl.includes('news.samsung.com') ||
      lowerUrl.includes('samsung.cn')) {
    return 1
  }

  // Tier 2: Authoritative tech media
  const tier2Sources = [
    'theverge.com', 'techcrunch.com', 'wired.com', 'cnet.com', 'engadget.com',
    'gsmarena.com', 'phonearena.com', 'androidauthority.com', 'tomsguide.com',
    'digitaltrends.com', 'mashable.com', 'techradar.com', 'zdnet.com',
    'arstechnica.com', 'reuters.com', 'bloomberg.com', 'forbes.com'
  ]
  if (tier2Sources.some(source => lowerUrl.includes(source))) {
    return 2
  }

  // Tier 3: Community and user-generated
  const tier3Sources = [
    'reddit.com', 'youtube.com', 'quora.com', 'medium.com',
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com'
  ]
  if (tier3Sources.some(source => lowerUrl.includes(source))) {
    return 3
  }

  return 4
}

/**
 * Fetch grounding signals from Google Custom Search
 */
async function fetchGoogleGroundingSignals(
  productName: string,
  keywords: string[]
): Promise<{ sources: GroundingSource[]; queries: string[] }> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CX

  if (!apiKey || !cx) {
    console.warn('[Google Grounding] Missing API key or CX')
    return { sources: [], queries: [] }
  }

  const queries = [
    `${productName} review 2024 2025`,
    `${productName} ${keywords[0] || 'features'} specs`,
    `Samsung ${productName} comparison`,
  ]

  try {
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
            source: 'google' as const,
            tier: getSourceTier(item.link || ''),
          }))
        } catch (err) {
          console.warn(`[Google Grounding] Query error: ${err}`)
          return []
        }
      })
    )

    const allSources = results.flat()
    console.log(`[Google Grounding] Fetched ${allSources.length} results`)
    return { sources: allSources, queries }
  } catch (error) {
    console.error('[Google Grounding] Failed:', error)
    return { sources: [], queries }
  }
}

/**
 * Fetch grounding signals from Perplexity
 */
async function fetchPerplexityGroundingSignals(
  productName: string,
  keywords: string[]
): Promise<{ sources: GroundingSource[]; queries: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    console.warn('[Perplexity Grounding] No API key')
    return { sources: [], queries: [] }
  }

  const queries = [
    `${productName} reviews 2024 2025`,
    `${productName} features specifications`,
    `${productName} ${keywords[0] || 'camera'} performance`,
  ]

  try {
    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const response = await fetch('https://api.perplexity.ai/search', {
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

          if (!response.ok) {
            console.warn(`[Perplexity Grounding] Search failed: ${response.status}`)
            return []
          }

          const data = await response.json()
          return (data.results || []).map((item: { title?: string; snippet?: string; url?: string; date?: string }) => ({
            title: item.title,
            snippet: item.snippet,
            url: item.url,
            date: item.date,
            source: 'perplexity' as const,
            tier: getSourceTier(item.url || ''),
          }))
        } catch (err) {
          console.warn(`[Perplexity Grounding] Query error: ${err}`)
          return []
        }
      })
    )

    const allSources = results.flat()
    console.log(`[Perplexity Grounding] Fetched ${allSources.length} results`)
    return { sources: allSources, queries }
  } catch (error) {
    console.error('[Perplexity Grounding] Failed:', error)
    return { sources: [], queries }
  }
}

/**
 * Run grounding test (fetches from both Google and Perplexity)
 */
async function runGroundingTest(
  productName: string,
  keywords: string[]
): Promise<GroundingTestResult> {
  const [googleResult, perplexityResult] = await Promise.all([
    fetchGoogleGroundingSignals(productName, keywords),
    fetchPerplexityGroundingSignals(productName, keywords),
  ])

  const allSources = [...googleResult.sources, ...perplexityResult.sources]
  const allQueries = [...googleResult.queries, ...perplexityResult.queries]

  // Calculate tier breakdown
  const tierBreakdown: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  allSources.forEach(source => {
    if (source.tier) {
      tierBreakdown[source.tier]++
    }
  })

  return {
    sources: allSources,
    totalResults: allSources.length,
    googleResults: googleResult.sources.length,
    perplexityResults: perplexityResult.sources.length,
    queriesUsed: allQueries,
    tierBreakdown,
  }
}

// Sample test data for different stages
const SAMPLE_CONTEXT: Record<Stage, { transcript: string; usps?: string[]; productDescription?: string }> = {
  description: {
    transcript: 'Galaxy Z Flip7 features a stunning 50MP camera with FlexWindow preview, 3.4-inch cover display for quick selfies, and the new Gemini Live AI assistant for natural conversations. The foldable design is now more durable with improved hinge technology.',
    productDescription: 'Samsung Galaxy Z Flip7 - The compact foldable that fits your style with flagship camera capabilities.'
  },
  usp: {
    transcript: 'Galaxy Z Flip7 features a stunning 50MP camera with FlexWindow preview, 3.4-inch cover display for quick selfies, and the new Gemini Live AI assistant for natural conversations.',
  },
  faq: {
    transcript: 'Galaxy Z Flip7 offers FlexWindow selfies with the 50MP rear camera, all-day battery life with wireless charging, and Galaxy AI features like Now Brief and Gemini Live.',
    usps: ['50MP FlexWindow Camera', 'All-day Battery Life', 'Galaxy AI Features'],
  },
  chapters: {
    transcript: '00:00 Intro to Galaxy Z Flip7, 00:16 Design and FlexWindow, 00:33 50MP Camera System, 01:00 Now Brief AI Feature, 01:37 Gemini Live Demo, 02:15 Battery and Charging, 02:45 Conclusion',
  },
  case_studies: {
    transcript: 'Content creators love the FlexWindow for hands-free selfies. The compact design fits in any pocket. Galaxy AI helps with productivity throughout the day.',
    usps: ['FlexWindow Selfies', 'Compact Foldable Design', 'Galaxy AI Productivity'],
  },
  keywords: {
    transcript: 'Galaxy Z Flip7 foldable smartphone with 50MP camera, FlexWindow, Galaxy AI, Gemini Live, compact design, all-day battery.',
  },
  hashtags: {
    transcript: 'Galaxy Z Flip7 with FlexWindow, 50MP camera, Galaxy AI, foldable phone design.',
    usps: ['FlexWindow', '50MP Camera', 'Galaxy AI', 'Foldable Design'],
  },
}

// Mock LLM response for testing
async function generateMockResponse(
  composedPrompt: string,
  userMessage: string,
  engine: Engine,
  stage?: Stage
): Promise<{ output: string; inputTokens: number; outputTokens: number }> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500))

  const inputTokens = Math.ceil((composedPrompt.length + userMessage.length) / 4)

  const stageOutputs: Record<Stage, string> = {
    description: `{
  "first_130": "Introducing the all-new Galaxy Z Flip7. Capture stunning 50 MP selfies with FlexWindow, powered by Galaxy AI for your best moments.",
  "full_description": "Introducing the all-new Galaxy Z Flip7. Capture stunning 50 MP selfies using the FlexWindow preview on the 3.4-inch cover display. With Galaxy AI features like Now Brief and Gemini Live, stay connected and productive throughout your day. The improved foldable design is more durable than ever, fitting perfectly in your pocket. Learn more: http://smsng.co/ZFlip7_yt",
  "vanity_link": "ZFlip7_Intro_yt"
}`,
    usp: `{
  "usps": [
    {
      "feature": "50 MP FlexWindow selfies",
      "category": "Camera",
      "differentiation": "Uses rear camera quality for selfies via 3.4-inch cover display preview",
      "user_benefit": "Professional-quality selfies without opening the phone",
      "evidence": {"sources": ["Video content"], "quotes": ["50MP camera with FlexWindow preview"]},
      "confidence": "high"
    },
    {
      "feature": "Gemini Live AI Assistant",
      "category": "AI",
      "differentiation": "Natural conversational AI built into the device",
      "user_benefit": "Hands-free assistance and productivity",
      "evidence": {"sources": ["Video content"], "quotes": ["Gemini Live AI assistant for natural conversations"]},
      "confidence": "high"
    }
  ],
  "competitive_context": "Leads foldable market with integrated AI features",
  "extraction_method": "grounded"
}`,
    faq: `{
  "faqs": [
    {"question": "How does the Galaxy Z Flip7 FlexWindow camera feature work for taking high-quality selfies hands-free?", "answer": "The Galaxy Z Flip7 uses its 50 MP rear camera for selfies, with the 3.4-inch FlexWindow cover display serving as your preview screen. Simply open FlexWindow, position yourself in the frame, and capture professional-quality selfies using the main camera system."},
    {"question": "What Galaxy AI features are included with the Z Flip7 and how do they improve daily productivity?", "answer": "Galaxy Z Flip7 includes Now Brief for personalized morning summaries, Gemini Live for natural voice conversations, and other AI-powered tools. These features help you stay organized, answer questions, and complete tasks more efficiently throughout your day."}
  ],
  "count": 2
}`,
    chapters: `{
  "chapters": [
    {"time": "00:00", "title": "Intro"},
    {"time": "00:16", "title": "Design FlexWindow"},
    {"time": "00:33", "title": "50MP Camera"},
    {"time": "01:00", "title": "Now Brief AI"},
    {"time": "01:37", "title": "Gemini Live"},
    {"time": "02:15", "title": "Battery Life"}
  ],
  "reasoning": "Selected chapters that highlight key product features and AI capabilities for maximum searchability"
}`,
    case_studies: `{
  "case_studies": [
    {
      "persona": "Content Creator",
      "challenge": "Needs high-quality selfies for social media without carrying extra equipment",
      "solution": "Uses Galaxy Z Flip7's FlexWindow with 50MP rear camera for hands-free selfie recording",
      "outcome": "Can capture professional-quality content anywhere with just their phone",
      "usp_reference": "FlexWindow Selfies"
    }
  ]
}`,
    keywords: `{
  "product_keywords": ["Galaxy Z Flip7", "FlexWindow", "Galaxy AI", "Now Brief", "Gemini Live"],
  "generic_keywords": ["foldable phone", "50MP camera", "AI smartphone", "compact design", "selfie camera"],
  "density_score": 18,
  "question_score": 17,
  "structure_score": 14,
  "length_score": 13,
  "preliminary_total": 62
}`,
    hashtags: `{
  "hashtags": ["#GalaxyZFlip7", "#FlexWindow", "#FoldablePhone", "#Samsung", "#GalaxyAI", "#50MPCamera"],
  "categories": {
    "brand": ["#GalaxyZFlip7", "#Samsung", "#GalaxyAI"],
    "features": ["#FlexWindow", "#50MPCamera", "#FoldablePhone"],
    "industry": ["#MobilePhotography", "#TechReview"]
  },
  "reasoning": "Prioritized product-specific and feature hashtags for discoverability"
}`
  }

  const output = stage && stageOutputs[stage]
    ? stageOutputs[stage]
    : `[${engine.toUpperCase()} Mock Response]\n\nGenerated content based on the composed prompt.\n\nThis is a test response demonstrating the prompt composition pipeline.`

  const outputTokens = Math.ceil(output.length / 4)

  return { output, inputTokens, outputTokens }
}

// Live LLM call for actual testing
async function generateLiveResponse(
  composedPrompt: string,
  userMessage: string,
  engine: Engine
): Promise<{ output: string; inputTokens: number; outputTokens: number }> {
  if (engine !== 'gemini') {
    throw new Error(`Live testing currently only supports Gemini. Engine: ${engine}`)
  }

  if (!genAI) {
    throw new Error('GEMINI_API_KEY not configured for live testing')
  }

  const model = genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userMessage,
    config: {
      systemInstruction: composedPrompt,
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  })

  const response = await model
  const output = response.text || ''

  // Estimate tokens (actual usage not available in all API versions)
  const inputTokens = Math.ceil((composedPrompt.length + userMessage.length) / 4)
  const outputTokens = Math.ceil(output.length / 4)

  return { output, inputTokens, outputTokens }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PromptTestRequest
    const { system_prompt, engine, variables, user_message, stage, language = 'en', live = false, testMode = 'llm' } = body

    // Handle grounding test mode
    if (testMode === 'grounding') {
      const startTime = Date.now()

      const productName = variables?.product_name || 'Galaxy Z Flip7'
      const keywordsStr = variables?.keywords || ''
      const keywords = keywordsStr.split(',').map((k: string) => k.trim()).filter(Boolean)

      try {
        const groundingResult = await runGroundingTest(productName, keywords)
        const latency = Date.now() - startTime

        const response: PromptTestResponse = {
          output: `Grounding test completed. Found ${groundingResult.totalResults} sources (Google: ${groundingResult.googleResults}, Perplexity: ${groundingResult.perplexityResults})`,
          tokens: { input: 0, output: 0, total: 0 },
          latency,
          source: 'live',
          groundingResult,
        }

        return NextResponse.json(response)
      } catch (groundingError) {
        console.error('Grounding test error:', groundingError)
        return NextResponse.json({
          output: '',
          tokens: { input: 0, output: 0, total: 0 },
          latency: Date.now() - startTime,
          error: groundingError instanceof Error ? groundingError.message : 'Grounding test failed',
        }, { status: 500 })
      }
    }

    // Validate required fields for LLM test
    if (!system_prompt || !engine) {
      return NextResponse.json(
        { error: 'Missing required fields: system_prompt, engine' },
        { status: 400 }
      )
    }

    // Validate engine
    const validEngines: Engine[] = ['gemini', 'perplexity', 'cohere']
    if (!validEngines.includes(engine)) {
      return NextResponse.json(
        { error: `Invalid engine. Must be one of: ${validEngines.join(', ')}` },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Compose the full prompt with stage-specific instructions if stage is provided
    let composedPrompt: string
    if (stage) {
      composedPrompt = composeStagePrompt({
        stage,
        basePrompt: system_prompt,
        language,
        antiFabricationLevel: 'high',
      })
    } else {
      composedPrompt = system_prompt
    }

    // Interpolate variables
    const mergedVariables = {
      product_name: 'Galaxy Z Flip7',
      category: 'Foldable Smartphone',
      ...variables,
    }
    composedPrompt = interpolatePrompt(composedPrompt, mergedVariables)

    // Build user message with sample context if stage is provided
    let finalUserMessage = user_message || 'Generate content based on the system prompt.'
    if (stage && !user_message) {
      const sampleData = SAMPLE_CONTEXT[stage]
      finalUserMessage = `Generate ${stage} content for Galaxy Z Flip7.

Video Transcript:
${sampleData.transcript}

${sampleData.usps ? `USPs: ${sampleData.usps.join(', ')}` : ''}
${sampleData.productDescription ? `Product Description: ${sampleData.productDescription}` : ''}`
    }

    // Generate response (mock or live)
    let output: string
    let inputTokens: number
    let outputTokens: number
    let source: 'mock' | 'live' = 'mock'

    if (live && engine === 'gemini') {
      try {
        const result = await generateLiveResponse(composedPrompt, finalUserMessage, engine)
        output = result.output
        inputTokens = result.inputTokens
        outputTokens = result.outputTokens
        source = 'live'
      } catch (liveError) {
        console.error('Live generation failed, falling back to mock:', liveError)
        const result = await generateMockResponse(composedPrompt, finalUserMessage, engine, stage)
        output = result.output
        inputTokens = result.inputTokens
        outputTokens = result.outputTokens
        source = 'mock'
      }
    } else {
      const result = await generateMockResponse(composedPrompt, finalUserMessage, engine, stage)
      output = result.output
      inputTokens = result.inputTokens
      outputTokens = result.outputTokens
    }

    const latency = Date.now() - startTime

    const response: PromptTestResponse = {
      output,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      latency,
      composedPrompt,
      source,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Prompt test error:', error)

    const errorResponse: PromptTestResponse = {
      output: '',
      tokens: { input: 0, output: 0, total: 0 },
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
