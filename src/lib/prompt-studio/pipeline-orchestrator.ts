/**
 * Pipeline Orchestrator
 * Client-side orchestrator that runs the full stage pipeline using existing APIs.
 * No new backend endpoints needed.
 */

import { buildExecutionLevels, getUpstreamChain, STAGE_DEPENDENCIES, extractFieldsForNextStage } from './stage-dependencies'
import type { ExecutionLevel, PipelineConfig, PipelineStageResult } from '@/types/pipeline'
import type { PromptStage, StageTestResponse } from '@/types/prompt-studio'

type OnStageUpdate = (stage: PromptStage, result: PipelineStageResult) => void

/** Fetch the active stage prompt for a given stage */
async function fetchStagePrompt(stage: PromptStage): Promise<{ id: string } | null> {
  try {
    const response = await fetch(`/api/prompt-studio/stages/${stage}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.stagePrompt ? { id: data.stagePrompt.id } : null
  } catch {
    return null
  }
}

/** Execute a single stage test via the existing API */
async function executeStageTest(
  stage: PromptStage,
  stagePromptId: string | undefined,
  testInput: Record<string, unknown>,
  language: 'ko' | 'en',
  signal?: AbortSignal
): Promise<StageTestResponse> {
  const response = await fetch(`/api/prompt-studio/stages/${stage}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stagePromptId, testInput, language }),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `Stage ${stage} test failed (${response.status})`)
  }

  return response.json()
}

/** Build chained test input by combining base input with completed upstream outputs */
function buildChainedInput(
  stage: PromptStage,
  baseInput: Record<string, unknown>,
  completedOutputs: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const testInput: Record<string, unknown> = { ...baseInput }
  const deps = STAGE_DEPENDENCIES[stage]

  for (const depStage of deps.dependsOn) {
    if (completedOutputs[depStage]) {
      const extracted = extractFieldsForNextStage(depStage, stage, completedOutputs[depStage])
      Object.assign(testInput, extracted)
    }
  }

  return testInput
}

/** Internal: run a set of execution levels sequentially (stages within a level run in parallel) */
async function runLevels(
  levels: ExecutionLevel[],
  baseInput: Record<string, unknown>,
  language: 'ko' | 'en',
  onStageUpdate: OnStageUpdate,
  signal?: AbortSignal,
  preSeededOutputs?: Record<string, Record<string, unknown>>,
): Promise<Record<string, PipelineStageResult>> {
  const completedOutputs: Record<string, Record<string, unknown>> = { ...preSeededOutputs }
  const results: Record<string, PipelineStageResult> = {}
  const failedStages = new Set<PromptStage>()

  for (const level of levels) {
    if (signal?.aborted) break

    // Small delay between levels to respect API rate limits
    if (level.level > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    const stagePromises = level.stages.map(async (stage) => {
      // Skip stages whose dependencies failed
      const deps = STAGE_DEPENDENCIES[stage].dependsOn
      const hasFailedDep = deps.some((d) => failedStages.has(d))
      if (hasFailedDep) {
        results[stage] = { stage, status: 'skipped', error: 'Upstream stage failed' }
        onStageUpdate(stage, results[stage])
        return
      }

      if (signal?.aborted) {
        results[stage] = { stage, status: 'skipped' }
        return
      }

      const startedAt = Date.now()
      onStageUpdate(stage, { stage, status: 'running', startedAt })

      try {
        // 1. Fetch stage prompt
        const stagePrompt = await fetchStagePrompt(stage)

        // 2. Build chained input
        const testInput = buildChainedInput(stage, baseInput, completedOutputs)

        // 3. Execute test
        const result = await executeStageTest(stage, stagePrompt?.id, testInput, language, signal)

        // 4. Store output for downstream stages
        if (result.output) {
          completedOutputs[stage] = result.output as unknown as Record<string, unknown>
        }

        const completedAt = Date.now()
        results[stage] = {
          stage,
          status: 'completed',
          result,
          stagePromptId: stagePrompt?.id,
          startedAt,
          completedAt,
        }
        onStageUpdate(stage, results[stage])
      } catch (err) {
        failedStages.add(stage)
        const completedAt = Date.now()
        results[stage] = {
          stage,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          startedAt,
          completedAt,
        }
        onStageUpdate(stage, results[stage])
      }
    })

    await Promise.all(stagePromises)
  }

  return results
}

/**
 * Execute the full pipeline.
 *
 * Uses existing APIs:
 *   GET  /api/prompt-studio/stages/[stage]      → fetch stage prompt
 *   POST /api/prompt-studio/stages/[stage]/test  → run test
 */
export async function executePipeline(
  config: PipelineConfig,
  onStageUpdate: OnStageUpdate,
  signal?: AbortSignal
): Promise<Record<string, PipelineStageResult>> {
  const levels = buildExecutionLevels(config.includeChapters)
  return runLevels(
    levels,
    config.baseInput as unknown as Record<string, unknown>,
    config.language,
    onStageUpdate,
    signal,
    config.upstreamResults,
  )
}

/**
 * Execute only the upstream chain leading to (and including) the target stage.
 */
export async function executeUpToStage(
  target: PromptStage,
  baseInput: Record<string, unknown>,
  language: 'ko' | 'en',
  onStageUpdate: OnStageUpdate,
  signal?: AbortSignal,
): Promise<Record<string, PipelineStageResult>> {
  const levels = getUpstreamChain(target)
  return runLevels(levels, baseInput, language, onStageUpdate, signal)
}
