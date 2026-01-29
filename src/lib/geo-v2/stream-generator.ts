/**
 * Stream Generator for GEO v2 Pipeline
 * Provides real-time progress updates via Server-Sent Events
 */

export type StreamStage =
  | 'initializing'
  | 'description'
  | 'usp_extraction'
  | 'chapters'
  | 'faq'
  | 'step_by_step'
  | 'case_studies'
  | 'keywords'
  | 'hashtags'
  | 'scoring'
  | 'complete'
  | 'error'

export interface StreamEvent {
  type: 'stage_start' | 'stage_complete' | 'progress' | 'result' | 'error' | 'complete'
  stage: StreamStage
  progress: number // 0-100
  message: string
  data?: unknown
  timestamp: number
}

// Progress weights for each stage (total = 100)
export const STAGE_WEIGHTS: Record<StreamStage, number> = {
  initializing: 5,
  description: 20,
  usp_extraction: 10,
  chapters: 10,
  faq: 15,
  step_by_step: 5,
  case_studies: 10,
  keywords: 10,
  hashtags: 5,
  scoring: 5,
  complete: 5,
  error: 0,
}

// Stage display names
export const STAGE_LABELS: Record<StreamStage, { ko: string; en: string }> = {
  initializing: { ko: '초기화 중...', en: 'Initializing...' },
  description: { ko: '설명문 생성 중...', en: 'Generating description...' },
  usp_extraction: { ko: 'USP 추출 중...', en: 'Extracting USPs...' },
  chapters: { ko: '챕터 생성 중...', en: 'Generating chapters...' },
  faq: { ko: 'FAQ 생성 중...', en: 'Generating FAQ...' },
  step_by_step: { ko: '단계별 가이드 생성 중...', en: 'Generating step-by-step guide...' },
  case_studies: { ko: '사례 연구 생성 중...', en: 'Generating case studies...' },
  keywords: { ko: '키워드 분석 중...', en: 'Analyzing keywords...' },
  hashtags: { ko: '해시태그 생성 중...', en: 'Generating hashtags...' },
  scoring: { ko: '점수 계산 중...', en: 'Calculating scores...' },
  complete: { ko: '완료', en: 'Complete' },
  error: { ko: '오류 발생', en: 'Error occurred' },
}

/**
 * Calculate cumulative progress based on completed stages
 */
export function calculateProgress(
  completedStages: StreamStage[],
  currentStage?: StreamStage,
  currentStageProgress?: number
): number {
  let totalProgress = 0

  for (const stage of completedStages) {
    totalProgress += STAGE_WEIGHTS[stage] || 0
  }

  if (currentStage && currentStageProgress !== undefined) {
    const stageWeight = STAGE_WEIGHTS[currentStage] || 0
    totalProgress += (stageWeight * currentStageProgress) / 100
  }

  return Math.min(Math.round(totalProgress), 100)
}

/**
 * Create a stream event
 */
export function createStreamEvent(
  type: StreamEvent['type'],
  stage: StreamStage,
  progress: number,
  message: string,
  data?: unknown
): StreamEvent {
  return {
    type,
    stage,
    progress,
    message,
    data,
    timestamp: Date.now(),
  }
}

/**
 * Format SSE message
 */
export function formatSSEMessage(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/**
 * Create a readable stream that sends progress events
 */
export function createProgressStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
    cancel() {
      controller = null
    },
  })

  const send = (event: StreamEvent) => {
    if (controller) {
      try {
        controller.enqueue(encoder.encode(formatSSEMessage(event)))
      } catch {
        // Stream may be closed
      }
    }
  }

  const close = () => {
    if (controller) {
      try {
        controller.close()
      } catch {
        // Already closed
      }
      controller = null
    }
  }

  return { stream, send, close }
}

/**
 * Progress tracker class for managing stage progress
 */
export class ProgressTracker {
  private completedStages: StreamStage[] = []
  private currentStage: StreamStage = 'initializing'
  private currentStageProgress = 0
  private onProgress?: (event: StreamEvent) => void

  constructor(onProgress?: (event: StreamEvent) => void) {
    this.onProgress = onProgress
  }

  startStage(stage: StreamStage, language: 'ko' | 'en' = 'ko') {
    this.currentStage = stage
    this.currentStageProgress = 0

    const progress = calculateProgress(this.completedStages, stage, 0)
    const message = STAGE_LABELS[stage][language]

    const event = createStreamEvent('stage_start', stage, progress, message)
    this.onProgress?.(event)

    return event
  }

  updateProgress(percentage: number, message?: string, language: 'ko' | 'en' = 'ko') {
    this.currentStageProgress = Math.min(percentage, 100)

    const progress = calculateProgress(
      this.completedStages,
      this.currentStage,
      this.currentStageProgress
    )

    const eventMessage = message || STAGE_LABELS[this.currentStage][language]
    const event = createStreamEvent('progress', this.currentStage, progress, eventMessage)
    this.onProgress?.(event)

    return event
  }

  completeStage(data?: unknown, language: 'ko' | 'en' = 'ko') {
    this.completedStages.push(this.currentStage)
    this.currentStageProgress = 100

    const progress = calculateProgress(this.completedStages)
    const message = STAGE_LABELS[this.currentStage][language]

    const event = createStreamEvent('stage_complete', this.currentStage, progress, message, data)
    this.onProgress?.(event)

    return event
  }

  complete(result: unknown, language: 'ko' | 'en' = 'ko') {
    const event = createStreamEvent(
      'complete',
      'complete',
      100,
      STAGE_LABELS.complete[language],
      result
    )
    this.onProgress?.(event)

    return event
  }

  error(errorMessage: string, language: 'ko' | 'en' = 'ko') {
    const event = createStreamEvent(
      'error',
      'error',
      calculateProgress(this.completedStages),
      errorMessage
    )
    this.onProgress?.(event)

    return event
  }

  getProgress(): number {
    return calculateProgress(this.completedStages, this.currentStage, this.currentStageProgress)
  }

  getCurrentStage(): StreamStage {
    return this.currentStage
  }

  getCompletedStages(): StreamStage[] {
    return [...this.completedStages]
  }
}
