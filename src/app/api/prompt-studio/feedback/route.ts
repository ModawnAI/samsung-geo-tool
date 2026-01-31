/**
 * Feedback API Route
 *
 * GET /api/prompt-studio/feedback?stage=xxx
 * Returns aggregated feedback analysis for a stage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeFeedback, getFeedbackSummary } from '@/lib/prompt-studio/feedback-analyzer'
import type { PromptStage } from '@/types/prompt-studio'

export async function GET(request: NextRequest) {
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
    const stage = searchParams.get('stage') as PromptStage | null
    const summaryOnly = searchParams.get('summary') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const includePatterns = searchParams.get('patterns') !== 'false'

    if (!stage) {
      return NextResponse.json({ error: 'stage parameter is required' }, { status: 400 })
    }

    // Validate stage
    const validStages: PromptStage[] = [
      'grounding',
      'description',
      'usp',
      'faq',
      'chapters',
      'case_studies',
      'keywords',
      'hashtags',
    ]

    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Return summary only if requested
    if (summaryOnly) {
      const summary = await getFeedbackSummary(stage)
      return NextResponse.json({ summary })
    }

    // Get full analysis
    const analysis = await analyzeFeedback(stage, {
      limit,
      includePatternDetection: includePatterns,
    })

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
