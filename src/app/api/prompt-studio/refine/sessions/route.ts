/**
 * API: /api/prompt-studio/refine/sessions
 * List and create refiner sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  PROMPT_STAGES,
  type PromptStage,
  type RefineSessionSummary,
} from '@/types/prompt-studio'

// Type for session row from database
interface SessionRow {
  id: string
  stage: string
  title: string | null
  messages: unknown[]
  is_favorite: boolean
  updated_at: string
}

/**
 * GET /api/prompt-studio/refine/sessions
 * List refiner sessions, optionally filtered by stage
 */
export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const favoritesOnly = searchParams.get('favorites') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Validate stage if provided
    if (stage && !PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Build query - use type assertion for table that may not exist yet
    let query = (supabase
      .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
      .select('id, stage, title, messages, is_favorite, updated_at')
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (stage) {
      query = query.eq('stage', stage)
    }

    if (favoritesOnly) {
      query = query.eq('is_favorite', true)
    }

    const { data, error } = await query as { data: SessionRow[] | null; error: Error | null }

    if (error) throw error

    // Transform to summaries
    const sessions: RefineSessionSummary[] = (data || []).map((session) => ({
      id: session.id,
      stage: session.stage as PromptStage,
      title: session.title,
      messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
      isFavorite: session.is_favorite,
      updatedAt: session.updated_at,
    }))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('[API] Error listing sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompt-studio/refine/sessions
 * Create a new empty session
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

    const body = await request.json()
    const { stage, title, currentPrompt } = body

    // Validate stage
    if (!stage || !PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Create session - use type assertion
    const { data, error } = await (supabase
      .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
      .insert({
        stage,
        title: title || `New ${stage} session`,
        messages: [],
        current_prompt: currentPrompt || null,
        created_by: user.id,
      } as Record<string, unknown>)
      .select()
      .single() as { data: SessionRow | null; error: Error | null }

    if (error) throw error

    return NextResponse.json({ session: data }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
