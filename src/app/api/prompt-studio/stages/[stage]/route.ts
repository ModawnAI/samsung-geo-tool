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
    // Handle case where table doesn't exist yet (PGRST204) or record not found (PGRST116)
    let data = null
    let fetchError = null

    try {
      const result = await (supabase
        .from('stage_prompts' as any)
        .select('*')
        .eq('stage', stage)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single() as any)
      data = result.data
      fetchError = result.error
    } catch (e) {
      // Table might not exist
      console.warn('[API] stage_prompts table access failed:', e)
      fetchError = { code: 'TABLE_ERROR' }
    }

    // If no record found or table doesn't exist, return default prompt
    if (fetchError) {
      if (fetchError.code === 'PGRST116' || fetchError.code === '42P01' || fetchError.code === 'TABLE_ERROR') {
        // No stage-specific record found or table doesn't exist
        // Load the base prompt from prompt_versions
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
      throw fetchError
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
 * Create a new stage prompt configuration with version history
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
      changeSummary,
    } = body

    // Get next version number
    const { data: versionData } = await (supabase
      .rpc('get_next_stage_version', { p_stage: stage }) as any)
    const nextVersion = versionData || 1

    // Create version history record
    await (supabase
      .from('stage_prompt_versions' as any)
      .insert({
        stage: stage as PromptStage,
        version: nextVersion,
        stage_system_prompt: stageSystemPrompt || null,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        model,
        is_active: workflowStatus === 'active',
        change_summary: changeSummary || `Initial version`,
        created_by: user.id,
      } as any) as any)

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
        current_version: nextVersion,
        total_versions: nextVersion,
        created_by: user.id,
      } as any)
      .select()
      .single() as any)

    if (error) {
      console.error('[API] Insert error:', error)
      throw error
    }

    return NextResponse.json({ stagePrompt: data, version: nextVersion }, { status: 201 })
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
 * Update an existing stage prompt configuration with version history
 *
 * Special handling for activation:
 * - When workflowStatus is set to 'active', this prompt will be used in production
 * - Only one prompt per stage can be active at a time (others are archived)
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
      changeSummary,
    } = body

    // First check if there's an existing record (use type assertion)
    const { data: existing } = await (supabase
      .from('stage_prompts' as any)
      .select('id, current_version, total_versions, stage_system_prompt')
      .eq('stage', stage)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single() as any)

    if (!existing) {
      // No existing record, create via POST logic
      const { data: versionData } = await (supabase
        .rpc('get_next_stage_version', { p_stage: stage }) as any)
      const nextVersion = versionData || 1

      // Create version history
      await (supabase
        .from('stage_prompt_versions' as any)
        .insert({
          stage: stage as PromptStage,
          version: nextVersion,
          stage_system_prompt: stageSystemPrompt || null,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 4096,
          top_p: topP ?? 0.9,
          model: model ?? 'gemini-3-flash-preview',
          is_active: workflowStatus === 'active',
          change_summary: changeSummary || 'Initial version',
          created_by: user.id,
        } as any) as any)

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
          current_version: nextVersion,
          total_versions: nextVersion,
          created_by: user.id,
        } as any)
        .select()
        .single() as any)

      if (error) throw error
      return NextResponse.json({ stagePrompt: data, version: nextVersion }, { status: 201 })
    }

    // Check if content changed (needs new version)
    const contentChanged = stageSystemPrompt !== undefined &&
      stageSystemPrompt !== existing.stage_system_prompt

    let newVersion = existing.current_version || 1
    let totalVersions = existing.total_versions || 1

    // Create new version if content changed
    if (contentChanged) {
      const { data: versionData } = await (supabase
        .rpc('get_next_stage_version', { p_stage: stage }) as any)
      newVersion = versionData || (totalVersions + 1)
      totalVersions = newVersion

      // Save version history
      await (supabase
        .from('stage_prompt_versions' as any)
        .insert({
          stage: stage as PromptStage,
          version: newVersion,
          stage_system_prompt: stageSystemPrompt,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 4096,
          top_p: topP ?? 0.9,
          model: model ?? 'gemini-3-flash-preview',
          is_active: workflowStatus === 'active',
          change_summary: changeSummary || `Version ${newVersion}`,
          created_by: user.id,
        } as any) as any)
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (stageSystemPrompt !== undefined) updateData.stage_system_prompt = stageSystemPrompt
    if (temperature !== undefined) updateData.temperature = temperature
    if (maxTokens !== undefined) updateData.max_tokens = maxTokens
    if (topP !== undefined) updateData.top_p = topP
    if (model !== undefined) updateData.model = model
    if (workflowStatus !== undefined) updateData.workflow_status = workflowStatus
    if (contentChanged) {
      updateData.current_version = newVersion
      updateData.total_versions = totalVersions
    }

    // If activating this prompt, deactivate any other active prompts for this stage
    if (workflowStatus === 'active') {
      const { error: deactivateError } = await (supabase
        .from('stage_prompts' as any) as any)
        .update({ workflow_status: 'archived' })
        .eq('stage', stage)
        .eq('workflow_status', 'active')
        .neq('id', existing.id)

      if (deactivateError) {
        console.warn('[API] Warning: Failed to deactivate other prompts:', deactivateError)
      }

      // Also update version history
      await (supabase
        .from('stage_prompt_versions' as any) as any)
        .update({ is_active: false })
        .eq('stage', stage)
        .eq('is_active', true)

      await (supabase
        .from('stage_prompt_versions' as any) as any)
        .update({ is_active: true })
        .eq('stage', stage)
        .eq('version', newVersion)

      console.log(`[API] Activating stage prompt ${existing.id} for ${stage} stage - version ${newVersion}`)
    }

    // Update existing record
    const { data, error } = await (supabase
      .from('stage_prompts' as any) as any)
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error

    // Include version info in response
    const response: Record<string, unknown> = {
      stagePrompt: data,
      version: newVersion,
      totalVersions,
      versionCreated: contentChanged,
    }
    if (workflowStatus === 'active') {
      response.activated = true
      response.message = `Stage prompt for "${stage}" v${newVersion} is now active.`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] Error updating stage prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
