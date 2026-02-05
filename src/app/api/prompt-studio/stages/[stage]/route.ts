/**
 * API: /api/prompt-studio/stages/[stage]
 * CRUD operations for individual stage prompts
 *
 * NOTE: Uses explicit type assertions because the stage_prompts table
 * may not exist in the database yet. Apply migration APPLY_PROMPT_STUDIO_TABLES.sql
 * to create the required tables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMPT_STAGES, type PromptStage, type WorkflowStatus } from '@/types/prompt-studio'
import { composeStagePrompt } from '@/lib/tuning/prompt-loader'
import type { Database } from '@/types/database'

// Type aliases for clarity
type StagePromptRow = Database['public']['Tables']['stage_prompts']['Row']
type StagePromptInsert = Database['public']['Tables']['stage_prompts']['Insert']
type StagePromptVersionInsert = Database['public']['Tables']['stage_prompt_versions']['Insert']

interface RouteParams {
  params: Promise<{ stage: string }>
}

/**
 * Check if the stage_prompts table exists by attempting a query
 * Returns true if table exists, false otherwise
 */
async function checkTableExists(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  try {
    // Use raw SQL query to check if table exists
    const { error } = await supabase
      .from('stage_prompts')
      .select('id')
      .limit(1)

    // Table doesn't exist if we get a 42P01 error (undefined_table)
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      return false
    }
    return true
  } catch {
    return false
  }
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

    // Check if table exists first
    const tableExists = await checkTableExists(supabase)
    if (!tableExists) {
      console.warn('[API] stage_prompts table does not exist. Please apply migration APPLY_PROMPT_STUDIO_TABLES.sql')

      // Fall back to base prompt from prompt_versions
      const { data: activePromptData } = await supabase
        .from('prompt_versions')
        .select('system_prompt')
        .eq('engine', 'gemini')
        .eq('is_active', true)
        .single()

      const activePrompt = activePromptData as { system_prompt: string } | null
      const basePrompt = activePrompt?.system_prompt || ''
      const composedPrompt = basePrompt ? composeStagePrompt({
        stage: stage as PromptStage,
        basePrompt,
        language: 'en',
      }) : ''

      return NextResponse.json({
        stagePrompt: null,
        defaultPrompt: composedPrompt,
        basePrompt: basePrompt,
        tableExists: false,
      })
    }

    // Fetch stage prompt with type assertion
    const result = await supabase
      .from('stage_prompts')
      .select('*')
      .eq('stage', stage)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const data = result.data as StagePromptRow | null
    const fetchError = result.error

    // If no record found, return default prompt
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No stage-specific record found
        // Load the base prompt from prompt_versions
        const { data: activePromptData } = await supabase
          .from('prompt_versions')
          .select('system_prompt')
          .eq('engine', 'gemini')
          .eq('is_active', true)
          .single()

        // Compose the default stage prompt
        const activePrompt = activePromptData as { system_prompt: string } | null
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

    // Check if table exists first
    const tableExists = await checkTableExists(supabase)
    if (!tableExists) {
      return NextResponse.json({
        error: 'stage_prompts table does not exist. Please apply migration APPLY_PROMPT_STUDIO_TABLES.sql',
        code: 'TABLE_NOT_FOUND',
      }, { status: 503 })
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

    // Get next version number via RPC (may fail if function doesn't exist)
    let nextVersion = 1
    try {
      const { data: versionData } = await supabase
        .rpc('get_next_stage_version' as never, { p_stage: stage } as never)
      nextVersion = (versionData as unknown as number) || 1
    } catch (rpcError) {
      console.warn('[API] RPC get_next_stage_version failed, using default version 1:', rpcError)
    }

    // Create version history record
    const versionInsert: StagePromptVersionInsert = {
      stage: stage as PromptStage,
      version: nextVersion,
      stage_system_prompt: stageSystemPrompt || null,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      model,
      is_active: workflowStatus === 'active',
      change_summary: changeSummary || 'Initial version',
      created_by: user.id,
    }

    const { error: versionError } = await supabase
      .from('stage_prompt_versions')
      .insert(versionInsert as never)

    if (versionError) {
      console.warn('[API] Failed to create version history:', versionError)
    }

    // Create new stage prompt
    const stagePromptInsert: StagePromptInsert = {
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
    }

    const { data, error } = await supabase
      .from('stage_prompts')
      .insert(stagePromptInsert as never)
      .select()
      .single()

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

    // Check if table exists first
    const tableExists = await checkTableExists(supabase)
    if (!tableExists) {
      return NextResponse.json({
        error: 'stage_prompts table does not exist. Please apply migration APPLY_PROMPT_STUDIO_TABLES.sql',
        code: 'TABLE_NOT_FOUND',
      }, { status: 503 })
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

    // First check if there's an existing record
    const { data: existingData } = await supabase
      .from('stage_prompts')
      .select('id, current_version, total_versions, stage_system_prompt')
      .eq('stage', stage)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const existing = existingData as StagePromptRow | null

    if (!existing) {
      // No existing record, create a new one
      let nextVersion = 1
      try {
        const { data: versionData } = await supabase
          .rpc('get_next_stage_version' as never, { p_stage: stage } as never)
        nextVersion = (versionData as unknown as number) || 1
      } catch {
        console.warn('[API] RPC get_next_stage_version failed, using version 1')
      }

      // Create version history
      const versionInsert: StagePromptVersionInsert = {
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
      }

      await supabase
        .from('stage_prompt_versions')
        .insert(versionInsert as never)

      const stagePromptInsert: StagePromptInsert = {
        stage: stage as PromptStage,
        stage_system_prompt: stageSystemPrompt || null,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
        top_p: topP ?? 0.9,
        model: model ?? 'gemini-3-flash-preview',
        workflow_status: (workflowStatus ?? 'draft') as WorkflowStatus,
        current_version: nextVersion,
        total_versions: nextVersion,
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('stage_prompts')
        .insert(stagePromptInsert as never)
        .select()
        .single()

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
      try {
        const { data: versionData } = await supabase
          .rpc('get_next_stage_version' as never, { p_stage: stage } as never)
        newVersion = (versionData as unknown as number) || (totalVersions + 1)
      } catch {
        newVersion = totalVersions + 1
      }
      totalVersions = newVersion

      // Save version history
      const versionInsert: StagePromptVersionInsert = {
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
      }

      await supabase
        .from('stage_prompt_versions')
        .insert(versionInsert as never)
    }

    // Build update object
    const updateData: Database['public']['Tables']['stage_prompts']['Update'] = {}
    if (stageSystemPrompt !== undefined) updateData.stage_system_prompt = stageSystemPrompt
    if (temperature !== undefined) updateData.temperature = temperature
    if (maxTokens !== undefined) updateData.max_tokens = maxTokens
    if (topP !== undefined) updateData.top_p = topP
    if (model !== undefined) updateData.model = model
    if (workflowStatus !== undefined) updateData.workflow_status = workflowStatus as WorkflowStatus
    if (contentChanged) {
      updateData.current_version = newVersion
      updateData.total_versions = totalVersions
    }

    // If activating this prompt, deactivate any other active prompts for this stage
    if (workflowStatus === 'active') {
      const { error: deactivateError } = await supabase
        .from('stage_prompts')
        .update({ workflow_status: 'archived' } as never)
        .eq('stage', stage)
        .eq('workflow_status', 'active')
        .neq('id', existing.id)

      if (deactivateError) {
        console.warn('[API] Warning: Failed to deactivate other prompts:', deactivateError)
      }

      // Also update version history
      await supabase
        .from('stage_prompt_versions')
        .update({ is_active: false } as never)
        .eq('stage', stage)
        .eq('is_active', true)

      await supabase
        .from('stage_prompt_versions')
        .update({ is_active: true } as never)
        .eq('stage', stage)
        .eq('version', newVersion)

      console.log(`[API] Activating stage prompt ${existing.id} for ${stage} stage - version ${newVersion}`)
    }

    // Update existing record
    const { data, error } = await supabase
      .from('stage_prompts')
      .update(updateData as never)
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
