import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureFlags } from '@/lib/feature-flags'
import type { VideoAnalysis } from '@/types/video-analysis'

// GET - Get a specific video analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!featureFlags.videoAnalysis) {
    return NextResponse.json(
      { error: 'Video analysis feature is not enabled' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const adminClient = createAdminClient()

    const { data, error } = await (adminClient as any)
      .from('video_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single() as { data: VideoAnalysis | null; error: any }

    if (error || !data) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get video analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get analysis' },
      { status: 500 }
    )
  }
}

// PATCH - Update a video analysis (e.g., select thumbnail)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!featureFlags.videoAnalysis) {
    return NextResponse.json(
      { error: 'Video analysis feature is not enabled' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()
    const adminClient = createAdminClient()

    // Only allow certain fields to be updated
    const filteredUpdates: Record<string, any> = {}
    
    if ('selected_thumbnail_url' in updates) {
      filteredUpdates.selected_thumbnail_url = updates.selected_thumbnail_url
    }
    if ('video_name' in updates) {
      filteredUpdates.video_name = updates.video_name
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await (adminClient as any)
      .from('video_analyses')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single() as { data: VideoAnalysis | null; error: any }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Update video analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update analysis' },
      { status: 500 }
    )
  }
}
