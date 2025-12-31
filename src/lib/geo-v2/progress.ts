/**
 * Progress Tracking Utilities
 * Stage-specific progress indicators for the v2 pipeline
 */

import type { PipelineStage, PipelineProgress } from '@/types/geo-v2'
import { STAGE_PROGRESS_MAP } from '@/types/geo-v2'

export interface ProgressState {
  currentStage: PipelineStage | null
  completedStages: PipelineStage[]
  percentage: number
  message: string
  startTime: number
  elapsedTime: number
  estimatedTimeRemaining: number
  errors: Array<{
    stage: PipelineStage
    message: string
  }>
}

/**
 * Create initial progress state
 */
export function createInitialProgressState(): ProgressState {
  return {
    currentStage: null,
    completedStages: [],
    percentage: 0,
    message: 'Initializing...',
    startTime: Date.now(),
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    errors: [],
  }
}

/**
 * Update progress state based on pipeline progress
 */
export function updateProgressState(
  currentState: ProgressState,
  progress: PipelineProgress
): ProgressState {
  const now = Date.now()
  const elapsedTime = now - currentState.startTime

  // Calculate estimated time remaining based on progress
  const estimatedTimeRemaining = progress.percentage > 0
    ? (elapsedTime / progress.percentage) * (100 - progress.percentage)
    : 0

  // Update completed stages
  const completedStages = progress.completedAt
    ? [...currentState.completedStages.filter(s => s !== progress.stage), progress.stage]
    : currentState.completedStages

  return {
    ...currentState,
    currentStage: progress.completedAt ? null : progress.stage,
    completedStages,
    percentage: progress.percentage,
    message: progress.message,
    elapsedTime,
    estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
  }
}

/**
 * Get stage-specific emoji/icon
 */
export function getStageIcon(stage: PipelineStage): string {
  const icons: Record<PipelineStage, string> = {
    description: '📝',
    usp_extraction: '🎯',
    chapters: '📑',
    faq: '❓',
    step_by_step: '📋',
    case_studies: '💼',
    keywords: '🔑',
    grounding_aggregation: '🔗',
  }
  return icons[stage] || '⚙️'
}

/**
 * Get stage display name in Korean or English
 */
export function getStageName(stage: PipelineStage, language: 'ko' | 'en' = 'ko'): string {
  const names: Record<PipelineStage, { ko: string; en: string }> = {
    description: { ko: '설명문 생성', en: 'Description Generation' },
    usp_extraction: { ko: 'USP 추출', en: 'USP Extraction' },
    chapters: { ko: '챕터 생성', en: 'Chapter Generation' },
    faq: { ko: 'FAQ 생성', en: 'FAQ Generation' },
    step_by_step: { ko: '단계별 가이드', en: 'Step-by-Step Guide' },
    case_studies: { ko: '사례 연구', en: 'Case Studies' },
    keywords: { ko: '키워드 추출', en: 'Keyword Extraction' },
    grounding_aggregation: { ko: '그라운딩 집계', en: 'Grounding Aggregation' },
  }
  return names[stage]?.[language] || stage
}

/**
 * Format progress percentage for display
 */
export function formatProgressPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`
}

/**
 * Format elapsed/remaining time for display
 */
export function formatTime(milliseconds: number): string {
  if (milliseconds < 1000) return '< 1s'

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

/**
 * Get stage status for display
 */
export function getStageStatus(
  stage: PipelineStage,
  state: ProgressState
): 'pending' | 'active' | 'completed' | 'error' {
  if (state.errors.some(e => e.stage === stage)) {
    return 'error'
  }
  if (state.completedStages.includes(stage)) {
    return 'completed'
  }
  if (state.currentStage === stage) {
    return 'active'
  }
  return 'pending'
}

/**
 * Get status indicator for a stage
 */
export function getStageStatusIndicator(status: 'pending' | 'active' | 'completed' | 'error'): string {
  const indicators = {
    pending: '○',
    active: '●',
    completed: '✓',
    error: '✗',
  }
  return indicators[status]
}

/**
 * Generate progress bar string representation
 */
export function generateProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled

  const filledBar = '█'.repeat(filled)
  const emptyBar = '░'.repeat(empty)

  return `[${filledBar}${emptyBar}] ${formatProgressPercentage(percentage)}`
}

/**
 * Generate full progress display for console
 */
export function generateProgressDisplay(state: ProgressState, language: 'ko' | 'en' = 'ko'): string {
  const stages: PipelineStage[] = [
    'description',
    'usp_extraction',
    'chapters',
    'faq',
    'step_by_step',
    'case_studies',
    'keywords',
    'grounding_aggregation',
  ]

  const lines: string[] = [
    '═'.repeat(50),
    language === 'ko' ? '📊 GEO v2 파이프라인 진행 상황' : '📊 GEO v2 Pipeline Progress',
    '═'.repeat(50),
    '',
    generateProgressBar(state.percentage, 30),
    '',
  ]

  // Stage status list
  for (const stage of stages) {
    const status = getStageStatus(stage, state)
    const indicator = getStageStatusIndicator(status)
    const icon = getStageIcon(stage)
    const name = getStageName(stage, language)
    const stageProgress = STAGE_PROGRESS_MAP[stage]

    let statusText = ''
    if (status === 'active') {
      statusText = language === 'ko' ? '진행중...' : 'In progress...'
    } else if (status === 'completed') {
      statusText = language === 'ko' ? '완료' : 'Done'
    } else if (status === 'error') {
      statusText = language === 'ko' ? '오류' : 'Error'
    }

    lines.push(`${indicator} ${icon} ${name} (${stageProgress.percentage}%) ${statusText}`)
  }

  lines.push('')
  lines.push('─'.repeat(50))
  lines.push(`${language === 'ko' ? '경과 시간' : 'Elapsed'}: ${formatTime(state.elapsedTime)}`)

  if (state.estimatedTimeRemaining > 0 && state.percentage < 100) {
    lines.push(`${language === 'ko' ? '예상 남은 시간' : 'ETA'}: ${formatTime(state.estimatedTimeRemaining)}`)
  }

  if (state.errors.length > 0) {
    lines.push('')
    lines.push(`⚠️ ${language === 'ko' ? '오류' : 'Errors'}:`)
    for (const error of state.errors) {
      lines.push(`  • ${getStageName(error.stage, language)}: ${error.message}`)
    }
  }

  lines.push('═'.repeat(50))

  return lines.join('\n')
}

/**
 * Create a progress callback that logs to console
 */
export function createConsoleProgressLogger(language: 'ko' | 'en' = 'ko') {
  let state = createInitialProgressState()

  return (progress: PipelineProgress) => {
    state = updateProgressState(state, progress)

    // Clear console and show full progress (for terminals that support it)
    console.clear?.()
    console.log(generateProgressDisplay(state, language))
  }
}

/**
 * Estimate total pipeline time based on content length
 */
export function estimatePipelineTime(contentLength: number): {
  minimum: number
  maximum: number
  average: number
} {
  // Base time: ~90 seconds for average content
  const baseTime = 90000 // 90 seconds in ms

  // Adjust based on content length
  const lengthFactor = Math.min(2, Math.max(0.5, contentLength / 3000))

  return {
    minimum: Math.round(baseTime * 0.7 * lengthFactor),
    maximum: Math.round(baseTime * 1.5 * lengthFactor),
    average: Math.round(baseTime * lengthFactor),
  }
}
