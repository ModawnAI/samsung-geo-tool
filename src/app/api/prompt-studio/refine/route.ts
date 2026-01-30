/**
 * API: /api/prompt-studio/refine
 * Main endpoint for refiner chat interactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  PROMPT_STAGES,
  type PromptStage,
  type RefinerAction,
  type RefinerMessage,
  type RefineRequest,
} from '@/types/prompt-studio'
import {
  executeRefinerChat,
  createMessageId,
  createTimestamp,
  generateSessionTitle,
} from '@/lib/prompt-studio/refiner'

const VALID_ACTIONS: RefinerAction[] = ['analyze', 'improve', 'test', 'chat']

// Type for session data from database
interface SessionData {
  id: string
  messages: unknown
  improved_prompt: string | null
}

/**
 * POST /api/prompt-studio/refine
 * Execute a refiner chat action
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RefineRequest = await request.json()
    const { sessionId, stage, action, userMessage, currentPrompt, testInput } = body

    // Validate stage
    if (!PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Validate action
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Validate currentPrompt
    if (!currentPrompt || currentPrompt.trim() === '') {
      return NextResponse.json({ error: 'Current prompt is required' }, { status: 400 })
    }

    // Load existing session or create new one
    let session: {
      id: string
      messages: RefinerMessage[]
      improved_prompt: string | null
    } | null = null

    if (sessionId) {
      // Use type assertion for table that may not exist yet in Supabase types
      const result = await (supabase
        .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
        .select('id, messages, improved_prompt')
        .eq('id', sessionId)
        .eq('created_by', user.id)
        .single()

      const data = result.data as SessionData | null
      const error = result.error as { code: string } | null

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        session = {
          id: data.id,
          messages: (data.messages as RefinerMessage[]) || [],
          improved_prompt: data.improved_prompt,
        }
      }
    }

    // Create user message
    const userMsg: RefinerMessage = {
      id: createMessageId(),
      role: 'user',
      content: action === 'chat' ? (userMessage || '') : `[${action.toUpperCase()}]`,
      action,
      timestamp: createTimestamp(),
    }

    // Execute AI chat
    const conversationHistory = session?.messages || []
    const result = await executeRefinerChat({
      action,
      currentPrompt,
      improvedPrompt: session?.improved_prompt || undefined,
      userMessage,
      testInput,
      conversationHistory,
      stage: stage as PromptStage,
    })

    // Create assistant message
    const assistantMsg: RefinerMessage = {
      id: createMessageId(),
      role: 'assistant',
      content: result.content,
      codeBlocks: result.codeBlocks,
      timestamp: createTimestamp(),
    }

    // Update messages array
    const updatedMessages = [...conversationHistory, userMsg, assistantMsg]

    // Update improved prompt if we extracted code blocks
    const improvedPrompt = result.codeBlocks.length > 0
      ? result.codeBlocks[0]
      : session?.improved_prompt || null

    // Save or update session
    let finalSessionId = sessionId

    if (session) {
      // Update existing session
      await (supabase
        .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
        .update({
          messages: updatedMessages,
          improved_prompt: improvedPrompt,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', session.id)
    } else {
      // Create new session
      const title = generateSessionTitle(stage as PromptStage, action, currentPrompt)

      const insertResult = await (supabase
        .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
        .insert({
          stage,
          title,
          messages: updatedMessages,
          current_prompt: currentPrompt,
          improved_prompt: improvedPrompt,
          created_by: user.id,
        } as Record<string, unknown>)
        .select('id')
        .single()

      const newSession = insertResult.data as { id: string } | null
      const insertError = insertResult.error

      if (insertError) throw insertError
      finalSessionId = newSession?.id
    }

    return NextResponse.json({
      sessionId: finalSessionId,
      message: assistantMsg,
      codeBlocks: result.codeBlocks,
    })
  } catch (error) {
    console.error('[API] Error in refine chat:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
