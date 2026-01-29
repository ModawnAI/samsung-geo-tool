/**
 * API: POST /api/prompt-studio/stages/[stage]/test
 * Execute a test for a specific stage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeStageTest } from '@/lib/prompt-studio/stage-executor'
import { PROMPT_STAGES, type PromptStage, DEFAULT_LLM_PARAMETERS } from '@/types/prompt-studio'

interface RouteParams {
  params: Promise<{ stage: string }>
}

// Type for stage_prompts row (until migration is applied)
interface StagePromptRow {
  id: string
  stage: PromptStage
  stage_system_prompt: string | null
  temperature: number
  max_tokens: number
  top_p: number
  model: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stage } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate stage
    if (!PROMPT_STAGES.includes(stage as PromptStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      stagePromptId,
      testInput,
      language = 'en',
    } = body

    // Fetch stage prompt if ID provided
    let systemPrompt = ''
    let parameters = { ...DEFAULT_LLM_PARAMETERS }

    if (stagePromptId) {
      // Use type assertion until migration is applied
      const { data: stagePrompt } = await (supabase
        .from('stage_prompts' as any)
        .select('*')
        .eq('id', stagePromptId)
        .single() as any) as { data: StagePromptRow | null }

      if (stagePrompt) {
        systemPrompt = stagePrompt.stage_system_prompt || ''
        parameters = {
          temperature: stagePrompt.temperature,
          maxTokens: stagePrompt.max_tokens,
          topP: stagePrompt.top_p,
          model: stagePrompt.model,
        }
      }
    }

    // Execute the test
    const result = await executeStageTest({
      stage: stage as PromptStage,
      systemPrompt,
      parameters,
      testInput,
      language,
    })

    // Save test run to database
    try {
      // Use type assertion until migration is applied
      const { error: insertError } = await (supabase
        .from('prompt_test_runs' as any)
        .insert({
          stage_prompt_id: stagePromptId || null,
          test_input: testInput,
          product_name: testInput.productName || null,
          language,
          output_content: result.rawResponse,
          output_parsed: result.output,
          latency_ms: result.metrics.latencyMs,
          input_tokens: result.metrics.inputTokens,
          output_tokens: result.metrics.outputTokens,
          total_tokens: result.metrics.totalTokens,
          quality_score: result.qualityScore.total,
          score_breakdown: result.qualityScore,
          status: result.status,
          error_message: result.errorMessage || null,
          created_by: user.id,
        } as any) as any)

      if (insertError) {
        console.error('[API] Failed to save test run:', insertError)
        // Continue anyway - test result is still valid
      }
    } catch (dbError) {
      console.error('[API] Database error saving test run:', dbError)
      // Continue anyway - the test was successful
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Test execution error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Test execution failed',
        status: 'failed',
      },
      { status: 500 }
    )
  }
}
