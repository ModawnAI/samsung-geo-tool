import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type GenerationStep = 'product' | 'content' | 'keywords' | 'output'

export interface GroundingKeyword {
  term: string
  score: number
  sources: string[]
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

interface GenerationState {
  // Current step
  step: GenerationStep

  // Step 1: Product selection
  categoryId: string | null
  productId: string | null
  productName: string | null
  campaignTag: string
  launchDate: Date | null // Product launch date for content filtering

  // Step 2: Content input
  videoUrl: string
  srtContent: string

  // Step 3: Keywords
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
  isGenerating: boolean
  generationStage: string | null // Current generation stage (usps, faq, case-studies, etc.)

  // Saved generation tracking
  generationId: string | null
  generationStatus: 'unsaved' | 'draft' | 'confirmed'
  isSaving: boolean

  // Actions
  setStep: (step: GenerationStep) => void
  setCategory: (categoryId: string) => void
  setProduct: (productId: string, productName: string) => void
  setCampaignTag: (tag: string) => void
  setLaunchDate: (date: Date | null) => void
  setVideoUrl: (url: string) => void
  setSrtContent: (content: string) => void
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
  }) => void
  reset: () => void
}

const initialState = {
  step: 'product' as GenerationStep,
  categoryId: null,
  productId: null,
  productName: null,
  campaignTag: '',
  launchDate: null as Date | null,
  videoUrl: '',
  srtContent: '',
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
  isGenerating: false,
  generationStage: null as string | null,
  generationId: null,
  generationStatus: 'unsaved' as const,
  isSaving: false,
}

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),

  setCategory: (categoryId) => set({ categoryId, productId: null, productName: null }),

  setProduct: (productId, productName) => set({ productId, productName }),

  setCampaignTag: (campaignTag) => set({ campaignTag }),

  setLaunchDate: (launchDate) => set({ launchDate }),

  setVideoUrl: (videoUrl) => set({ videoUrl }),

  setSrtContent: (srtContent) => set({ srtContent }),

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
    }),

  reset: () => set(initialState),
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
        videoUrl: state.videoUrl,
        srtContent: state.srtContent,
        briefUsps: state.briefUsps,
        selectedKeywords: state.selectedKeywords,
        // Don't persist: isGroundingLoading, isGenerating, isSaving (loading states)
        // Don't persist: groundingKeywords (re-fetch), output content (can regenerate)
      }),
      // Merge persisted state with initial state on rehydration
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GenerationState> | undefined
        return {
          ...currentState,
          ...(persisted || {}),
          // Ensure loading states are always reset
          isGroundingLoading: false,
          isGenerating: false,
          isSaving: false,
        }
      },
    }
  )
)
