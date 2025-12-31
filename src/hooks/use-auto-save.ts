'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { toast } from 'sonner'

interface UseAutoSaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  interval?: number // milliseconds
  debounceDelay?: number // milliseconds
  enabled?: boolean
  storageKey?: string // for local backup
}

interface AutoSaveState {
  lastSaved: Date | null
  isSaving: boolean
  hasUnsavedChanges: boolean
  error: Error | null
}

export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000, // 30 seconds default
  debounceDelay = 2000, // 2 seconds debounce
  enabled = true,
  storageKey,
}: UseAutoSaveOptions<T>) {
  const [state, setState] = useState<AutoSaveState>({
    lastSaved: null,
    isSaving: false,
    hasUnsavedChanges: false,
    error: null,
  })

  const dataRef = useRef(data)
  const lastSavedDataRef = useRef<T | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data

    // Check if data has changed from last saved
    if (lastSavedDataRef.current !== null) {
      const hasChanges = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current)
      setState(prev => ({ ...prev, hasUnsavedChanges: hasChanges }))
    }

    // Save to local storage as backup
    if (storageKey && enabled) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data))
      } catch {
        // Ignore storage errors
      }
    }
  }, [data, storageKey, enabled])

  // Save function
  const save = useCallback(async (showToast = false) => {
    if (!enabled || state.isSaving) return

    const currentData = dataRef.current

    // Skip if no changes
    if (lastSavedDataRef.current !== null) {
      const hasChanges = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current)
      if (!hasChanges) return
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      await onSave(currentData)
      lastSavedDataRef.current = currentData
      setState(prev => ({
        ...prev,
        lastSaved: new Date(),
        isSaving: false,
        hasUnsavedChanges: false,
      }))

      if (showToast) {
        toast.success('Changes saved')
      }

      // Clear local backup on successful save
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey)
        } catch {
          // Ignore
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Save failed')
      setState(prev => ({ ...prev, isSaving: false, error: err }))

      if (showToast) {
        toast.error('Failed to save changes')
      }
    }
  }, [enabled, state.isSaving, onSave, storageKey])

  // Debounced save (triggered on data change)
  const debouncedSave = useCallback(() => {
    if (!enabled) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      save(false)
    }, debounceDelay)
  }, [enabled, debounceDelay, save])

  // Set up interval-based auto-save
  useEffect(() => {
    if (!enabled) return

    intervalTimerRef.current = setInterval(() => {
      save(false)
    }, interval)

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current)
      }
    }
  }, [enabled, interval, save])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Save before unload
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, state.hasUnsavedChanges])

  // Recover from local storage
  const recoverFromStorage = useCallback((): T | null => {
    if (!storageKey) return null

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        return JSON.parse(stored) as T
      }
    } catch {
      // Ignore
    }
    return null
  }, [storageKey])

  // Clear local backup
  const clearBackup = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Ignore
      }
    }
  }, [storageKey])

  return {
    ...state,
    save: () => save(true),
    debouncedSave,
    recoverFromStorage,
    clearBackup,
  }
}

// Helper to read localStorage safely (SSR-compatible)
function readLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : null
  } catch {
    return null
  }
}

// Hook for checking if there's a recoverable draft
export function useRecoverableDraft<T>(storageKey: string): {
  hasDraft: boolean
  draft: T | null
  clearDraft: () => void
} {
  // Use useSyncExternalStore for SSR-safe localStorage reads
  const [draft, setDraft] = useState<T | null>(() => readLocalStorage<T>(storageKey))
  const [isMounted, setIsMounted] = useState(false)

  // Re-read on client mount to handle SSR hydration
  useEffect(() => {
    if (!isMounted) {
      const stored = readLocalStorage<T>(storageKey)
      // Use queueMicrotask to avoid synchronous setState in effect warning
      queueMicrotask(() => {
        setIsMounted(true)
        if (stored !== null) {
          setDraft(stored)
        }
      })
    }
  }, [isMounted, storageKey])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setDraft(null)
    } catch {
      // Ignore
    }
  }, [storageKey])

  return {
    hasDraft: draft !== null,
    draft,
    clearDraft,
  }
}
