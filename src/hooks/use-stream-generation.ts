'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GEOv2GenerateResponse } from '@/types/geo-v2'
import {
  type StreamStage,
  type StreamEvent,
  STAGE_LABELS,
} from '@/lib/geo-v2/stream-generator'

export interface StreamGenerationState {
  isLoading: boolean
  progress: number
  currentStage: StreamStage | null
  stageMessage: string
  result: GEOv2GenerateResponse | null
  error: string | null
  completedStages: StreamStage[]
}

export interface StreamGenerationParams {
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

const initialState: StreamGenerationState = {
  isLoading: false,
  progress: 0,
  currentStage: null,
  stageMessage: '',
  result: null,
  error: null,
  completedStages: [],
}

export function useStreamGeneration() {
  const [state, setState] = useState<StreamGenerationState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const startGeneration = useCallback(async (params: StreamGenerationParams) => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current
    const language = params.language || 'ko'

    setState({
      ...initialState,
      isLoading: true,
      stageMessage: language === 'ko' ? '생성 시작 중...' : 'Starting generation...',
    })

    try {
      // Use POST with ReadableStream for SSE
      const response = await fetch('/api/generate-v2-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let completedStages: StreamStage[] = []

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6))

              switch (event.type) {
                case 'stage_start':
                  setState((prev) => ({
                    ...prev,
                    currentStage: event.stage,
                    stageMessage: event.message,
                    progress: event.progress,
                  }))
                  break

                case 'progress':
                  setState((prev) => ({
                    ...prev,
                    progress: event.progress,
                    stageMessage: event.message,
                  }))
                  break

                case 'stage_complete':
                  if (event.stage !== 'complete' && event.stage !== 'error') {
                    completedStages = [...completedStages, event.stage]
                  }
                  setState((prev) => ({
                    ...prev,
                    progress: event.progress,
                    completedStages: [...completedStages],
                  }))
                  break

                case 'complete':
                  setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    progress: 100,
                    currentStage: 'complete',
                    stageMessage: event.message,
                    result: event.data as GEOv2GenerateResponse,
                    completedStages: [...completedStages],
                  }))
                  break

                case 'error':
                  setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    currentStage: 'error',
                    error: event.message,
                    completedStages: [...completedStages],
                  }))
                  break
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError)
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          stageMessage: language === 'ko' ? '취소됨' : 'Cancelled',
        }))
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentStage: 'error',
        error: errorMessage,
      }))
    }
  }, [])

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    cancelGeneration()
    setState(initialState)
  }, [cancelGeneration])

  return {
    ...state,
    startGeneration,
    cancelGeneration,
    reset,
  }
}

/**
 * Get stage label for display
 */
export function getStageLabel(stage: StreamStage, language: 'ko' | 'en' = 'ko'): string {
  return STAGE_LABELS[stage]?.[language] || stage
}

/**
 * Get stage progress icon/emoji
 */
export function getStageIcon(stage: StreamStage): string {
  const icons: Record<StreamStage, string> = {
    initializing: '🔄',
    description: '📝',
    usp_extraction: '🎯',
    chapters: '📑',
    faq: '❓',
    step_by_step: '👣',
    case_studies: '📋',
    keywords: '🏷️',
    hashtags: '#️⃣',
    scoring: '📊',
    complete: '✅',
    error: '❌',
  }
  return icons[stage] || '⏳'
}
