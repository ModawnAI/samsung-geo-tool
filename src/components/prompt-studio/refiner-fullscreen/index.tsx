'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  FloppyDisk,
  Spinner,
  Warning,
  Check,
  X,
} from '@phosphor-icons/react'
import { STAGE_CONFIG, type PromptStage, type StagePrompt } from '@/types/prompt-studio'
import { PromptPanel } from './prompt-panel'
import { ChatPanel } from './chat-panel'
import { PendingChangesBar } from './pending-changes-bar'
import { useRefinerState, clearRefinerState } from './hooks/use-refiner-state'

interface RefinerFullscreenProps {
  stageId: PromptStage
  initialPrompt: string
  stagePrompt: StagePrompt | null
}

// Session storage key for passing prompt data
const REFINER_PROMPT_KEY = 'refiner-prompt-data'

export interface RefinerPromptData {
  stageId: PromptStage
  systemPrompt: string
  stagePrompt: StagePrompt | null
  temperature: number
  maxTokens: number
  model: string
}

/**
 * Save prompt data to session storage for navigation
 */
export function saveRefinerPromptData(data: RefinerPromptData) {
  try {
    sessionStorage.setItem(REFINER_PROMPT_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save refiner prompt data:', e)
  }
}

/**
 * Load and clear prompt data from session storage
 */
export function loadRefinerPromptData(): RefinerPromptData | null {
  try {
    const data = sessionStorage.getItem(REFINER_PROMPT_KEY)
    if (data) {
      sessionStorage.removeItem(REFINER_PROMPT_KEY)
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load refiner prompt data:', e)
  }
  return null
}

export function RefinerFullscreen({
  stageId,
  initialPrompt,
  stagePrompt,
}: RefinerFullscreenProps) {
  const router = useRouter()
  const config = STAGE_CONFIG[stageId]

  // Refiner state management
  const refinerState = useRefinerState(stageId, initialPrompt)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (refinerState.hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [refinerState.hasUnsavedChanges])

  // Handle applying AI suggestion
  const handleApplyPrompt = useCallback(
    (improvedPrompt: string) => {
      refinerState.setPendingPrompt(improvedPrompt)
    },
    [refinerState]
  )

  // Save prompt to API
  const savePrompt = useCallback(async (): Promise<boolean> => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const payload = {
        stage: stageId,
        stageSystemPrompt: refinerState.workingPrompt || null,
        // Preserve existing parameters
        temperature: stagePrompt?.temperature ?? 0.7,
        maxTokens: stagePrompt?.max_tokens ?? 4096,
        model: stagePrompt?.model ?? 'gemini-3-flash-preview',
      }

      const response = await fetch(`/api/prompt-studio/stages/${stageId}`, {
        method: stagePrompt ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      refinerState.markAsSaved()
      setSuccessMessage('Saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      return true
    } catch (err) {
      console.error('Error saving:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [stageId, stagePrompt, refinerState])

  // Handle save button
  const handleSave = useCallback(async () => {
    await savePrompt()
  }, [savePrompt])

  // Handle save and close
  const handleSaveAndClose = useCallback(async () => {
    const success = await savePrompt()
    if (success) {
      clearRefinerState()
      router.push(`/admin/prompt-studio/${stageId}`)
    }
  }, [savePrompt, router, stageId])

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (refinerState.hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    clearRefinerState()
    router.push(`/admin/prompt-studio/${stageId}`)
  }, [refinerState.hasUnsavedChanges, router, stageId])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Editor
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold">
                  Prompt Refiner - {config.label}
                </h1>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {refinerState.hasUnsavedChanges && (
                <span className="text-xs text-yellow-600 mr-2">Unsaved changes</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !refinerState.hasUnsavedChanges}
              >
                {isSaving ? (
                  <Spinner className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FloppyDisk className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndClose}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Spinner className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FloppyDisk className="h-4 w-4 mr-1" />
                )}
                Save & Close
              </Button>
            </div>
          </div>
        </header>

        {/* Messages */}
        {error && (
          <div className="shrink-0 px-4 py-2">
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
              <CardContent className="flex items-center gap-3 py-2 px-4">
                <Warning className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setError(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {successMessage && (
          <div className="shrink-0 px-4 py-2">
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
              <CardContent className="flex items-center gap-3 py-2 px-4">
                <Check className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main content - Split view */}
        <main className="flex-1 overflow-hidden p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Left: Prompt Panel */}
            <PromptPanel
              stageId={stageId}
              prompt={refinerState.workingPrompt}
              originalPrompt={refinerState.originalPrompt}
              pendingPrompt={refinerState.pendingPrompt}
              isEditMode={refinerState.isEditMode}
              showDiff={refinerState.showDiff}
              diffMode={refinerState.diffMode}
              hasChanges={refinerState.hasUnsavedChanges}
              onPromptChange={refinerState.setWorkingPrompt}
              onEditModeChange={refinerState.setIsEditMode}
              onDiffModeChange={refinerState.setDiffMode}
            />

            {/* Right: Chat Panel */}
            <ChatPanel
              stage={stageId}
              currentPrompt={refinerState.workingPrompt}
              onApplyPrompt={handleApplyPrompt}
            />
          </div>
        </main>

        {/* Bottom: Pending changes bar */}
        <PendingChangesBar
          pendingStatus={refinerState.pendingStatus}
          hasUnsavedChanges={refinerState.hasUnsavedChanges}
          isSaving={isSaving}
          onApply={refinerState.applyPendingPrompt}
          onRevert={refinerState.revertPendingPrompt}
          onSave={handleSave}
          onSaveAndClose={handleSaveAndClose}
        />
      </div>
    </TooltipProvider>
  )
}

export { PromptPanel } from './prompt-panel'
export { ChatPanel } from './chat-panel'
export { DiffViewer } from './diff-viewer'
export { PendingChangesBar } from './pending-changes-bar'
export { useRefinerState, clearRefinerState } from './hooks/use-refiner-state'
