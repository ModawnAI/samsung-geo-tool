import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all prompt versions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const engine = searchParams.get('engine')
    // Support both 'activeOnly' (frontend) and 'is_active' (legacy) params
    const activeOnlyParam = searchParams.get('activeOnly')
    const isActiveParam = searchParams.get('is_active')
    const isActive = activeOnlyParam ?? isActiveParam
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('prompt_versions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (engine) {
      query = query.eq('engine', engine)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching prompts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      prompts: data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Prompts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
  }
}

// POST - Create a new prompt version
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, version, engine, system_prompt, description, is_active } = body

    if (!name || !version || !engine || !system_prompt) {
      return NextResponse.json(
        { error: 'name, version, engine, and system_prompt are required' },
        { status: 400 }
      )
    }

    if (!['gemini', 'perplexity', 'cohere'].includes(engine)) {
      return NextResponse.json(
        { error: 'engine must be one of: gemini, perplexity, cohere' },
        { status: 400 }
      )
    }

    // If setting this prompt as active, deactivate others for the same engine first
    if (is_active === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('prompt_versions')
        .update({ is_active: false })
        .eq('engine', engine)
        .eq('is_active', true)
    }

    const insertData = {
      name,
      version,
      engine,
      system_prompt,
      description: description || null,
      is_active: is_active === true,
      created_by: user.id,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('prompt_versions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating prompt:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prompt: data }, { status: 201 })
  } catch (error) {
    console.error('Prompts POST error:', error)
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
  }
}

// PATCH - Update a prompt version
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, version, engine, system_prompt, description, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 })
    }

    // If setting this prompt as active, deactivate others for the same engine
    if (is_active === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentPrompt } = await (supabase as any)
        .from('prompt_versions')
        .select('engine')
        .eq('id', id)
        .single()

      if (currentPrompt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('prompt_versions')
          .update({ is_active: false })
          .eq('engine', currentPrompt.engine)
          .eq('is_active', true)
          .neq('id', id)
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name
    if (version !== undefined) updateData.version = version
    if (engine !== undefined) updateData.engine = engine
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt
    if (description !== undefined) updateData.description = description
    if (is_active !== undefined) updateData.is_active = is_active

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('prompt_versions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating prompt:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error) {
    console.error('Prompts PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
  }
}

// DELETE - Delete a prompt version
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('prompt_versions').delete().eq('id', id)

    if (error) {
      console.error('Error deleting prompt:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prompts DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 })
  }
}
