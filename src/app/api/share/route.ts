/**
 * Share Generation API Route
 * Creates and retrieves shareable links for generations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

// Type for generation with share token
interface GenerationWithShare {
  id: string
  user_id: string
  share_token: string | null
}

// POST - Create a share link for a generation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { generationId } = await request.json()

    if (!generationId) {
      return NextResponse.json({ error: 'Generation ID required' }, { status: 400 })
    }

    // Check if generation exists and belongs to user
    const { data, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, share_token')
      .eq('id', generationId)
      .single()

    const generation = data as GenerationWithShare | null

    if (fetchError || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    if (generation.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to share this generation' }, { status: 403 })
    }

    // If share token already exists, return it
    if (generation.share_token) {
      return NextResponse.json({
        shareToken: generation.share_token,
        isNew: false,
      })
    }

    // Generate a unique share token
    const shareToken = nanoid(12)

    // Update generation with share token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('generations')
      .update({ share_token: shareToken })
      .eq('id', generationId)

    if (updateError) {
      console.error('Failed to save share token:', updateError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    return NextResponse.json({
      shareToken,
      isNew: true,
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Type for shared generation response
interface SharedGeneration {
  id: string
  product_id: string
  description: string | null
  timestamps: string | null
  hashtags: string[] | null
  faq: string | null
  status: string
  campaign_tag: string | null
  created_at: string
  geo_score_v2: Record<string, unknown> | null
  selected_keywords: string[] | null
  products: {
    id: string
    name: string
    categories: {
      id: string
      name: string
    } | null
  } | null
}

// GET - Get a shared generation by token (public access)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch generation by share token (no auth required for viewing)
    const { data, error } = await supabase
      .from('generations')
      .select(`
        id,
        product_id,
        description,
        timestamps,
        hashtags,
        faq,
        status,
        campaign_tag,
        created_at,
        geo_score_v2,
        selected_keywords,
        products!inner(
          id,
          name,
          categories!inner(
            id,
            name
          )
        )
      `)
      .eq('share_token', token)
      .single()

    const generation = data as SharedGeneration | null

    if (error || !generation) {
      return NextResponse.json({ error: 'Shared content not found' }, { status: 404 })
    }

    // Return sanitized generation data (without sensitive info)
    return NextResponse.json({
      id: generation.id,
      productName: generation.products?.name || 'Unknown Product',
      categoryName: generation.products?.categories?.name || 'Unknown Category',
      description: generation.description,
      timestamps: generation.timestamps,
      hashtags: generation.hashtags,
      faq: generation.faq,
      keywords: generation.selected_keywords,
      campaignTag: generation.campaign_tag,
      createdAt: generation.created_at,
      qualityScore: generation.geo_score_v2 ? generation.geo_score_v2.total : null,
    })
  } catch (error) {
    console.error('Share GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
