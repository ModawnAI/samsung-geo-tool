/**
 * Pipeline Types
 * Types for pipeline test execution and orchestration
 */

import type { PromptStage, StageTestResponse } from './prompt-studio'

export interface PipelineBaseInput {
  productName: string
  category: string
  keywords: string[]
  videoDescription?: string
  srtContent?: string
}

export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface PipelineStageResult {
  stage: PromptStage
  status: PipelineStageStatus
  result?: StageTestResponse
  error?: string
  stagePromptId?: string
  startedAt?: number
  completedAt?: number
}

export interface PipelineState {
  stages: Partial<Record<PromptStage, PipelineStageResult>>
  status: 'idle' | 'running' | 'completed' | 'partial' | 'failed' | 'aborted'
  totalLatencyMs: number
  startedAt?: number
  completedAt?: number
}

export interface ExecutionLevel {
  level: number
  stages: PromptStage[]
}

export interface PipelineConfig {
  baseInput: PipelineBaseInput
  language: 'ko' | 'en'
  includeChapters: boolean
  startFromStage?: PromptStage
  upstreamResults?: Record<string, Record<string, unknown>>
}
