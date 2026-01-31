import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { VideoAnalysis } from '@/types/video-analysis'

// GET - List all video analyses for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    let query = (supabase as any)
      .from('video_analyses')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query as { data: VideoAnalysis[] | null; error: any; count: number | null }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      analyses: data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('List video analyses error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list analyses' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a video analysis
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Get the analysis to find the video URL
    const { data: analysis } = await (supabase as any)
      .from('video_analyses')
      .select('video_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single() as { data: { video_url: string } | null }

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Delete from database
    const { error: deleteError } = await (supabase as any)
      .from('video_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Try to delete from storage (don't fail if this doesn't work)
    try {
      const videoPath = new URL(analysis.video_url).pathname.split('/').slice(-2).join('/')
      await supabase.storage.from('videos').remove([videoPath])
    } catch {
      console.warn('Failed to delete video file from storage')
    }

    // Try to delete thumbnails
    try {
      const { data: files } = await supabase.storage
        .from('video-thumbnails')
        .list(`${user.id}/${id}`)
      
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${id}/${f.name}`)
        await supabase.storage.from('video-thumbnails').remove(paths)
      }
    } catch {
      console.warn('Failed to delete thumbnails from storage')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete video analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete analysis' },
      { status: 500 }
    )
  }
}
