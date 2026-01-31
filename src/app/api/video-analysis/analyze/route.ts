import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  analyzeVideoWithGemini,
  uploadVideoToGemini,
  waitForFileProcessing,
} from '@/lib/video-analysis/gemini-analyzer'
import type { VideoAnalysis } from '@/types/video-analysis'

export const maxDuration = 300 // 5 minutes for video analysis

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analysis_id, platform, product_name, product_category } = await request.json()

    if (!analysis_id) {
      return NextResponse.json({ error: 'analysis_id is required' }, { status: 400 })
    }

    // Build context for analysis
    const analysisContext = {
      platform: platform || undefined,
      productName: product_name || undefined,
      productCategory: product_category || undefined,
    }

    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient()

    // Get the analysis record
    const { data: analysis, error: fetchError } = await (adminClient as any)
      .from('video_analyses')
      .select('*')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single() as { data: VideoAnalysis | null; error: any }

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis record not found' }, { status: 404 })
    }

    if (analysis.status === 'completed') {
      return NextResponse.json({ error: 'Analysis already completed' }, { status: 400 })
    }

    // Update status to processing
    await (adminClient as any)
      .from('video_analyses')
      .update({ status: 'processing' })
      .eq('id', analysis_id)

    try {
      // Download video from Supabase Storage using admin client
      // Extract file path from the public URL
      const videoUrl = analysis.video_url as string
      const urlParts = videoUrl.split('/storage/v1/object/public/videos/')
      const filePath = urlParts[1] || ''

      if (!filePath) {
        throw new Error('Could not extract file path from video URL')
      }

      console.log('[VideoAnalysis] Downloading video from path:', filePath)

      const { data: videoBlob, error: downloadError } = await adminClient.storage
        .from('videos')
        .download(filePath)

      if (downloadError || !videoBlob) {
        console.error('[VideoAnalysis] Download error:', downloadError)
        throw new Error(`Failed to download video: ${downloadError?.message || 'Unknown error'}`)
      }

      const videoBuffer = Buffer.from(await videoBlob.arrayBuffer())
      const videoSizeMB = videoBuffer.length / (1024 * 1024)

      let geminiResult

      if (videoSizeMB > 20) {
        // For large videos, upload to Gemini Files API first
        console.log(`Uploading large video (${videoSizeMB.toFixed(2)}MB) to Gemini...`)
        
        const uploadResult = await uploadVideoToGemini(
          videoBuffer,
          analysis.video_name,
          analysis.mime_type || 'video/mp4'
        )

        // Wait for processing
        await waitForFileProcessing(uploadResult.uri)

        // Analyze with file URI + context
        geminiResult = await analyzeVideoWithGemini({
          type: 'uri',
          uri: uploadResult.uri,
          mimeType: uploadResult.mimeType,
        }, analysisContext)
      } else {
        // For smaller videos, use inline base64
        console.log(`Analyzing video inline (${videoSizeMB.toFixed(2)}MB)...`)
        
        geminiResult = await analyzeVideoWithGemini({
          type: 'base64',
          data: videoBuffer.toString('base64'),
          mimeType: analysis.mime_type || 'video/mp4',
        }, analysisContext)
      }

      const { analysis: analysisData, usage, rawText } = geminiResult

      // Find video tokens from usage
      const videoTokens = usage.promptTokensDetails?.find(
        (d) => d.modality === 'VIDEO'
      )?.tokenCount || 0

      // Update the analysis record with results
      const { error: updateError } = await (adminClient as any)
        .from('video_analyses')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),

          // SEO metadata
          seo_title: analysisData.seo_title,
          meta_description: analysisData.meta_description,
          primary_keywords: analysisData.primary_keywords,
          secondary_keywords: analysisData.secondary_keywords,
          long_tail_keywords: analysisData.long_tail_keywords,
          search_intent: analysisData.search_intent,

          // NEW: Full transcript and on-screen text
          full_transcript: analysisData.full_transcript,
          on_screen_text: analysisData.on_screen_text,

          // NEW: Product info
          product_info: analysisData.product_info,

          // NEW: Features, specs, USPs
          features_and_specs: analysisData.features_and_specs,
          usps: analysisData.usps,

          // Content breakdown
          scene_breakdown: analysisData.scene_breakdown,
          technical_specs: analysisData.technical_specs,

          // NEW: CTAs and chapters
          call_to_actions: analysisData.call_to_actions,
          timestamps_chapters: analysisData.timestamps_chapters,

          // Semantic analysis
          topic_hierarchy: analysisData.topic_hierarchy,
          named_entities: analysisData.named_entities,
          key_claims: analysisData.key_claims,
          target_audience: typeof analysisData.target_audience === 'object'
            ? analysisData.target_audience.primary
            : analysisData.target_audience,
          tone_sentiment: analysisData.tone_sentiment,

          // NEW: Brand voice, stats, competitors
          brand_voice: analysisData.brand_voice,
          statistics_mentioned: analysisData.statistics_mentioned,
          competitor_mentions: analysisData.competitor_mentions,

          // Visual analysis
          color_palette: analysisData.color_palette,
          visual_style: analysisData.visual_style,
          production_quality: analysisData.production_quality,

          // Thumbnails (recommendations, not extracted yet)
          thumbnails: analysisData.thumbnail_recommendations?.map((t: any) => ({
            timestamp: t.timestamp,
            description: t.description,
            recommendation: t.recommendation,
            text_overlay_suggestion: t.text_overlay_suggestion,
            url: null,
          })),

          // NEW: Suggested hashtags
          hashtags_suggested: analysisData.hashtags_suggested,

          // Structured data
          schema_video_object: analysisData.schema_video_object,
          schema_faq: analysisData.schema_faq,

          // Content gaps
          content_gaps: analysisData.content_gaps,
          follow_up_suggestions: analysisData.follow_up_suggestions,

          // Full analysis text
          full_analysis: rawText,

          // Token usage
          prompt_tokens: usage.promptTokenCount,
          completion_tokens: usage.candidatesTokenCount,
          video_tokens: videoTokens,
        })
        .eq('id', analysis_id)

      if (updateError) {
        throw new Error(`Failed to save analysis: ${updateError.message}`)
      }

      // Fetch updated record
      const { data: updatedAnalysis } = await (adminClient as any)
        .from('video_analyses')
        .select('*')
        .eq('id', analysis_id)
        .single()

      return NextResponse.json(updatedAnalysis)
    } catch (analysisError) {
      // Update status to failed
      await (adminClient as any)
        .from('video_analyses')
        .update({
          status: 'failed',
          error_message: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        })
        .eq('id', analysis_id)

      throw analysisError
    }
  } catch (error) {
    console.error('Video analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze video' },
      { status: 500 }
    )
  }
}
