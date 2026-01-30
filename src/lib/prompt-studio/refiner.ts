/**
 * Prompt Refiner
 * AI-assisted prompt improvement through chat interface
 */

import { GoogleGenAI } from '@google/genai'
import type {
  PromptStage,
  RefinerAction,
  RefinerMessage,
  StageTestInputData,
} from '@/types/prompt-studio'

// ============================================================================
// System Prompts for Each Action
// ============================================================================

const REFINER_SYSTEM_PROMPTS: Record<RefinerAction, string> = {
  analyze: `You are an expert prompt engineer specializing in GEO/AEO (Generative Engine Optimization / AI Engine Optimization) content generation.

Your task is to analyze the given prompt and provide:

1. **Strengths** (what the prompt does well)
   - Clear instructions
   - Good structure
   - Effective constraints

2. **Weaknesses** (areas for improvement)
   - Missing context
   - Vague instructions
   - Potential issues

3. **Specific Recommendations** (actionable improvements)
   - Concrete changes to make
   - Why each change helps
   - Priority order

Be specific and reference exact parts of the prompt. Format your response in clear sections with bullet points.`,

  improve: `You are an expert prompt engineer specializing in GEO/AEO content generation for Samsung products.

Your task is to improve the given prompt based on:
- GEO/AEO best practices (AI-parseable structure, keyword optimization)
- Samsung brand guidelines
- The specific stage requirements

IMPORTANT: Output the improved prompt inside a code block like this:
\`\`\`prompt
[Your improved prompt here]
\`\`\`

Also explain the key changes you made and why.

Principles for improvement:
1. Clear role and context definition
2. Specific, measurable output requirements
3. Structured format guidance
4. Examples where helpful
5. Constraints and edge case handling`,

  test: `You are a prompt evaluation expert. Your task is to compare two versions of a prompt using the provided test input.

For each prompt version:
1. Mentally simulate what output it would produce
2. Evaluate against GEO/AEO criteria:
   - Keyword integration (natural, front-loaded)
   - AI parseability (structured, extractable)
   - Content quality (specific, factual)
   - User intent alignment

Provide:
1. **Predicted Output Comparison** - Key differences in expected outputs
2. **Strengths of Each Version** - What each does better
3. **Winner & Recommendation** - Which version to use and why

Be specific and reference the test input data in your analysis.`,

  chat: `You are a helpful prompt engineering assistant specializing in GEO/AEO content generation for Samsung products.

Help the user refine their prompt based on their specific questions or requests.

If they ask for prompt modifications, provide the updated prompt in a code block:
\`\`\`prompt
[Updated prompt here]
\`\`\`

Be conversational but focused on actionable improvements.`,
}

// ============================================================================
// Code Block Extraction
// ============================================================================

/**
 * Extract code blocks from AI response
 * Supports both ```prompt and generic ``` blocks
 */
export function extractCodeBlocks(content: string): string[] {
  const blocks: string[] = []

  // Match ```prompt ... ``` blocks first (higher priority)
  const promptRegex = /```prompt\s*([\s\S]*?)```/g
  let match
  while ((match = promptRegex.exec(content)) !== null) {
    const extracted = match[1].trim()
    if (extracted) {
      blocks.push(extracted)
    }
  }

  // If no prompt blocks, try generic code blocks (but skip JSON/code)
  if (blocks.length === 0) {
    const genericRegex = /```(?!json|javascript|typescript|python|sql|bash|sh|css|html)(\w*)\s*([\s\S]*?)```/g
    while ((match = genericRegex.exec(content)) !== null) {
      const extracted = match[2].trim()
      // Only include if it looks like a prompt (contains instructions/text, not code)
      if (extracted && extracted.length > 100 && !extracted.includes('function ') && !extracted.includes('const ')) {
        blocks.push(extracted)
      }
    }
  }

  return blocks
}

/**
 * Create a unique message ID
 */
export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a timestamp
 */
export function createTimestamp(): string {
  return new Date().toISOString()
}

// ============================================================================
// Message Building
// ============================================================================

/**
 * Build the user message for a specific action
 */
export function buildUserMessage(
  action: RefinerAction,
  currentPrompt: string,
  improvedPrompt?: string,
  userMessage?: string,
  testInput?: StageTestInputData
): string {
  switch (action) {
    case 'analyze':
      return `Please analyze this prompt:

\`\`\`
${currentPrompt}
\`\`\`

Identify strengths, weaknesses, and specific recommendations for improvement.`

    case 'improve':
      return `Please improve this prompt for better GEO/AEO performance:

\`\`\`
${currentPrompt}
\`\`\`

${userMessage ? `\nSpecific focus: ${userMessage}` : ''}

Provide the improved version in a \`\`\`prompt code block.`

    case 'test':
      const testInputStr = testInput
        ? `\n\nTest Input:\n${JSON.stringify(testInput, null, 2)}`
        : ''

      return `Compare these two prompt versions:

**Current Prompt:**
\`\`\`
${currentPrompt}
\`\`\`

**Improved Prompt:**
\`\`\`
${improvedPrompt || currentPrompt}
\`\`\`
${testInputStr}

Evaluate which version would produce better GEO/AEO optimized content.`

    case 'chat':
    default:
      return userMessage || 'How can I help improve this prompt?'
  }
}

/**
 * Build conversation history for context
 */
export function buildConversationHistory(
  messages: RefinerMessage[],
  maxMessages: number = 10
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.role !== 'system')
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
}

// ============================================================================
// AI Execution
// ============================================================================

interface RefinerExecutionParams {
  action: RefinerAction
  currentPrompt: string
  improvedPrompt?: string
  userMessage?: string
  testInput?: StageTestInputData
  conversationHistory?: RefinerMessage[]
  stage: PromptStage
}

interface RefinerExecutionResult {
  content: string
  codeBlocks: string[]
}

/**
 * Execute refiner chat with Gemini
 */
export async function executeRefinerChat(
  params: RefinerExecutionParams
): Promise<RefinerExecutionResult> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured')
  }

  const {
    action,
    currentPrompt,
    improvedPrompt,
    userMessage,
    testInput,
    conversationHistory = [],
    stage,
  } = params

  // Get system prompt for action
  const systemPrompt = REFINER_SYSTEM_PROMPTS[action]

  // Build user message
  const userContent = buildUserMessage(
    action,
    currentPrompt,
    improvedPrompt,
    userMessage,
    testInput
  )

  // Build messages array
  const messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

  // Add conversation history
  const history = buildConversationHistory(conversationHistory)
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })
  }

  // Add current user message
  messages.push({
    role: 'user',
    parts: [{ text: userContent }],
  })

  // Initialize Gemini
  const genAI = new GoogleGenAI({ apiKey })

  // Use Gemini 2.0 Flash for faster responses
  const result = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: messages,
    config: {
      systemInstruction: systemPrompt + `\n\nContext: This is for the "${stage}" stage of a Samsung GEO content generation pipeline.`,
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.9,
    },
  })

  const content = result.text || ''

  // Extract code blocks
  const codeBlocks = extractCodeBlocks(content)

  return {
    content,
    codeBlocks,
  }
}

// ============================================================================
// Session Title Generation
// ============================================================================

/**
 * Generate a title for a refine session based on first messages
 */
export function generateSessionTitle(
  stage: PromptStage,
  action: RefinerAction,
  currentPrompt: string
): string {
  // Extract first meaningful words from prompt
  const promptPreview = currentPrompt
    .replace(/[#*`]/g, '')
    .split('\n')[0]
    .slice(0, 30)
    .trim()

  const actionLabel = {
    analyze: 'Analysis',
    improve: 'Improvement',
    test: 'Test',
    chat: 'Chat',
  }[action]

  const stageLabel = stage.charAt(0).toUpperCase() + stage.slice(1)

  return `${stageLabel} ${actionLabel}: ${promptPreview}...`
}
