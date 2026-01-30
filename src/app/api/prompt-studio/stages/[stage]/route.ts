/**
 * API: /api/prompt-studio/stages/[stage]
 * CRUD operations for individual stage prompts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMPT_STAGES, type PromptStage, type WorkflowStatus } from '@/types/prompt-studio'
import { composeStagePrompt } from '@/lib/tuning/prompt-loader'

interface RouteParams {
  params: Promise<{ stage: string }>
}

/**
 * GET /api/prompt-studio/stages/[stage]
 * Get the current stage prompt configuration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stage } = await params
    const supabase = await createClient()

    // Validate stage
    if (!PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch stage prompt (use type assertion until migration is applied)
    const { data, error } = await (supabase
      .from('stage_prompts' as any)
      .select('*')
      .eq('stage', stage)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single() as any)

    if (error) {
      if (error.code === 'PGRST116') {
        // No stage-specific record found, load the base prompt from prompt_versions
        const { data: activePrompt } = await supabase
          .from('prompt_versions')
          .select('system_prompt')
          .eq('engine', 'gemini')
          .eq('is_active', true)
          .single() as { data: { system_prompt: string } | null }

        // Compose the default stage prompt
        const basePrompt = activePrompt?.system_prompt || ''
        const composedPrompt = basePrompt ? composeStagePrompt({
          stage: stage as PromptStage,
          basePrompt,
          language: 'en',
        }) : ''

        // Return a virtual stage prompt with defaults
        return NextResponse.json({
          stagePrompt: null,
          defaultPrompt: composedPrompt,
          basePrompt: basePrompt,
        })
      }
      throw error
    }

    return NextResponse.json({ stagePrompt: data })
  } catch (error) {
    console.error('[API] Error fetching stage prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompt-studio/stages/[stage]
 * Create a new stage prompt configuration
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stage } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate stage
    if (!PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      stageSystemPrompt,
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9,
      model = 'gemini-3-flash-preview',
      workflowStatus = 'draft',
      promptVersionId,
    } = body

    // Create new stage prompt (use type assertion until migration is applied)
    const { data, error } = await (supabase
      .from('stage_prompts' as any)
      .insert({
        stage: stage as PromptStage,
        stage_system_prompt: stageSystemPrompt || null,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        model,
        workflow_status: workflowStatus as WorkflowStatus,
        prompt_version_id: promptVersionId || null,
        created_by: user.id,
      } as any)
      .select()
      .single() as any)

    if (error) {
      console.error('[API] Insert error:', error)
      throw error
    }

    return NextResponse.json({ stagePrompt: data }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating stage prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/prompt-studio/stages/[stage]
 * Update an existing stage prompt configuration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { stage } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate stage
    if (!PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      stageSystemPrompt,
      temperature,
      maxTokens,
      topP,
      model,
      workflowStatus,
    } = body

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (stageSystemPrompt !== undefined) updateData.stage_system_prompt = stageSystemPrompt
    if (temperature !== undefined) updateData.temperature = temperature
    if (maxTokens !== undefined) updateData.max_tokens = maxTokens
    if (topP !== undefined) updateData.top_p = topP
    if (model !== undefined) updateData.model = model
    if (workflowStatus !== undefined) updateData.workflow_status = workflowStatus

    // First check if there's an existing record (use type assertion)
    const { data: existing } = await (supabase
      .from('stage_prompts' as any)
      .select('id')
      .eq('stage', stage)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single() as any)

    if (!existing) {
      // No existing record, create a new one
      const { data, error } = await (supabase
        .from('stage_prompts' as any)
        .insert({
          stage: stage as PromptStage,
          stage_system_prompt: stageSystemPrompt || null,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 4096,
          top_p: topP ?? 0.9,
          model: model ?? 'gemini-3-flash-preview',
          workflow_status: workflowStatus ?? 'draft',
          created_by: user.id,
        } as any)
        .select()
        .single() as any)

      if (error) throw error
      return NextResponse.json({ stagePrompt: data }, { status: 201 })
    }

    // Update existing record
    const { data, error } = await (supabase
      .from('stage_prompts' as any) as any)
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ stagePrompt: data })
  } catch (error) {
    console.error('[API] Error updating stage prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
