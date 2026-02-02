import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { featureFlags } from '@/lib/feature-flags'
import type { VideoAnalysis } from '@/types/video-analysis'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/quicktime',
  'video/avi',
  'video/x-flv',
  'video/webm',
  'video/wmv',
  'video/3gpp',
]

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate unique file name
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${user.id}/${timestamp}_${safeName}`

    // Use admin client for storage and database operations (bypasses RLS)
    // User is already authenticated via the regular client above
    const adminClient = createAdminClient()
    
    // Debug: Check if service role key is set
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('[VideoUpload] Service role key present:', hasServiceKey)
    console.log('[VideoUpload] File path:', filePath)

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // First check if bucket exists
    const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets()
    console.log('[VideoUpload] Buckets:', buckets?.map(b => b.name), 'Error:', bucketError?.message)

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('videos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[VideoUpload] Storage upload error:', uploadError)
      console.error('[VideoUpload] Error details:', JSON.stringify(uploadError, null, 2))
      return NextResponse.json(
        { error: `Failed to upload video: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('videos')
      .getPublicUrl(filePath)
    const { data: analysisRecord, error: dbError } = await (adminClient as any)
      .from('video_analyses')
      .insert({
        user_id: user.id,
        video_url: urlData.publicUrl,
        video_name: file.name,
        video_size: file.size,
        mime_type: file.type,
        status: 'pending',
      })
      .select()
      .single() as { data: VideoAnalysis | null; error: any }

    if (dbError || !analysisRecord) {
      console.error('Database error:', dbError)
      // Try to clean up uploaded file
      await adminClient.storage.from('videos').remove([filePath])
      return NextResponse.json(
        { error: `Failed to create analysis record: ${dbError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: analysisRecord.id,
      video_url: urlData.publicUrl,
      video_name: file.name,
      video_size: file.size,
      mime_type: file.type,
      status: 'pending',
    })
  } catch (error) {
    console.error('Video upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload video' },
      { status: 500 }
    )
  }
}
