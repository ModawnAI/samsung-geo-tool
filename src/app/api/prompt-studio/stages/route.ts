/**
 * API: GET /api/prompt-studio/stages
 * Returns status summary for all 7 stages
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMPT_STAGES, STAGE_ENGINE_MAP, ENGINE_CONFIG, type StageStatusSummary, type PromptStage, type WorkflowStatus } from '@/types/prompt-studio'

// Type for stage_prompts row (until DB migration is applied and types regenerated)
interface StagePromptRow {
  id: string
  stage: PromptStage
  workflow_status: WorkflowStatus
  avg_quality_score: number | null
  test_count: number
  last_tested_at: string | null
  updated_at: string
  current_version?: number
  total_versions?: number
  model?: string
  temperature?: number
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to fetch stage prompts
    let stagePrompts: Record<string, StageStatusSummary> = {}

    try {
      // Use type assertion until migration is applied
      const { data, error } = await (supabase
        .from('stage_prompts' as any)
        .select('*')
        .order('updated_at', { ascending: false }) as any)

      if (!error && data) {
        // Group by stage, taking the most recent for each
        for (const prompt of data as StagePromptRow[]) {
          if (!stagePrompts[prompt.stage]) {
            const engine = STAGE_ENGINE_MAP[prompt.stage]
            stagePrompts[prompt.stage] = {
              stage: prompt.stage,
              hasActivePrompt: prompt.workflow_status === 'active',
              activePromptId: prompt.workflow_status === 'active' ? prompt.id : undefined,
              workflowStatus: prompt.workflow_status,
              avgQualityScore: prompt.avg_quality_score,
              testCount: prompt.test_count,
              lastTestedAt: prompt.last_tested_at,
              updatedAt: prompt.updated_at,
              currentVersion: prompt.current_version ?? 1,
              totalVersions: prompt.total_versions ?? 1,
              // Engine info
              engine,
              model: prompt.model ?? ENGINE_CONFIG[engine].defaultModel,
              temperature: prompt.temperature ?? 0.7,
            }
          }
        }
      }
    } catch (dbError) {
      console.log('[API] stage_prompts table may not exist yet:', dbError)
      // Continue with empty data
    }

    // Build response with all stages
    const stages: StageStatusSummary[] = PROMPT_STAGES.map((stage) => {
      if (stagePrompts[stage]) {
        return stagePrompts[stage]
      }
      const engine = STAGE_ENGINE_MAP[stage]
      return {
        stage,
        hasActivePrompt: false,
        workflowStatus: 'draft' as const,
        avgQualityScore: null,
        testCount: 0,
        lastTestedAt: null,
        updatedAt: new Date().toISOString(),
        // Version info (default)
        currentVersion: undefined,
        totalVersions: undefined,
        // Default engine info
        engine,
        model: ENGINE_CONFIG[engine].defaultModel,
        temperature: 0.7,
      }
    })

    return NextResponse.json({ stages })
  } catch (error) {
    console.error('[API] Error fetching stages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
