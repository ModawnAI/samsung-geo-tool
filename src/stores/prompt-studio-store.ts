'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  PromptStage,
  StagePrompt,
  StageTestRun,
  StageTestInput,
  StageStatusSummary,
  LLMParameters,
  WorkflowStatus,
  PreviousResultsResponse,
  PreviousStageResult,
} from '@/types/prompt-studio'

interface PromptStudioState {
  // Stage statuses
  stageStatuses: StageStatusSummary[]
  isLoadingStatuses: boolean
  statusError: string | null

  // Current stage prompt
  currentStagePrompt: StagePrompt | null
  isLoadingStagePrompt: boolean
  stagePromptError: string | null
  hasUnsavedChanges: boolean

  // Test inputs
  savedTestInputs: StageTestInput[]
  isLoadingSavedInputs: boolean

  // Test execution
  isRunningTest: boolean
  currentTestResult: StageTestRun | null
  testHistory: StageTestRun[]
  isLoadingHistory: boolean

  // Draft state (unsaved changes)
  draftPrompt: string
  draftParameters: LLMParameters

  // Previous stage results
  previousResultsResponse: PreviousResultsResponse | null
  isLoadingPreviousResults: boolean
  previousResultsError: string | null

  // Actions
  setStageStatuses: (statuses: StageStatusSummary[]) => void
  setLoadingStatuses: (loading: boolean) => void
  setStatusError: (error: string | null) => void

  setCurrentStagePrompt: (prompt: StagePrompt | null) => void
  setLoadingStagePrompt: (loading: boolean) => void
  setStagePromptError: (error: string | null) => void
  setHasUnsavedChanges: (hasChanges: boolean) => void

  setSavedTestInputs: (inputs: StageTestInput[]) => void
  setLoadingSavedInputs: (loading: boolean) => void

  setRunningTest: (running: boolean) => void
  setCurrentTestResult: (result: StageTestRun | null) => void
  setTestHistory: (history: StageTestRun[]) => void
  setLoadingHistory: (loading: boolean) => void

  setDraftPrompt: (prompt: string) => void
  setDraftParameters: (params: Partial<LLMParameters>) => void

  // Previous results actions
  setPreviousResultsResponse: (response: PreviousResultsResponse | null) => void
  setLoadingPreviousResults: (loading: boolean) => void
  setPreviousResultsError: (error: string | null) => void

  resetDraft: () => void
  resetStore: () => void
}

const initialParameters: LLMParameters = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  model: 'gemini-3-flash-preview',
}

export const usePromptStudioStore = create<PromptStudioState>()(
  persist(
    (set, get) => ({
      // Initial state
      stageStatuses: [],
      isLoadingStatuses: false,
      statusError: null,

      currentStagePrompt: null,
      isLoadingStagePrompt: false,
      stagePromptError: null,
      hasUnsavedChanges: false,

      savedTestInputs: [],
      isLoadingSavedInputs: false,

      isRunningTest: false,
      currentTestResult: null,
      testHistory: [],
      isLoadingHistory: false,

      draftPrompt: '',
      draftParameters: { ...initialParameters },

      previousResultsResponse: null,
      isLoadingPreviousResults: false,
      previousResultsError: null,

      // Actions
      setStageStatuses: (statuses) => set({ stageStatuses: statuses }),
      setLoadingStatuses: (loading) => set({ isLoadingStatuses: loading }),
      setStatusError: (error) => set({ statusError: error }),

      setCurrentStagePrompt: (prompt) => {
        set({
          currentStagePrompt: prompt,
          draftPrompt: prompt?.stage_system_prompt || '',
          draftParameters: prompt
            ? {
                temperature: prompt.temperature,
                maxTokens: prompt.max_tokens,
                topP: prompt.top_p,
                model: prompt.model,
              }
            : { ...initialParameters },
          hasUnsavedChanges: false,
        })
      },
      setLoadingStagePrompt: (loading) => set({ isLoadingStagePrompt: loading }),
      setStagePromptError: (error) => set({ stagePromptError: error }),
      setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

      setSavedTestInputs: (inputs) => set({ savedTestInputs: inputs }),
      setLoadingSavedInputs: (loading) => set({ isLoadingSavedInputs: loading }),

      setRunningTest: (running) => set({ isRunningTest: running }),
      setCurrentTestResult: (result) => set({ currentTestResult: result }),
      setTestHistory: (history) => set({ testHistory: history }),
      setLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

      setDraftPrompt: (prompt) => {
        const current = get().currentStagePrompt
        const hasChanges =
          prompt !== (current?.stage_system_prompt || '') ||
          get().hasUnsavedChanges
        set({ draftPrompt: prompt, hasUnsavedChanges: hasChanges })
      },

      setDraftParameters: (params) => {
        const current = get().draftParameters
        const newParams = { ...current, ...params }
        const original = get().currentStagePrompt
        const hasChanges =
          newParams.temperature !== original?.temperature ||
          newParams.maxTokens !== original?.max_tokens ||
          newParams.topP !== original?.top_p ||
          newParams.model !== original?.model ||
          get().draftPrompt !== (original?.stage_system_prompt || '')
        set({ draftParameters: newParams, hasUnsavedChanges: hasChanges })
      },

      // Previous results actions
      setPreviousResultsResponse: (response) => set({ previousResultsResponse: response }),
      setLoadingPreviousResults: (loading) => set({ isLoadingPreviousResults: loading }),
      setPreviousResultsError: (error) => set({ previousResultsError: error }),

      resetDraft: () => {
        const current = get().currentStagePrompt
        set({
          draftPrompt: current?.stage_system_prompt || '',
          draftParameters: current
            ? {
                temperature: current.temperature,
                maxTokens: current.max_tokens,
                topP: current.top_p,
                model: current.model,
              }
            : { ...initialParameters },
          hasUnsavedChanges: false,
        })
      },

      resetStore: () =>
        set({
          stageStatuses: [],
          isLoadingStatuses: false,
          statusError: null,
          currentStagePrompt: null,
          isLoadingStagePrompt: false,
          stagePromptError: null,
          hasUnsavedChanges: false,
          savedTestInputs: [],
          isLoadingSavedInputs: false,
          isRunningTest: false,
          currentTestResult: null,
          testHistory: [],
          isLoadingHistory: false,
          draftPrompt: '',
          draftParameters: { ...initialParameters },
          previousResultsResponse: null,
          isLoadingPreviousResults: false,
          previousResultsError: null,
        }),
    }),
    {
      name: 'prompt-studio-storage',
      partialize: (state) => ({
        // Only persist test history, not loading states
        testHistory: state.testHistory.slice(0, 20), // Keep last 20 tests
      }),
    }
  )
)

// Helper hooks for common operations
export function useStageStatus(stage: PromptStage) {
  return usePromptStudioStore((state) =>
    state.stageStatuses.find((s) => s.stage === stage)
  )
}

export function useIsStageActive(stage: PromptStage) {
  const status = useStageStatus(stage)
  return status?.workflowStatus === 'active'
}

export function useHasUnsavedChanges() {
  return usePromptStudioStore((state) => state.hasUnsavedChanges)
}
