import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const categoryId = searchParams.get('category_id')
    const type = searchParams.get('type') // 'brief' or 'generation' or null for all

    // First check if templates table exists, if not we'll use a simple in-memory approach
    // or return empty array. Templates are stored in a templates table.

    let query = supabase
      .from('templates')
      .select(`
        *,
        products (id, name),
        categories (id, name),
        users:created_by (email, name)
      `)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })

    // Filter by type (brief templates vs generation templates)
    if (type === 'brief') {
      query = query.eq('is_brief_template', true)
    } else if (type === 'generation') {
      query = query.or('is_brief_template.is.null,is_brief_template.eq.false')
    }

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ templates: [] })
      }
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      product_id,
      keywords,
      campaign_tag,
      brief_usps,
      description,
      is_brief_template,
      brief_defaults,
      category_id,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('templates') as any)
      .insert({
        name,
        product_id: product_id || null,
        keywords: keywords || [],
        campaign_tag: campaign_tag || null,
        brief_usps: brief_usps || [],
        description: description || null,
        is_brief_template: is_brief_template || false,
        brief_defaults: brief_defaults || {},
        category_id: category_id || null,
        usage_count: 0,
        created_by: user.id,
      })
      .select(`
        *,
        products (id, name),
        categories (id, name),
        users:created_by (email, name)
      `)
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Templates POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PATCH - Update a template
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('templates') as any)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        products (id, name),
        users:created_by (email, name)
      `)
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Templates PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template
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
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Templates DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
