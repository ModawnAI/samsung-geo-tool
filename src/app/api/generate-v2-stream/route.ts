/**
 * GEO v2 Streaming Generation API Route
 * Provides real-time progress updates via Server-Sent Events (SSE)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createProgressStream,
  ProgressTracker,
  STAGE_LABELS,
  type StreamStage,
} from '@/lib/geo-v2/stream-generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StreamGenerateRequest {
  productName: string
  youtubeUrl: string
  srtContent: string
  existingDescription?: string
  keywords: string[]
  productCategory?: string
  usePlaybook?: boolean
  launchDate?: string
  pipelineConfig?: 'full' | 'quick' | 'grounded'
  language?: 'ko' | 'en'
  contentType?: string
  videoFormat?: string
  fixedHashtags?: string[]
  useFixedHashtags?: boolean
  vanityLinkCode?: string
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: StreamGenerateRequest

  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { productName, srtContent, language = 'ko' } = body

  if (!productName || !srtContent) {
    return new Response(
      JSON.stringify({ error: 'Product name and SRT content are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create SSE stream
  const { stream, send, close } = createProgressStream()

  // Create progress tracker
  const tracker = new ProgressTracker(send)

  // Start async generation process
  runStreamingGeneration(body, tracker, language, close).catch((error) => {
    console.error('[Stream] Generation error:', error)
    tracker.error(
      language === 'ko' ? `생성 오류: ${error.message}` : `Generation error: ${error.message}`,
      language
    )
    close()
  })

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * Run the generation pipeline with streaming progress updates
 */
async function runStreamingGeneration(
  body: StreamGenerateRequest,
  tracker: ProgressTracker,
  language: 'ko' | 'en',
  closeStream: () => void
) {
  const {
    productName,
    keywords,
    pipelineConfig = 'full',
  } = body

  try {
    // Stage: Initializing
    tracker.startStage('initializing', language)
    await delay(300) // Small delay for UI to catch up
    tracker.completeStage(undefined, language)

    // Call the main generate-v2 API internally
    // We'll use fetch to call our own API and stream progress based on expected timing
    const generateUrl = new URL('/api/generate-v2', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

    // Start generation in background
    const generationPromise = fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-bizvgdpbuhvvgfihmlgj-auth-token=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
      body: JSON.stringify(body),
    })

    // Simulate stage progress based on expected timings
    const stages: { stage: StreamStage; minDuration: number; maxDuration: number }[] = [
      { stage: 'description', minDuration: 3000, maxDuration: 8000 },
      { stage: 'usp_extraction', minDuration: 1500, maxDuration: 4000 },
      { stage: 'chapters', minDuration: 1500, maxDuration: 3500 },
      { stage: 'faq', minDuration: 2000, maxDuration: 5000 },
      { stage: 'case_studies', minDuration: 1500, maxDuration: 4000 },
      { stage: 'keywords', minDuration: 1000, maxDuration: 3000 },
      { stage: 'hashtags', minDuration: 800, maxDuration: 2000 },
      { stage: 'scoring', minDuration: 500, maxDuration: 1500 },
    ]

    // Skip step_by_step for quick pipeline
    if (pipelineConfig !== 'quick') {
      stages.splice(4, 0, { stage: 'step_by_step', minDuration: 1000, maxDuration: 3000 })
    }

    let generationDone = false
    let generationResult: unknown = null
    let generationError: Error | null = null

    // Handle generation completion
    generationPromise
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Generation failed with status ${response.status}`)
        }
        generationResult = await response.json()
        generationDone = true
      })
      .catch((error) => {
        generationError = error
        generationDone = true
      })

    // Progress through stages with simulated timing
    let currentStageIndex = 0

    while (currentStageIndex < stages.length && !generationDone) {
      const { stage, minDuration, maxDuration } = stages[currentStageIndex]

      tracker.startStage(stage, language)

      // Simulate progress within stage
      const duration = minDuration + Math.random() * (maxDuration - minDuration)
      const steps = 5
      const stepDuration = duration / steps

      for (let i = 1; i <= steps && !generationDone; i++) {
        await delay(stepDuration)
        tracker.updateProgress((i / steps) * 100, undefined, language)
      }

      if (!generationDone) {
        tracker.completeStage(undefined, language)
      }

      currentStageIndex++
    }

    // Wait for generation to complete if not already done
    while (!generationDone) {
      await delay(500)
    }

    if (generationError) {
      throw generationError
    }

    // Complete remaining stages quickly if generation finished early
    while (currentStageIndex < stages.length) {
      const { stage } = stages[currentStageIndex]
      tracker.startStage(stage, language)
      tracker.completeStage(undefined, language)
      currentStageIndex++
    }

    // Final completion
    tracker.complete(generationResult, language)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    tracker.error(
      language === 'ko' ? `생성 실패: ${errorMessage}` : `Generation failed: ${errorMessage}`,
      language
    )
  } finally {
    closeStream()
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
