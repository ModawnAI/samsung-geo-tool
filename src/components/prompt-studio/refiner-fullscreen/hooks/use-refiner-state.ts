'use client'

import { useState, useCallback, useEffect } from 'react'

export type DiffMode = 'inline' | 'side-by-side'
export type PendingStatus = 'none' | 'preview' | 'applied'

export interface RefinerState {
  // Prompt states
  originalPrompt: string        // Original prompt (immutable reference)
  workingPrompt: string         // Currently editing
  pendingPrompt: string | null  // AI suggestion waiting to be applied

  // UI states
  isEditMode: boolean           // Edit mode toggle
  diffMode: DiffMode            // Inline or side-by-side diff
  showDiff: boolean             // Whether to show diff viewer

  // Workflow states
  hasUnsavedChanges: boolean
  pendingStatus: PendingStatus
}

export interface UseRefinerStateReturn extends RefinerState {
  // Prompt actions
  setWorkingPrompt: (prompt: string) => void
  setPendingPrompt: (prompt: string | null) => void
  applyPendingPrompt: () => void
  revertPendingPrompt: () => void
  resetToOriginal: () => void

  // UI actions
  setIsEditMode: (isEdit: boolean) => void
  setDiffMode: (mode: DiffMode) => void
  setShowDiff: (show: boolean) => void
  toggleDiffMode: () => void

  // Utility
  markAsSaved: () => void
}

const STORAGE_KEY = 'prompt-refiner-state'

interface StoredState {
  stageId: string
  workingPrompt: string
  pendingPrompt: string | null
  pendingStatus: PendingStatus
  timestamp: number
}

/**
 * Hook for managing refiner state with persistence
 */
export function useRefinerState(
  stageId: string,
  initialPrompt: string
): UseRefinerStateReturn {
  // Core prompt states
  const [originalPrompt, setOriginalPrompt] = useState(initialPrompt)
  const [workingPrompt, setWorkingPromptInternal] = useState(initialPrompt)
  const [pendingPrompt, setPendingPromptInternal] = useState<string | null>(null)

  // UI states
  const [isEditMode, setIsEditMode] = useState(false)
  const [diffMode, setDiffMode] = useState<DiffMode>('inline')
  const [showDiff, setShowDiff] = useState(false)

  // Workflow states
  const [pendingStatus, setPendingStatus] = useState<PendingStatus>('none')
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt)

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: StoredState = JSON.parse(stored)
        // Only restore if same stage and recent (within 30 minutes)
        if (
          parsed.stageId === stageId &&
          Date.now() - parsed.timestamp < 30 * 60 * 1000
        ) {
          setWorkingPromptInternal(parsed.workingPrompt)
          setPendingPromptInternal(parsed.pendingPrompt)
          setPendingStatus(parsed.pendingStatus)
          if (parsed.pendingPrompt) {
            setShowDiff(true)
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore refiner state:', e)
    }
  }, [stageId])

  // Persist state to sessionStorage on change
  useEffect(() => {
    try {
      const state: StoredState = {
        stageId,
        workingPrompt,
        pendingPrompt,
        pendingStatus,
        timestamp: Date.now(),
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to persist refiner state:', e)
    }
  }, [stageId, workingPrompt, pendingPrompt, pendingStatus])

  // Compute derived state
  const hasUnsavedChanges = workingPrompt !== savedPrompt

  // Prompt actions
  const setWorkingPrompt = useCallback((prompt: string) => {
    setWorkingPromptInternal(prompt)
  }, [])

  const setPendingPrompt = useCallback((prompt: string | null) => {
    setPendingPromptInternal(prompt)
    if (prompt) {
      setPendingStatus('preview')
      setShowDiff(true)
    } else {
      setPendingStatus('none')
      setShowDiff(false)
    }
  }, [])

  const applyPendingPrompt = useCallback(() => {
    if (pendingPrompt) {
      setWorkingPromptInternal(pendingPrompt)
      setPendingStatus('applied')
      setPendingPromptInternal(null)
      setShowDiff(false)
    }
  }, [pendingPrompt])

  const revertPendingPrompt = useCallback(() => {
    setPendingPromptInternal(null)
    setPendingStatus('none')
    setShowDiff(false)
  }, [])

  const resetToOriginal = useCallback(() => {
    setWorkingPromptInternal(originalPrompt)
    setPendingPromptInternal(null)
    setPendingStatus('none')
    setShowDiff(false)
  }, [originalPrompt])

  // UI actions
  const toggleDiffMode = useCallback(() => {
    setDiffMode((prev) => (prev === 'inline' ? 'side-by-side' : 'inline'))
  }, [])

  // Utility
  const markAsSaved = useCallback(() => {
    setSavedPrompt(workingPrompt)
    setOriginalPrompt(workingPrompt)
    // Clear session storage after save
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear refiner state:', e)
    }
  }, [workingPrompt])

  return {
    // State
    originalPrompt,
    workingPrompt,
    pendingPrompt,
    isEditMode,
    diffMode,
    showDiff,
    hasUnsavedChanges,
    pendingStatus,

    // Prompt actions
    setWorkingPrompt,
    setPendingPrompt,
    applyPendingPrompt,
    revertPendingPrompt,
    resetToOriginal,

    // UI actions
    setIsEditMode,
    setDiffMode,
    setShowDiff,
    toggleDiffMode,

    // Utility
    markAsSaved,
  }
}

/**
 * Utility to clear refiner state from session storage
 */
export function clearRefinerState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear refiner state:', e)
  }
}
