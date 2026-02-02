import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { featureFlags } from '@/lib/feature-flags'
import { spawn } from 'child_process'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { VideoAnalysis, ThumbnailOption } from '@/types/video-analysis'

export const maxDuration = 120 // 2 minutes for thumbnail extraction

interface ThumbnailResult {
  timestamp: string
  url: string
  description?: string
  recommendation?: string
}

/**
 * Extract a frame from video at given timestamp using ffmpeg
 */
async function extractFrame(
  videoPath: string,
  timestamp: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-ss', timestamp,
      '-i', videoPath,
      '-frames:v', '1',
      '-q:v', '2',
      outputPath,
    ]

    const ffmpeg = spawn('ffmpeg', args)

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}

/**
 * Parse timestamp string to seconds for sorting
 */
function parseTimestamp(ts: string): number {
  const parts = ts.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

/**
 * Generate default timestamps at 10-second intervals
 */
function generateDefaultTimestamps(durationSeconds: number): string[] {
  const timestamps: string[] = []
  const interval = 10
  
  for (let t = 5; t < durationSeconds; t += interval) {
    const mins = Math.floor(t / 60)
    const secs = t % 60
    timestamps.push(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
  }
  
  return timestamps
}

export async function POST(request: NextRequest) {
  if (!featureFlags.videoAnalysis) {
    return NextResponse.json(
      { error: 'Video analysis feature is not enabled' },
      { status: 403 }
    )
  }

  const tempDir = join(tmpdir(), `video-thumbnails-${randomUUID()}`)
  let videoPath = ''

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analysis_id, timestamps: customTimestamps } = await request.json()

    if (!analysis_id) {
      return NextResponse.json({ error: 'analysis_id is required' }, { status: 400 })
    }

    // Get the analysis record
    const { data: analysis, error: fetchError } = await (supabase as any)
      .from('video_analyses')
      .select('*')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single() as { data: VideoAnalysis | null; error: any }

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis record not found' }, { status: 404 })
    }

    // Create temp directory
    await mkdir(tempDir, { recursive: true })

    // Download video
    const videoResponse = await fetch(analysis.video_url)
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video')
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
    videoPath = join(tempDir, 'video.mp4')
    await writeFile(videoPath, videoBuffer)

    // Determine timestamps to extract
    let timestampsToExtract: string[]
    
    if (customTimestamps && customTimestamps.length > 0) {
      timestampsToExtract = customTimestamps
    } else if (analysis.thumbnails && Array.isArray(analysis.thumbnails) && analysis.thumbnails.length > 0) {
      // Use recommended timestamps from analysis
      timestampsToExtract = (analysis.thumbnails as ThumbnailOption[])
        .map((t) => t.timestamp)
        .filter((ts): ts is string => !!ts)
    } else {
      // Generate default timestamps
      const duration = analysis.video_duration_seconds || 240 // default 4 min
      timestampsToExtract = generateDefaultTimestamps(duration)
    }

    // Sort timestamps
    timestampsToExtract.sort((a, b) => parseTimestamp(a) - parseTimestamp(b))

    // Extract thumbnails
    const thumbnailResults: ThumbnailResult[] = []

    for (const timestamp of timestampsToExtract) {
      const safeTimestamp = timestamp.replace(/:/g, '_')
      const thumbnailFileName = `${analysis_id}_${safeTimestamp}.jpg`
      const thumbnailPath = join(tempDir, thumbnailFileName)

      try {
        await extractFrame(videoPath, timestamp, thumbnailPath)

        // Read the thumbnail file
        const thumbnailBuffer = await readFile(thumbnailPath)

        // Upload to Supabase Storage
        const storagePath = `${user.id}/${analysis_id}/${thumbnailFileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('video-thumbnails')
          .upload(storagePath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          console.error(`Failed to upload thumbnail for ${timestamp}:`, uploadError)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('video-thumbnails')
          .getPublicUrl(storagePath)

        // Find matching recommendation from analysis
        const existingThumbnails = analysis.thumbnails as ThumbnailOption[] | null
        const recommendation = existingThumbnails?.find(
          (t) => t.timestamp === timestamp
        )

        thumbnailResults.push({
          timestamp,
          url: urlData.publicUrl,
          description: recommendation?.description,
          recommendation: recommendation?.recommendation,
        })

        // Clean up local file
        await unlink(thumbnailPath).catch(() => {})
      } catch (extractError) {
        console.error(`Failed to extract thumbnail at ${timestamp}:`, extractError)
      }
    }

    // Update analysis record with thumbnails
    const { error: updateError } = await (supabase as any)
      .from('video_analyses')
      .update({
        thumbnails: thumbnailResults,
      })
      .eq('id', analysis_id)

    if (updateError) {
      console.error('Failed to update thumbnails:', updateError)
    }

    // Clean up temp files
    await unlink(videoPath).catch(() => {})

    return NextResponse.json({
      analysis_id,
      thumbnails: thumbnailResults,
      count: thumbnailResults.length,
    })
  } catch (error) {
    console.error('Thumbnail extraction error:', error)
    
    // Clean up on error
    if (videoPath) {
      await unlink(videoPath).catch(() => {})
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract thumbnails' },
      { status: 500 }
    )
  }
}
