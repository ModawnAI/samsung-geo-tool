import { NextRequest, NextResponse } from 'next/server'
import type { PromptTestRequest, PromptTestResponse, Engine } from '@/types/tuning'

// Mock LLM response for testing - in production, this would call actual LLM APIs
async function generateTestResponse(
  systemPrompt: string,
  userMessage: string,
  engine: Engine
): Promise<{ output: string; inputTokens: number; outputTokens: number }> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))

  // Estimate token counts (rough approximation: ~4 chars per token)
  const inputTokens = Math.ceil((systemPrompt.length + userMessage.length) / 4)

  // Generate mock output based on engine
  const engineResponses: Record<Engine, string> = {
    gemini: `[Gemini Response]\n\nBased on the system prompt and user request, here is the generated content:\n\n${userMessage}\n\nThis response demonstrates structured content generation with emphasis on:\n- Clear organization\n- Key message delivery\n- Brand alignment`,
    perplexity: `[Perplexity Response]\n\nResearch-backed content generation:\n\n${userMessage}\n\nKey insights from verified sources:\n1. Fact-checked information\n2. Citation-ready content\n3. Comprehensive coverage`,
    cohere: `[Cohere Response]\n\nSemantic-enhanced content:\n\n${userMessage}\n\nContent optimized for:\n- Semantic relevance\n- Keyword integration\n- Search visibility`,
  }

  const output = engineResponses[engine]
  const outputTokens = Math.ceil(output.length / 4)

  return { output, inputTokens, outputTokens }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PromptTestRequest
    const { system_prompt, engine, variables, user_message } = body

    // Validate required fields
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

    // Interpolate variables into system prompt
    let interpolatedPrompt = system_prompt
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        interpolatedPrompt = interpolatedPrompt.replace(regex, value)
      })
    }

    // Generate test response
    const userPrompt = user_message || 'Generate content based on the system prompt.'
    const { output, inputTokens, outputTokens } = await generateTestResponse(
      interpolatedPrompt,
      userPrompt,
      engine
    )

    const latency = Date.now() - startTime

    const response: PromptTestResponse = {
      output,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      latency,
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
