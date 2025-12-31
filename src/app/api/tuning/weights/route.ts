import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all scoring weights
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const isActive = searchParams.get('is_active')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('scoring_weights')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching weights:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      weights: data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Weights GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch weights' }, { status: 500 })
  }
}

// POST - Create a new weight config
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
    const { name, version, weights } = body

    if (!name || !version || !weights) {
      return NextResponse.json(
        { error: 'name, version, and weights are required' },
        { status: 400 }
      )
    }

    // Validate weights object
    const requiredKeys = [
      'usp_coverage',
      'grounding_score',
      'semantic_similarity',
      'anti_fabrication',
      'keyword_density',
      'structure_quality',
    ]
    for (const key of requiredKeys) {
      if (typeof weights[key] !== 'number') {
        return NextResponse.json(
          { error: `weights.${key} must be a number` },
          { status: 400 }
        )
      }
    }

    const insertData = {
      name,
      version,
      weights,
      is_active: false,
      created_by: user.id,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('scoring_weights')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating weight:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ weight: data }, { status: 201 })
  } catch (error) {
    console.error('Weights POST error:', error)
    return NextResponse.json({ error: 'Failed to create weight config' }, { status: 500 })
  }
}

// PATCH - Update a weight config
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
    const { id, name, version, weights, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Weight config ID is required' }, { status: 400 })
    }

    // If setting this weight as active, deactivate others
    if (is_active === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('scoring_weights')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', id)
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (version !== undefined) updateData.version = version
    if (weights !== undefined) updateData.weights = weights
    if (is_active !== undefined) updateData.is_active = is_active

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('scoring_weights')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating weight:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ weight: data })
  } catch (error) {
    console.error('Weights PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update weight config' }, { status: 500 })
  }
}

// DELETE - Delete a weight config
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
      return NextResponse.json({ error: 'Weight config ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('scoring_weights').delete().eq('id', id)

    if (error) {
      console.error('Error deleting weight:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Weights DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete weight config' }, { status: 500 })
  }
}
