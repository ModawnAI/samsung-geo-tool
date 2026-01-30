/**
 * API: /api/prompt-studio/refine/sessions/[id]
 * CRUD operations for individual refiner sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RefinerMessage, RefineSession, PromptStage } from '@/types/prompt-studio'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Type for full session data from database
interface SessionData {
  id: string
  stage: string
  title: string | null
  messages: unknown
  current_prompt: string | null
  improved_prompt: string | null
  is_favorite: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * GET /api/prompt-studio/refine/sessions/[id]
 * Get a single session with all messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch session - use type assertion
    const { data, error } = await (supabase
      .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)
      .single() as { data: SessionData | null; error: { code: string } | null }

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Transform to RefineSession
    const session: RefineSession = {
      id: data.id,
      stage: data.stage as PromptStage,
      title: data.title,
      messages: (data.messages as RefinerMessage[]) || [],
      currentPrompt: data.current_prompt,
      improvedPrompt: data.improved_prompt,
      isFavorite: data.is_favorite,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('[API] Error fetching session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/prompt-studio/refine/sessions/[id]
 * Update session (title, favorite status, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, isFavorite, currentPrompt, improvedPrompt, messages } = body

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (isFavorite !== undefined) updateData.is_favorite = isFavorite
    if (currentPrompt !== undefined) updateData.current_prompt = currentPrompt
    if (improvedPrompt !== undefined) updateData.improved_prompt = improvedPrompt
    if (messages !== undefined) updateData.messages = messages

    // Update session - use type assertion
    const { data, error } = await (supabase
      .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single() as { data: SessionData | null; error: { code: string } | null }

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('[API] Error updating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prompt-studio/refine/sessions/[id]
 * Delete a session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete session - use type assertion
    const { error } = await (supabase
      .from('prompt_refine_sessions' as 'prompt_refine_sessions') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('id', id)
      .eq('created_by', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
