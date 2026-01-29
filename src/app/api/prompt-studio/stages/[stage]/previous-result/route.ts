/**
 * API: GET /api/prompt-studio/stages/[stage]/previous-result
 * Fetch the most recent successful test results for a stage's dependencies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMPT_STAGES, type PromptStage } from '@/types/prompt-studio'
import { STAGE_DEPENDENCIES, extractFieldsForNextStage } from '@/lib/prompt-studio/stage-dependencies'

interface RouteParams {
  params: Promise<{ stage: string }>
}

// Type for prompt_test_runs row
interface TestRunRow {
  id: string
  stage_prompt_id: string | null
  test_input: Record<string, unknown>
  product_name: string | null
  language: string
  output_content: string | null
  output_parsed: Record<string, unknown> | null
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  quality_score: number | null
  score_breakdown: Record<string, unknown> | null
  status: string
  error_message: string | null
  created_by: string | null
  created_at: string
}

// Type for stage_prompts row
interface StagePromptRow {
  id: string
  stage: PromptStage
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stage } = await params
    const supabase = await createClient()

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

    const targetStage = stage as PromptStage
    const depConfig = STAGE_DEPENDENCIES[targetStage]

    // If no dependencies, return empty
    if (depConfig.dependsOn.length === 0) {
      return NextResponse.json({
        hasDependencies: false,
        previousResults: {},
        missingStages: [],
        availableStages: [],
        mergedInput: {},
      })
    }

    // Fetch latest successful test results for each dependency stage
    const previousResults: Record<PromptStage, {
      id: string
      outputParsed: Record<string, unknown> | null
      productName: string | null
      createdAt: string
      qualityScore: number | null
    } | null> = {} as Record<PromptStage, any>

    const missingStages: PromptStage[] = []
    const availableStages: PromptStage[] = []

    for (const depStage of depConfig.dependsOn) {
      // First, get stage_prompt IDs for this dependency stage
      const { data: stagePrompts } = await (supabase
        .from('stage_prompts' as any)
        .select('id, stage')
        .eq('stage', depStage) as any) as { data: StagePromptRow[] | null }

      const stagePromptIds = stagePrompts?.map(sp => sp.id) || []

      // Fetch the most recent successful test run for this stage
      let query = supabase
        .from('prompt_test_runs' as any)
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)

      // If we have stage prompt IDs, filter by them
      // Otherwise, we need a different approach - look at test_input to determine stage
      if (stagePromptIds.length > 0) {
        query = query.in('stage_prompt_id', stagePromptIds)
      }

      const { data: testRuns } = await (query as any) as { data: TestRunRow[] | null }

      if (testRuns && testRuns.length > 0) {
        const latestRun = testRuns[0]
        previousResults[depStage] = {
          id: latestRun.id,
          outputParsed: latestRun.output_parsed,
          productName: latestRun.product_name,
          createdAt: latestRun.created_at,
          qualityScore: latestRun.quality_score,
        }
        availableStages.push(depStage)
      } else {
        previousResults[depStage] = null
        missingStages.push(depStage)
      }
    }

    // Merge all available results into a single input object for the target stage
    const mergedInput: Record<string, unknown> = {}

    for (const depStage of availableStages) {
      const result = previousResults[depStage]
      if (result?.outputParsed) {
        const extracted = extractFieldsForNextStage(
          depStage,
          targetStage,
          result.outputParsed
        )
        Object.assign(mergedInput, extracted)

        // Also copy product name if available
        if (result.productName && !mergedInput.productName) {
          mergedInput.productName = result.productName
        }
      }
    }

    return NextResponse.json({
      hasDependencies: true,
      previousResults,
      missingStages,
      availableStages,
      mergedInput,
      requiredFields: depConfig.requiredFields,
    })
  } catch (error) {
    console.error('[API] Error fetching previous results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
