import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

type Brief = Tables<'briefs'>
// Brief type kept for reference, used in route handlers

// GET - Fetch all briefs with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const productId = searchParams.get('product_id')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('briefs')
      .select(`
        *,
        products (id, name, code_name, category_id, categories (name)),
        users:created_by (email, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`content.ilike.%${search}%,usps.cs.{${search}}`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching briefs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      briefs: data,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Briefs GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefs' },
      { status: 500 }
    )
  }
}

// POST - Create a new brief
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, usps, content, is_active = true } = body

    if (!product_id || !usps || !Array.isArray(usps)) {
      return NextResponse.json(
        { error: 'product_id and usps array are required' },
        { status: 400 }
      )
    }

    // Get the next version number for this product
    const { data: existingBriefs } = await supabase
      .from('briefs')
      .select('version')
      .eq('product_id', product_id)
      .order('version', { ascending: false })
      .limit(1) as { data: { version: number }[] | null }

    const nextVersion = existingBriefs && existingBriefs.length > 0
      ? existingBriefs[0].version + 1
      : 1

    // If setting this brief as active, deactivate others for this product
    if (is_active) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('briefs') as any)
        .update({ is_active: false })
        .eq('product_id', product_id)
        .eq('is_active', true)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('briefs') as any)
      .insert({
        product_id,
        usps,
        content: content || null,
        is_active,
        version: nextVersion,
        created_by: user.id,
      })
      .select(`
        *,
        products (id, name, code_name),
        users:created_by (email, name)
      `)
      .single()

    if (error) {
      console.error('Error creating brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ brief: data }, { status: 201 })
  } catch (error) {
    console.error('Briefs POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create brief' },
      { status: 500 }
    )
  }
}

// PATCH - Update a brief
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, usps, content, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Brief ID is required' }, { status: 400 })
    }

    // Get the brief to check product_id for active status update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingBrief } = await (supabase.from('briefs') as any)
      .select('product_id')
      .eq('id', id)
      .single() as { data: { product_id: string } | null }

    if (!existingBrief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    // If setting this brief as active, deactivate others for this product
    if (is_active === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('briefs') as any)
        .update({ is_active: false })
        .eq('product_id', existingBrief.product_id)
        .eq('is_active', true)
        .neq('id', id)
    }

    const updateData: Record<string, unknown> = {}
    if (usps !== undefined) updateData.usps = usps
    if (content !== undefined) updateData.content = content
    if (is_active !== undefined) updateData.is_active = is_active

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('briefs') as any)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        products (id, name, code_name),
        users:created_by (email, name)
      `)
      .single()

    if (error) {
      console.error('Error updating brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ brief: data })
  } catch (error) {
    console.error('Briefs PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update brief' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a brief
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Brief ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('briefs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting brief:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Briefs DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete brief' },
      { status: 500 }
    )
  }
}
