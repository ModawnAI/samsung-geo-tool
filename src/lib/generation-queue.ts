/**
 * Generation Queue Manager
 * Manages parallel generation sessions with queue processing
 */

import { useGenerationStore, type GenerationSession, type GenerationSessionResult } from '@/store/generation-store'
import type { GEOv2GenerateResponse, GroundingQualityScore } from '@/types/geo-v2'

// ==========================================
// Types
// ==========================================

interface GroundingKeyword {
  term: string
  score: number
  sources: string[]
}

interface GroundingResponse {
  keywords: GroundingKeyword[]
  error?: string
}

interface GenerateRequestPayload {
  productName: string
  youtubeUrl: string
  srtContent: string
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

// ==========================================
// Queue Manager Singleton
// ==========================================

class GenerationQueueManager {
  private static instance: GenerationQueueManager
  private abortControllers: Map<string, AbortController> = new Map()
  private processingQueue = false
  private queueCheckInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start queue processing interval
    this.startQueueProcessor()
  }

  static getInstance(): GenerationQueueManager {
    if (!GenerationQueueManager.instance) {
      GenerationQueueManager.instance = new GenerationQueueManager()
    }
    return GenerationQueueManager.instance
  }

  /**
   * Start automatic queue processing
   */
  private startQueueProcessor() {
    if (this.queueCheckInterval) return

    this.queueCheckInterval = setInterval(() => {
      this.processQueue()
    }, 1000) // Check every second
  }

  /**
   * Stop queue processing (cleanup)
   */
  stopQueueProcessor() {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval)
      this.queueCheckInterval = null
    }
  }

  /**
   * Process pending sessions in the queue
   */
  async processQueue() {
    if (this.processingQueue) return

    const store = useGenerationStore.getState()
    const pendingSessions = store.getPendingSessions()
    const canStart = store.canStartNewSession()

    if (pendingSessions.length === 0 || !canStart) return

    this.processingQueue = true

    try {
      // Get the next pending session
      const nextSession = pendingSessions[0]
      if (nextSession) {
        await this.startSession(nextSession.id)
      }
    } finally {
      this.processingQueue = false
    }
  }

  /**
   * Add a session to the queue and start processing
   */
  async addToQueue(sessionId: string): Promise<void> {
    console.log(`[Queue] Added session ${sessionId} to queue`)
    // Queue processing will pick it up automatically
    this.processQueue()
  }

  /**
   * Start processing a specific session
   */
  async startSession(sessionId: string): Promise<void> {
    const store = useGenerationStore.getState()
    const session = store.getSessionById(sessionId)

    if (!session) {
      console.error(`[Queue] Session ${sessionId} not found`)
      return
    }

    if (session.status !== 'pending') {
      console.warn(`[Queue] Session ${sessionId} is not pending (${session.status})`)
      return
    }

    // Create abort controller for this session
    const abortController = new AbortController()
    this.abortControllers.set(sessionId, abortController)

    console.log(`[Queue] Starting session ${sessionId} for ${session.input.productName}`)

    try {
      // Stage 1: Grounding (if keywords not selected)
      if (session.input.selectedKeywords.length === 0) {
        store.updateSessionStatus(sessionId, 'grounding')
        store.updateSessionProgress(sessionId, 5, 'grounding')

        const groundingResult = await this.runGrounding(session, abortController.signal)

        if (abortController.signal.aborted) {
          throw new Error('Session cancelled')
        }

        // Update session with grounding keywords
        const updatedSession = store.getSessionById(sessionId)
        if (updatedSession) {
          // Use top 3 keywords from grounding
          const topKeywords = groundingResult.keywords
            .slice(0, 3)
            .map(k => k.term)

          // Update input with grounding keywords
          store.updateSessionProgress(sessionId, 10, 'grounding-complete')
        }
      }

      // Stage 2: Generation
      store.updateSessionStatus(sessionId, 'generating')
      store.updateSessionProgress(sessionId, 15, 'description')

      const generateResult = await this.runGeneration(session, abortController.signal, (progress, stage) => {
        store.updateSessionProgress(sessionId, progress, stage)
      })

      if (abortController.signal.aborted) {
        throw new Error('Session cancelled')
      }

      // Build result
      const result: GenerationSessionResult = {
        description: generateResult.description.full,
        timestamps: generateResult.chapters.timestamps,
        hashtags: generateResult.hashtags,
        faq: this.formatFAQ(generateResult.faq.faqs),
        breakdown: {
          playbookInfluence: {
            sectionsUsed: [],
            guidelinesApplied: 0,
            confidence: 0,
          },
          groundingInfluence: {
            topSignals: generateResult.uspResult?.usps?.map(u => ({
              term: u.feature,
              score: u.confidence === 'high' ? 1 : u.confidence === 'medium' ? 0.7 : 0.4,
            })) || [],
            signalsApplied: generateResult.uspResult?.usps?.length || 0,
          },
          userInputInfluence: {
            keywordsIntegrated: session.input.selectedKeywords,
            timestampsGenerated: (generateResult.chapters.timestamps.match(/\d+:\d+/g) || []).length,
          },
        },
        tuningMetadata: generateResult.tuningMetadata ? {
          configSource: generateResult.tuningMetadata.configSource === 'database' ? 'database' : 'defaults',
          promptVersionId: generateResult.tuningMetadata.promptVersionId,
          weightsVersionId: generateResult.tuningMetadata.weightsVersionId,
          weightsName: generateResult.tuningMetadata.weightsName,
          loadedAt: generateResult.tuningMetadata.loadedAt,
          scoreBreakdown: generateResult.tuningMetadata.scoreBreakdown || [],
        } : null,
        imageAltResult: generateResult.imageAltResult || null,
        groundingKeywords: [],
        finalScore: generateResult.finalScore,
      }

      store.updateSessionResult(sessionId, result)
      console.log(`[Queue] Session ${sessionId} completed successfully`)

      // Auto-save the generation
      await this.autoSaveSession(sessionId)

      // Trigger next session in queue
      this.processQueue()

    } catch (error) {
      if (abortController.signal.aborted) {
        store.updateSessionStatus(sessionId, 'cancelled')
        console.log(`[Queue] Session ${sessionId} was cancelled`)
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        store.updateSessionError(sessionId, errorMessage)
        console.error(`[Queue] Session ${sessionId} failed:`, errorMessage)
      }

      // Trigger next session in queue
      this.processQueue()
    } finally {
      this.abortControllers.delete(sessionId)
    }
  }

  /**
   * Cancel a running session
   */
  cancelSession(sessionId: string): void {
    const abortController = this.abortControllers.get(sessionId)
    if (abortController) {
      abortController.abort()
      console.log(`[Queue] Cancelling session ${sessionId}`)
    }

    const store = useGenerationStore.getState()
    const session = store.getSessionById(sessionId)
    if (session && session.status === 'pending') {
      store.updateSessionStatus(sessionId, 'cancelled')
    }
  }

  /**
   * Cancel all running sessions
   */
  cancelAllSessions(): void {
    this.abortControllers.forEach((controller, sessionId) => {
      controller.abort()
      console.log(`[Queue] Cancelling session ${sessionId}`)
    })

    const store = useGenerationStore.getState()
    const activeSessions = store.getActiveSessions()
    activeSessions.forEach(session => {
      store.updateSessionStatus(session.id, 'cancelled')
    })
  }

  /**
   * Run grounding API for a session
   */
  private async runGrounding(
    session: GenerationSession,
    signal: AbortSignal
  ): Promise<GroundingResponse> {
    const response = await fetch('/api/grounding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: session.input.productName,
        category: session.input.categoryId,
        srtContent: session.input.srtContent,
        videoUrl: session.input.videoUrl,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Grounding failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Run generation API for a session
   */
  private async runGeneration(
    session: GenerationSession,
    signal: AbortSignal,
    onProgress: (progress: number, stage: string) => void
  ): Promise<GEOv2GenerateResponse> {
    const payload: GenerateRequestPayload = {
      productName: session.input.productName,
      youtubeUrl: session.input.videoUrl,
      srtContent: session.input.srtContent,
      keywords: session.input.selectedKeywords,
      productCategory: session.input.categoryId,
      usePlaybook: true,
      launchDate: session.input.launchDate?.toISOString(),
      pipelineConfig: 'full',
      language: 'ko',
      contentType: session.input.contentType,
      videoFormat: session.input.videoFormat,
      fixedHashtags: session.input.fixedHashtags,
      useFixedHashtags: session.input.useFixedHashtags,
      vanityLinkCode: session.input.vanityLinkCode,
    }

    // Start progress simulation while waiting for API
    const progressStages = [
      { progress: 20, stage: 'description', delay: 2000 },
      { progress: 35, stage: 'usp-extraction', delay: 4000 },
      { progress: 50, stage: 'chapters', delay: 3000 },
      { progress: 65, stage: 'faq', delay: 4000 },
      { progress: 80, stage: 'case-studies', delay: 3000 },
      { progress: 90, stage: 'keywords', delay: 2000 },
    ]

    let currentStageIndex = 0
    const progressInterval = setInterval(() => {
      if (signal.aborted || currentStageIndex >= progressStages.length) {
        clearInterval(progressInterval)
        return
      }

      const stage = progressStages[currentStageIndex]
      onProgress(stage.progress, stage.stage)
      currentStageIndex++
    }, 3000)

    try {
      const response = await fetch('/api/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Generation failed: ${response.statusText}`)
      }

      onProgress(95, 'finalizing')
      return response.json()
    } catch (error) {
      clearInterval(progressInterval)
      throw error
    }
  }

  /**
   * Format FAQ items to string
   */
  private formatFAQ(faqs: Array<{ question: string; answer: string }>): string {
    return faqs
      .map((faq, i) => `Q${i + 1}: ${faq.question}\nA${i + 1}: ${faq.answer}`)
      .join('\n\n')
  }

  /**
   * Auto-save a completed session to the database
   */
  private async autoSaveSession(sessionId: string): Promise<void> {
    const store = useGenerationStore.getState()
    const session = store.getSessionById(sessionId)

    if (!session || !session.result) return

    try {
      const response = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: session.input.productId,
          srt_content: session.input.srtContent,
          selected_keywords: session.input.selectedKeywords,
          description: session.result.description,
          timestamps: session.result.timestamps,
          hashtags: session.result.hashtags,
          faq: session.result.faq,
          status: 'draft',
          campaign_tag: session.input.campaignTag || null,
          video_url: session.input.videoUrl || null,
          image_alt_result: session.result.imageAltResult || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        store.updateSessionGenerationId(sessionId, data.id, 'draft')
        console.log(`[Queue] Session ${sessionId} auto-saved with ID ${data.id}`)
      }
    } catch (error) {
      console.error(`[Queue] Failed to auto-save session ${sessionId}:`, error)
    }
  }

  /**
   * Get queue status for UI
   */
  getQueueStatus(): {
    pending: number
    active: number
    completed: number
    failed: number
    total: number
  } {
    const store = useGenerationStore.getState()
    const sessions = Object.values(store.sessions)

    return {
      pending: sessions.filter(s => s.status === 'pending').length,
      active: sessions.filter(s => s.status === 'grounding' || s.status === 'generating').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      failed: sessions.filter(s => s.status === 'failed' || s.status === 'cancelled').length,
      total: sessions.length,
    }
  }
}

// Export singleton instance getter
export const getQueueManager = () => GenerationQueueManager.getInstance()

// Export hook for React components
export function useQueueManager() {
  return getQueueManager()
}
