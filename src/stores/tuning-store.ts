import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Tables, Json } from '@/types/database'

// Database-aligned types
export type PromptVersion = Tables<'prompt_versions'>
export type ScoringWeight = Tables<'scoring_weights'>
export type BatchJob = Tables<'batch_jobs'>

// State
interface TuningState {
  // Prompts
  prompts: PromptVersion[]
  isLoading: boolean
  error: string | null

  // Weights
  weights: ScoringWeight[]

  // Batch Jobs
  batchJobs: BatchJob[]

  // UI State
  selectedEngine: 'gemini' | 'perplexity' | 'cohere'
  comparisonMode: boolean
  diffViewerOpen: boolean
}

// Actions
interface TuningActions {
  // Prompts API
  fetchPrompts: () => Promise<void>
  createPrompt: (data: {
    name: string
    version: string
    engine: 'gemini' | 'perplexity' | 'cohere'
    system_prompt: string
    description?: string
  }) => Promise<void>
  updatePrompt: (
    id: string,
    updates: Partial<{
      name: string
      version: string
      engine: 'gemini' | 'perplexity' | 'cohere'
      system_prompt: string
      description: string
      is_active: boolean
    }>
  ) => Promise<void>
  deletePrompt: (id: string) => Promise<void>

  // Weights API
  fetchWeights: () => Promise<void>
  createWeight: (data: {
    name: string
    version: string
    weights: Json
  }) => Promise<void>
  updateWeight: (
    id: string,
    updates: Partial<{
      name: string
      version: string
      weights: Json
      is_active: boolean
    }>
  ) => Promise<void>
  deleteWeight: (id: string) => Promise<void>

  // Batch Jobs API
  fetchBatchJobs: () => Promise<void>
  createBatchJob: (data: {
    name: string
    type: string
    total_items: number
    config?: Json
  }) => Promise<void>
  updateBatchJob: (
    id: string,
    updates: Partial<{
      status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
      processed_items: number
      failed_items: number
      results: Json
      error_log: string[]
      actual_cost: number
      started_at: string
      completed_at: string
    }>
  ) => Promise<void>
  deleteBatchJob: (id: string) => Promise<void>

  // UI State
  setSelectedEngine: (engine: 'gemini' | 'perplexity' | 'cohere') => void
  setComparisonMode: (enabled: boolean) => void
  setDiffViewerOpen: (open: boolean) => void

  // Reset
  reset: () => void
}

const initialState: TuningState = {
  prompts: [],
  isLoading: false,
  error: null,

  weights: [],

  batchJobs: [],

  selectedEngine: 'gemini',
  comparisonMode: false,
  diffViewerOpen: false,
}

export const useTuningStore = create<TuningState & TuningActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Prompts API
        fetchPrompts: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/prompts')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            set({ prompts: data.prompts, isLoading: false })
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to fetch prompts',
              isLoading: false,
            })
          }
        },

        createPrompt: async (data) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/prompts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              prompts: [...state.prompts, result.prompt],
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to create prompt',
              isLoading: false,
            })
            throw err
          }
        },

        updatePrompt: async (id, updates) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/prompts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, ...updates }),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              prompts: state.prompts.map((p) =>
                p.id === id ? result.prompt : p
              ),
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to update prompt',
              isLoading: false,
            })
            throw err
          }
        },

        deletePrompt: async (id) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/tuning/prompts?id=${id}`, {
              method: 'DELETE',
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              prompts: state.prompts.filter((p) => p.id !== id),
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to delete prompt',
              isLoading: false,
            })
            throw err
          }
        },

        // Weights API
        fetchWeights: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/weights')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            set({ weights: data.weights, isLoading: false })
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to fetch weights',
              isLoading: false,
            })
          }
        },

        createWeight: async (data) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/weights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              weights: [...state.weights, result.weight],
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to create weight config',
              isLoading: false,
            })
            throw err
          }
        },

        updateWeight: async (id, updates) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/weights', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, ...updates }),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              weights: state.weights.map((w) =>
                w.id === id ? result.weight : w
              ),
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to update weight config',
              isLoading: false,
            })
            throw err
          }
        },

        deleteWeight: async (id) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/tuning/weights?id=${id}`, {
              method: 'DELETE',
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              weights: state.weights.filter((w) => w.id !== id),
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to delete weight config',
              isLoading: false,
            })
            throw err
          }
        },

        // Batch Jobs API
        fetchBatchJobs: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/batch')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            set({ batchJobs: data.jobs, isLoading: false })
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to fetch batch jobs',
              isLoading: false,
            })
          }
        },

        createBatchJob: async (data) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              batchJobs: [...state.batchJobs, result.job],
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to create batch job',
              isLoading: false,
            })
            throw err
          }
        },

        updateBatchJob: async (id, updates) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/tuning/batch', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, ...updates }),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              batchJobs: state.batchJobs.map((j) =>
                j.id === id ? result.job : j
              ),
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to update batch job',
              isLoading: false,
            })
            throw err
          }
        },

        deleteBatchJob: async (id) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/tuning/batch?id=${id}`, {
              method: 'DELETE',
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            set((state) => ({
              batchJobs: state.batchJobs.filter((j) => j.id !== id),
              isLoading: false,
            }))
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to delete batch job',
              isLoading: false,
            })
            throw err
          }
        },

        // UI State
        setSelectedEngine: (engine) => set({ selectedEngine: engine }),
        setComparisonMode: (enabled) => set({ comparisonMode: enabled }),
        setDiffViewerOpen: (open) => set({ diffViewerOpen: open }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'tuning-store',
        partialize: (state) => ({
          selectedEngine: state.selectedEngine,
        }),
      }
    ),
    { name: 'TuningStore' }
  )
)

// Selectors
export const selectActivePrompt = (state: TuningState) =>
  state.prompts.find((p) => p.is_active)

export const selectActiveWeight = (state: TuningState) =>
  state.weights.find((w) => w.is_active)

export const selectRunningBatchJobs = (state: TuningState) =>
  state.batchJobs.filter((j) => j.status === 'running')

export const selectPromptsByEngine = (
  state: TuningState,
  engine: PromptVersion['engine']
) => state.prompts.filter((p) => p.engine === engine)
