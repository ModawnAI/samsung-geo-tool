/**
 * API: /api/prompt-studio/stages/[stage]/versions
 * Get version history for a stage prompt
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMPT_STAGES, type PromptStage } from '@/types/prompt-studio'
import type { Database } from '@/types/database'

type StagePromptVersionRow = Database['public']['Tables']['stage_prompt_versions']['Row']

interface RouteParams {
  params: Promise<{ stage: string }>
}

/**
 * Check if the stage_prompt_versions table exists
 */
async function checkTableExists(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('stage_prompt_versions')
      .select('id')
      .limit(1)

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * GET /api/prompt-studio/stages/[stage]/versions
 * Get all versions for a stage prompt
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

    // Check if table exists
    const tableExists = await checkTableExists(supabase)
    if (!tableExists) {
      console.warn('[API] stage_prompt_versions table does not exist')
      return NextResponse.json({
        versions: [],
        tableExists: false,
        message: 'Version history table not available. Please apply migration APPLY_PROMPT_STUDIO_TABLES.sql',
      })
    }

    // Fetch all versions for this stage
    const { data, error } = await supabase
      .from('stage_prompt_versions')
      .select('*')
      .eq('stage', stage)
      .order('version', { ascending: false })

    if (error) {
      console.error('[API] Error fetching versions:', error)
      throw error
    }

    const versions = (data as StagePromptVersionRow[] | null) || []

    // Transform to match expected interface
    const formattedVersions = versions.map((v) => ({
      id: v.id,
      version: v.version,
      stage_system_prompt: v.stage_system_prompt,
      temperature: v.temperature,
      max_tokens: v.max_tokens,
      model: v.model,
      workflow_status: v.is_active ? 'active' : 'archived',
      created_at: v.created_at,
      is_active: v.is_active,
      test_count: v.test_count || 0,
      avg_quality_score: v.avg_quality_score,
      change_summary: v.change_summary,
    }))

    return NextResponse.json({
      versions: formattedVersions,
      total: formattedVersions.length,
    })
  } catch (error) {
    console.error('[API] Error in versions GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompt-studio/stages/[stage]/versions
 * Rollback to a specific version
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

    const { versionId, version } = body

    if (!versionId && !version) {
      return NextResponse.json({ error: 'versionId or version required' }, { status: 400 })
    }

    // Find the version to rollback to
    let query = supabase
      .from('stage_prompt_versions')
      .select('*')
      .eq('stage', stage)

    if (versionId) {
      query = query.eq('id', versionId)
    } else {
      query = query.eq('version', version)
    }

    const { data: versionData, error: versionError } = await query.single()

    if (versionError || !versionData) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    const targetVersion = versionData as StagePromptVersionRow

    // Update the current stage_prompts record with this version's data
    const { data: currentPrompt } = await supabase
      .from('stage_prompts')
      .select('id')
      .eq('stage', stage)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (currentPrompt) {
      const { error: updateError } = await supabase
        .from('stage_prompts')
        .update({
          stage_system_prompt: targetVersion.stage_system_prompt,
          temperature: targetVersion.temperature,
          max_tokens: targetVersion.max_tokens,
          top_p: targetVersion.top_p,
          model: targetVersion.model,
          current_version: targetVersion.version,
        } as never)
        .eq('id', (currentPrompt as { id: string }).id)

      if (updateError) {
        console.error('[API] Error rolling back:', updateError)
        throw updateError
      }
    }

    return NextResponse.json({
      success: true,
      message: `Rolled back to version ${targetVersion.version}`,
      version: targetVersion.version,
    })
  } catch (error) {
    console.error('[API] Error in versions POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
