import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ContentType, VideoFormat, InputMethod, ImageAltResult, GEOv2Score } from '@/types/geo-v2'

export type GenerationStep = 'product' | 'content' | 'keywords' | 'output'

export interface GroundingSource {
  uri: string
  title: string
  tier: 1 | 2 | 3 | 4
}

export interface GroundingKeyword {
  term: string
  score: number
  sources: GroundingSource[]
}

export interface GroundingSignal {
  term: string
  score: number
  source?: string
  recency?: string
}

export interface QualityScores {
  overall: number
  brandVoice: number
  keywordIntegration: number
  geoOptimization: number
  faqQuality: number
  refined: boolean // Whether content was refined
}

export interface ScoreBreakdownItem {
  metric: string
  label: string
  score: number
  weight: number
  weightedScore: number
  contribution: number
}

export interface TuningMetadata {
  configSource: 'database' | 'defaults'
  promptVersionId: string | null
  weightsVersionId: string | null
  weightsName: string | null
  loadedAt: string
  scoreBreakdown: ScoreBreakdownItem[]
}

export interface GenerationBreakdown {
  playbookInfluence: {
    sectionsUsed: string[]
    guidelinesApplied: number
    confidence: number
  }
  groundingInfluence: {
    topSignals: GroundingSignal[]
    signalsApplied: number
  }
  userInputInfluence: {
    keywordsIntegrated: string[]
    timestampsGenerated: number
  }
  qualityScores?: QualityScores // New: AI critique scores
}

// ==========================================
// Multi-Session Generation Types
// ==========================================

export type SessionStatus =
  | 'pending'     // Waiting in queue
  | 'grounding'   // Running grounding API
  | 'generating'  // Running generation API
  | 'completed'   // Successfully finished
  | 'failed'      // Error occurred
  | 'cancelled'   // User cancelled

export interface GenerationSessionInput {
  categoryId: string
  productId: string
  productName: string
  campaignTag: string
  launchDate: Date | null
  contentType: ContentType
  videoFormat: VideoFormat
  inputMethod: InputMethod
  fixedHashtags: string[]
  useFixedHashtags: boolean
  vanityLinkCode: string
  videoUrl: string
  srtContent: string
  selectedBriefId: string | null
  briefUsps: string[]
  selectedKeywords: string[]
}

export interface GenerationSessionResult {
  description: string
  timestamps: string
  hashtags: string[]
  faq: string
  breakdown: GenerationBreakdown | null
  tuningMetadata: TuningMetadata | null
  imageAltResult: ImageAltResult | null
  groundingKeywords: GroundingKeyword[]
  finalScore?: GEOv2Score
}

export interface GenerationSession {
  id: string
  createdAt: string
  startedAt?: string
  completedAt?: string

  // Input data
  input: GenerationSessionInput

  // Status tracking
  status: SessionStatus
  progress: number // 0-100
  currentStage: string | null // e.g., 'description', 'usp', 'faq'
  error?: string

  // Result data
  result?: GenerationSessionResult

  // Persistence tracking
  generationId?: string // Database ID after save
  generationStatus: 'unsaved' | 'draft' | 'confirmed'
}

interface GenerationState {
  // Current step
  step: GenerationStep

  // Step 1: Product selection
  categoryId: string | null
  productId: string | null
  productName: string | null
  campaignTag: string
  launchDate: Date | null // Product launch date for content filtering

  // Samsung Standard Fields (P1)
  contentType: ContentType
  videoFormat: VideoFormat
  inputMethod: InputMethod
  fixedHashtags: string[]
  useFixedHashtags: boolean
  vanityLinkCode: string

  // Step 2: Content input
  videoUrl: string
  srtContent: string

  // Step 3: Keywords
  selectedBriefId: string | null // Selected brief for generation
  briefUsps: string[]
  groundingKeywords: GroundingKeyword[]
  selectedKeywords: string[]
  isGroundingLoading: boolean

  // Step 4: Output
  description: string
  timestamps: string
  hashtags: string[]
  faq: string
  breakdown: GenerationBreakdown | null
  tuningMetadata: TuningMetadata | null
  imageAltResult: ImageAltResult | null // Image alt text templates
  isGenerating: boolean
  generationStage: string | null // Current generation stage (usps, faq, case-studies, etc.)

  // Saved generation tracking
  generationId: string | null
  generationStatus: 'unsaved' | 'draft' | 'confirmed'
  isSaving: boolean

  // ==========================================
  // Multi-Session State
  // ==========================================
  sessions: Record<string, GenerationSession>
  sessionOrder: string[] // Order of session IDs for display
  activeSessionId: string | null // Currently viewed session
  maxConcurrentSessions: number // Max parallel generations (default: 2)

  // Actions
  setStep: (step: GenerationStep) => void
  setCategory: (categoryId: string) => void
  setProduct: (productId: string, productName: string) => void
  setCampaignTag: (tag: string) => void
  setLaunchDate: (date: Date | null) => void
  // Samsung Standard Actions (P1)
  setContentType: (type: ContentType) => void
  setVideoFormat: (format: VideoFormat) => void
  setInputMethod: (method: InputMethod) => void
  setFixedHashtags: (hashtags: string[]) => void
  setUseFixedHashtags: (use: boolean) => void
  setVanityLinkCode: (code: string) => void
  setVideoUrl: (url: string) => void
  setSrtContent: (content: string) => void
  setSelectedBriefId: (briefId: string | null) => void
  setBriefUsps: (usps: string[]) => void
  setGroundingKeywords: (keywords: GroundingKeyword[]) => void
  setSelectedKeywords: (keywords: string[]) => void
  toggleKeyword: (keyword: string) => void
  setIsGroundingLoading: (loading: boolean) => void
  setOutput: (output: {
    description: string
    timestamps: string
    hashtags: string[]
    faq: string
    breakdown?: GenerationBreakdown
    tuningMetadata?: TuningMetadata
    imageAltResult?: ImageAltResult
  }) => void
  setIsGenerating: (generating: boolean) => void
  setGenerationStage: (stage: string | null) => void
  setGenerationId: (id: string | null) => void
  setGenerationStatus: (status: 'unsaved' | 'draft' | 'confirmed') => void
  setIsSaving: (saving: boolean) => void
  loadGeneration: (data: {
    id: string
    categoryId: string
    productId: string
    productName: string
    srtContent: string
    selectedKeywords: string[]
    description: string
    timestamps: string
    hashtags: string[]
    faq: string
    status: 'draft' | 'confirmed'
    campaignTag?: string
    videoUrl?: string
    imageAltResult?: ImageAltResult | null
  }) => void
  reset: () => void

  // ==========================================
  // Multi-Session Actions
  // ==========================================

  // Session CRUD
  createSession: (input: GenerationSessionInput) => string // Returns session ID
  createSessionFromCurrentInput: () => string | null // Create session from wizard form
  removeSession: (sessionId: string) => void
  clearCompletedSessions: () => void

  // Session state management
  setActiveSession: (sessionId: string | null) => void
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void
  updateSessionProgress: (sessionId: string, progress: number, stage?: string) => void
  updateSessionResult: (sessionId: string, result: GenerationSessionResult) => void
  updateSessionError: (sessionId: string, error: string) => void
  updateSessionGenerationId: (sessionId: string, generationId: string, status?: 'unsaved' | 'draft' | 'confirmed') => void

  // Queue helpers
  getSessionById: (sessionId: string) => GenerationSession | undefined
  getPendingSessions: () => GenerationSession[]
  getActiveSessions: () => GenerationSession[] // grounding or generating
  getCompletedSessions: () => GenerationSession[]
  canStartNewSession: () => boolean

  // Load session result into legacy fields (for OutputDisplay compatibility)
  loadSessionResult: (sessionId: string) => void
}

const initialState = {
  step: 'product' as GenerationStep,
  categoryId: null,
  productId: null,
  productName: null,
  campaignTag: '',
  launchDate: null as Date | null,
  // Samsung Standard Fields (P1) - defaults
  contentType: 'intro' as ContentType,
  videoFormat: 'feed_16x9' as VideoFormat,
  inputMethod: 'youtube_url' as InputMethod,
  fixedHashtags: [] as string[],
  useFixedHashtags: true, // Samsung prefers fixed hashtags
  vanityLinkCode: '',
  videoUrl: '',
  srtContent: '',
  selectedBriefId: null,
  briefUsps: [],
  groundingKeywords: [],
  selectedKeywords: [],
  isGroundingLoading: false,
  description: '',
  timestamps: '',
  hashtags: [],
  faq: '',
  breakdown: null as GenerationBreakdown | null,
  tuningMetadata: null as TuningMetadata | null,
  imageAltResult: null as ImageAltResult | null,
  isGenerating: false,
  generationStage: null as string | null,
  generationId: null,
  generationStatus: 'unsaved' as const,
  isSaving: false,
  // Multi-session state
  sessions: {} as Record<string, GenerationSession>,
  sessionOrder: [] as string[],
  activeSessionId: null as string | null,
  maxConcurrentSessions: 2,
}

// Helper to generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),

  setCategory: (categoryId) => set({ categoryId, productId: null, productName: null }),

  setProduct: (productId, productName) => set({ productId, productName }),

  setCampaignTag: (campaignTag) => set({ campaignTag }),

  setLaunchDate: (launchDate) => set({ launchDate }),

  // Samsung Standard Actions (P1)
  setContentType: (contentType) => set({ contentType }),

  setVideoFormat: (videoFormat) => set({ videoFormat }),

  setInputMethod: (inputMethod) => set({ inputMethod }),

  setFixedHashtags: (fixedHashtags) => set({ fixedHashtags }),

  setUseFixedHashtags: (useFixedHashtags) => set({ useFixedHashtags }),

  setVanityLinkCode: (vanityLinkCode) => set({ vanityLinkCode }),

  setVideoUrl: (videoUrl) => set({ videoUrl }),

  setSrtContent: (srtContent) => set({ srtContent }),

  setSelectedBriefId: (selectedBriefId) => set({ selectedBriefId }),

  setBriefUsps: (briefUsps) => set({ briefUsps }),

  setGroundingKeywords: (groundingKeywords) => set({ groundingKeywords }),

  setSelectedKeywords: (selectedKeywords) => set({ selectedKeywords }),

  toggleKeyword: (keyword) => {
    const { selectedKeywords } = get()
    if (selectedKeywords.includes(keyword)) {
      set({ selectedKeywords: selectedKeywords.filter((k) => k !== keyword) })
    } else if (selectedKeywords.length < 3) {
      set({ selectedKeywords: [...selectedKeywords, keyword] })
    }
  },

  setIsGroundingLoading: (isGroundingLoading) => set({ isGroundingLoading }),

  setOutput: (output) => set({
    description: output.description,
    timestamps: output.timestamps,
    hashtags: output.hashtags,
    faq: output.faq,
    breakdown: output.breakdown || null,
    tuningMetadata: output.tuningMetadata || null,
    imageAltResult: output.imageAltResult || null,
  }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setGenerationStage: (generationStage) => set({ generationStage }),

  setGenerationId: (generationId) => set({ generationId }),

  setGenerationStatus: (generationStatus) => set({ generationStatus }),

  setIsSaving: (isSaving) => set({ isSaving }),

  loadGeneration: (data) =>
    set({
      step: 'output',
      generationId: data.id,
      generationStatus: data.status,
      categoryId: data.categoryId,
      productId: data.productId,
      productName: data.productName,
      srtContent: data.srtContent,
      selectedKeywords: data.selectedKeywords,
      description: data.description,
      timestamps: data.timestamps,
      hashtags: data.hashtags,
      faq: data.faq,
      campaignTag: data.campaignTag || '',
      videoUrl: data.videoUrl || '',
      imageAltResult: data.imageAltResult || null,
    }),

  reset: () => set(initialState),

  // ==========================================
  // Multi-Session Action Implementations
  // ==========================================

  createSession: (input) => {
    const id = generateSessionId()
    const session: GenerationSession = {
      id,
      createdAt: new Date().toISOString(),
      input,
      status: 'pending',
      progress: 0,
      currentStage: null,
      generationStatus: 'unsaved',
    }

    set((state) => ({
      sessions: { ...state.sessions, [id]: session },
      sessionOrder: [...state.sessionOrder, id],
    }))

    return id
  },

  createSessionFromCurrentInput: () => {
    const state = get()
    if (!state.productId || !state.productName || !state.categoryId) {
      return null
    }

    const input: GenerationSessionInput = {
      categoryId: state.categoryId,
      productId: state.productId,
      productName: state.productName,
      campaignTag: state.campaignTag,
      launchDate: state.launchDate,
      contentType: state.contentType,
      videoFormat: state.videoFormat,
      inputMethod: state.inputMethod,
      fixedHashtags: state.fixedHashtags,
      useFixedHashtags: state.useFixedHashtags,
      vanityLinkCode: state.vanityLinkCode,
      videoUrl: state.videoUrl,
      srtContent: state.srtContent,
      selectedBriefId: state.selectedBriefId,
      briefUsps: state.briefUsps,
      selectedKeywords: state.selectedKeywords,
    }

    return get().createSession(input)
  },

  removeSession: (sessionId) => {
    set((state) => {
      const { [sessionId]: removed, ...remainingSessions } = state.sessions
      return {
        sessions: remainingSessions,
        sessionOrder: state.sessionOrder.filter((id) => id !== sessionId),
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      }
    })
  },

  clearCompletedSessions: () => {
    set((state) => {
      const completedIds = Object.values(state.sessions)
        .filter((s) => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled')
        .map((s) => s.id)

      const remainingSessions = Object.fromEntries(
        Object.entries(state.sessions).filter(([id]) => !completedIds.includes(id))
      )

      return {
        sessions: remainingSessions,
        sessionOrder: state.sessionOrder.filter((id) => !completedIds.includes(id)),
        activeSessionId: completedIds.includes(state.activeSessionId || '')
          ? null
          : state.activeSessionId,
      }
    })
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  updateSessionStatus: (sessionId, status) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      const updates: Partial<GenerationSession> = { status }

      if (status === 'grounding' || status === 'generating') {
        updates.startedAt = updates.startedAt || new Date().toISOString()
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updates.completedAt = new Date().toISOString()
      }

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, ...updates },
        },
      }
    })
  },

  updateSessionProgress: (sessionId, progress, stage) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            progress,
            currentStage: stage !== undefined ? stage : session.currentStage,
          },
        },
      }
    })
  },

  updateSessionResult: (sessionId, result) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            result,
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString(),
          },
        },
      }
    })
  },

  updateSessionError: (sessionId, error) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            error,
            status: 'failed',
            completedAt: new Date().toISOString(),
          },
        },
      }
    })
  },

  updateSessionGenerationId: (sessionId, generationId, status = 'draft') => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            generationId,
            generationStatus: status,
          },
        },
      }
    })
  },

  getSessionById: (sessionId) => get().sessions[sessionId],

  getPendingSessions: () =>
    Object.values(get().sessions).filter((s) => s.status === 'pending'),

  getActiveSessions: () =>
    Object.values(get().sessions).filter(
      (s) => s.status === 'grounding' || s.status === 'generating'
    ),

  getCompletedSessions: () =>
    Object.values(get().sessions).filter(
      (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled'
    ),

  canStartNewSession: () => {
    const state = get()
    const activeSessions = Object.values(state.sessions).filter(
      (s) => s.status === 'grounding' || s.status === 'generating'
    )
    return activeSessions.length < state.maxConcurrentSessions
  },

  loadSessionResult: (sessionId) => {
    const session = get().sessions[sessionId]
    if (!session || !session.result) return

    set({
      step: 'output',
      categoryId: session.input.categoryId,
      productId: session.input.productId,
      productName: session.input.productName,
      srtContent: session.input.srtContent,
      selectedKeywords: session.input.selectedKeywords,
      campaignTag: session.input.campaignTag,
      videoUrl: session.input.videoUrl,
      description: session.result.description,
      timestamps: session.result.timestamps,
      hashtags: session.result.hashtags,
      faq: session.result.faq,
      breakdown: session.result.breakdown,
      tuningMetadata: session.result.tuningMetadata,
      imageAltResult: session.result.imageAltResult,
      groundingKeywords: session.result.groundingKeywords,
      generationId: session.generationId || null,
      generationStatus: session.generationStatus,
      activeSessionId: sessionId,
    })
  },
    }),
    {
      name: 'geo-wizard-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist wizard progress state, not ephemeral UI states
      partialize: (state) => ({
        step: state.step,
        categoryId: state.categoryId,
        productId: state.productId,
        productName: state.productName,
        campaignTag: state.campaignTag,
        launchDate: state.launchDate,
        // Samsung Standard Fields (P1)
        contentType: state.contentType,
        videoFormat: state.videoFormat,
        inputMethod: state.inputMethod,
        fixedHashtags: state.fixedHashtags,
        useFixedHashtags: state.useFixedHashtags,
        vanityLinkCode: state.vanityLinkCode,
        videoUrl: state.videoUrl,
        srtContent: state.srtContent,
        selectedBriefId: state.selectedBriefId,
        briefUsps: state.briefUsps,
        selectedKeywords: state.selectedKeywords,
        // Multi-session state: persist sessions with results
        sessions: state.sessions,
        sessionOrder: state.sessionOrder,
        activeSessionId: state.activeSessionId,
        // Don't persist: isGroundingLoading, isGenerating, isSaving (loading states)
        // Don't persist: groundingKeywords (re-fetch), output content (can regenerate)
      }),
      // Merge persisted state with initial state on rehydration
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GenerationState> | undefined

        // Reset any sessions that were in progress (grounding/generating) back to pending
        // since we can't continue them after page reload
        const sessions = persisted?.sessions || {}
        const resetSessions: Record<string, GenerationSession> = {}
        for (const [id, session] of Object.entries(sessions)) {
          if (session.status === 'grounding' || session.status === 'generating') {
            resetSessions[id] = { ...session, status: 'pending', progress: 0, currentStage: null }
          } else {
            resetSessions[id] = session
          }
        }

        return {
          ...currentState,
          ...(persisted || {}),
          sessions: resetSessions,
          // Ensure loading states are always reset
          isGroundingLoading: false,
          isGenerating: false,
          isSaving: false,
        }
      },
    }
  )
)
