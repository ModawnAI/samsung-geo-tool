import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all batch jobs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('batch_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching batch jobs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      jobs: data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Batch jobs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch batch jobs' }, { status: 500 })
  }
}

// POST - Create a new batch job
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
    const { name, type, total_items, config, estimated_cost } = body

    if (!name || !type || total_items === undefined) {
      return NextResponse.json(
        { error: 'name, type, and total_items are required' },
        { status: 400 }
      )
    }

    const insertData = {
      name,
      type,
      total_items,
      config: config || null,
      estimated_cost: estimated_cost || null,
      status: 'pending',
      processed_items: 0,
      failed_items: 0,
      created_by: user.id,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('batch_jobs')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating batch job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ job: data }, { status: 201 })
  } catch (error) {
    console.error('Batch jobs POST error:', error)
    return NextResponse.json({ error: 'Failed to create batch job' }, { status: 500 })
  }
}

// PATCH - Update a batch job
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
    const {
      id,
      status,
      processed_items,
      failed_items,
      results,
      error_log,
      actual_cost,
      started_at,
      completed_at,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Batch job ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      updateData.status = status
      // Auto-set timestamps based on status changes
      if (status === 'running' && !started_at) {
        updateData.started_at = new Date().toISOString()
      }
      if ((status === 'completed' || status === 'failed') && !completed_at) {
        updateData.completed_at = new Date().toISOString()
      }
    }
    if (processed_items !== undefined) updateData.processed_items = processed_items
    if (failed_items !== undefined) updateData.failed_items = failed_items
    if (results !== undefined) updateData.results = results
    if (error_log !== undefined) updateData.error_log = error_log
    if (actual_cost !== undefined) updateData.actual_cost = actual_cost
    if (started_at !== undefined) updateData.started_at = started_at
    if (completed_at !== undefined) updateData.completed_at = completed_at

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('batch_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating batch job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    console.error('Batch jobs PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update batch job' }, { status: 500 })
  }
}

// DELETE - Delete a batch job
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
      return NextResponse.json({ error: 'Batch job ID is required' }, { status: 400 })
    }

    // First delete associated batch job items
    await supabase.from('batch_job_items').delete().eq('batch_job_id', id)

    // Then delete the batch job
    const { error } = await supabase.from('batch_jobs').delete().eq('id', id)

    if (error) {
      console.error('Error deleting batch job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Batch jobs DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete batch job' }, { status: 500 })
  }
}
