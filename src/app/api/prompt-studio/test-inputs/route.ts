/**
 * API: /api/prompt-studio/test-inputs
 * CRUD operations for saved test inputs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMPT_STAGES, type PromptStage } from '@/types/prompt-studio'

/**
 * GET /api/prompt-studio/test-inputs
 * Get saved test inputs, optionally filtered by stage
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query (use type assertion until migration is applied)
    let query = supabase
      .from('stage_test_inputs' as any)
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by stage if provided
    if (stage) {
      if (!PROMPT_STAGES.includes(stage as PromptStage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      }
      query = query.eq('stage', stage)
    }

    const { data, error } = await (query as any)

    if (error) {
      console.error('[API] Error fetching test inputs:', error)
      throw error
    }

    return NextResponse.json({ testInputs: data || [] })
  } catch (error) {
    console.error('[API] Error fetching test inputs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompt-studio/test-inputs
 * Save a new test input configuration
 */
export async function POST(request: NextRequest) {
  try {
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

    const { name, stage, inputData, isDefault = false } = body

    // Validate required fields
    if (!name || !stage || !inputData) {
      return NextResponse.json(
        { error: 'Missing required fields: name, stage, inputData' },
        { status: 400 }
      )
    }

    // Validate stage
    if (!PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // If setting as default, unset other defaults for this stage
    if (isDefault) {
      await (supabase
        .from('stage_test_inputs' as any) as any)
        .update({ is_default: false })
        .eq('stage', stage)
        .eq('is_default', true)
    }

    // Insert new test input (use type assertion)
    const { data, error } = await (supabase
      .from('stage_test_inputs' as any)
      .insert({
        name,
        stage,
        input_data: inputData,
        is_default: isDefault,
        created_by: user.id,
      } as any)
      .select()
      .single() as any)

    if (error) {
      console.error('[API] Error saving test input:', error)
      throw error
    }

    return NextResponse.json({ testInput: data }, { status: 201 })
  } catch (error) {
    console.error('[API] Error saving test input:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prompt-studio/test-inputs
 * Delete a test input by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete test input (use type assertion)
    const { error } = await (supabase
      .from('stage_test_inputs' as any)
      .delete()
      .eq('id', id) as any)

    if (error) {
      console.error('[API] Error deleting test input:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting test input:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/prompt-studio/test-inputs
 * Update a test input (name, inputData, isDefault)
 */
export async function PATCH(request: NextRequest) {
  try {
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

    const { id, name, inputData, isDefault } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (inputData !== undefined) updateData.input_data = inputData
    if (isDefault !== undefined) updateData.is_default = isDefault

    // If setting as default, first get the stage and unset other defaults
    if (isDefault) {
      const { data: existing } = await (supabase
        .from('stage_test_inputs' as any)
        .select('stage')
        .eq('id', id)
        .single() as any)

      if (existing) {
        await (supabase
          .from('stage_test_inputs' as any) as any)
          .update({ is_default: false })
          .eq('stage', existing.stage)
          .eq('is_default', true)
          .neq('id', id)
      }
    }

    // Update test input (use type assertion)
    const { data, error } = await (supabase
      .from('stage_test_inputs' as any) as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating test input:', error)
      throw error
    }

    return NextResponse.json({ testInput: data })
  } catch (error) {
    console.error('[API] Error updating test input:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
