import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearBlacklistCache } from '@/lib/tuning/blacklist-loader'
import type { BlacklistDomain } from '@/types/tuning'

// GET - Fetch all blacklist configurations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const isActive = searchParams.get('is_active')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('domain_blacklist')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[블랙리스트] 조회 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      configs: data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[블랙리스트] GET 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch blacklist configs' }, { status: 500 })
  }
}

// POST - Create a new blacklist configuration
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
    const { name, version, domains } = body

    if (!name || !version) {
      return NextResponse.json(
        { error: 'name and version are required' },
        { status: 400 }
      )
    }

    // Validate domains array
    const validatedDomains: BlacklistDomain[] = (domains || []).map((d: Partial<BlacklistDomain>) => ({
      domain: d.domain?.toLowerCase().trim().replace(/^www\./, '') || '',
      reason: d.reason || undefined,
      added_at: d.added_at || new Date().toISOString(),
    })).filter((d: BlacklistDomain) => d.domain)

    const insertData = {
      name,
      version,
      domains: validatedDomains,
      is_active: false,
      created_by: user.id,
    }

    const { data, error } = await (supabase
      .from('domain_blacklist') as any)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[블랙리스트] 생성 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config: data }, { status: 201 })
  } catch (error) {
    console.error('[블랙리스트] POST 오류:', error)
    return NextResponse.json({ error: 'Failed to create blacklist config' }, { status: 500 })
  }
}

// PATCH - Update a blacklist configuration
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
    const { id, name, version, domains, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Blacklist config ID is required' }, { status: 400 })
    }

    // If setting this config as active, deactivate all others
    if (is_active === true) {
      await (supabase
        .from('domain_blacklist') as any)
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', id)
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (version !== undefined) updateData.version = version
    if (is_active !== undefined) updateData.is_active = is_active

    // Validate and update domains if provided
    if (domains !== undefined) {
      const validatedDomains: BlacklistDomain[] = domains.map((d: Partial<BlacklistDomain>) => ({
        domain: d.domain?.toLowerCase().trim().replace(/^www\./, '') || '',
        reason: d.reason || undefined,
        added_at: d.added_at || new Date().toISOString(),
      })).filter((d: BlacklistDomain) => d.domain)
      updateData.domains = validatedDomains
    }

    const { data, error } = await (supabase
      .from('domain_blacklist') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[블랙리스트] 업데이트 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Clear cache to force reload
    clearBlacklistCache()

    return NextResponse.json({ config: data })
  } catch (error) {
    console.error('[블랙리스트] PATCH 오류:', error)
    return NextResponse.json({ error: 'Failed to update blacklist config' }, { status: 500 })
  }
}

// DELETE - Delete a blacklist configuration
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
      return NextResponse.json({ error: 'Blacklist config ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('domain_blacklist')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[블랙리스트] 삭제 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Clear cache
    clearBlacklistCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[블랙리스트] DELETE 오류:', error)
    return NextResponse.json({ error: 'Failed to delete blacklist config' }, { status: 500 })
  }
}
