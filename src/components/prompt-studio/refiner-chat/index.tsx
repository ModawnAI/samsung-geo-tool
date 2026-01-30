'use client'

import { useState, useCallback } from 'react'
import { Robot, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ActionButtons } from './action-buttons'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { SessionManager } from './session-manager'
import type {
  PromptStage,
  RefinerAction,
  RefinerMessage,
  RefineRequest,
  RefineResponse,
  StageTestInputData,
} from '@/types/prompt-studio'

interface RefinerChatProps {
  stage: PromptStage
  currentPrompt: string
  testInput?: StageTestInputData
  onApplyPrompt: (prompt: string) => void
  onClose?: () => void
}

export function RefinerChat({
  stage,
  currentPrompt,
  testInput,
  onApplyPrompt,
  onClose,
}: RefinerChatProps) {
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [messages, setMessages] = useState<RefinerMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Execute a refiner action
   */
  const handleAction = useCallback(
    async (action: RefinerAction, userMessage?: string) => {
      if (!currentPrompt.trim()) {
        setError('Please enter a prompt first')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const request: RefineRequest = {
          sessionId,
          stage,
          action,
          userMessage,
          currentPrompt,
          testInput,
        }

        const response = await fetch('/api/prompt-studio/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to process request')
        }

        const data: RefineResponse = await response.json()

        // Update session ID if this is a new session
        if (!sessionId) {
          setSessionId(data.sessionId)
        }

        // Add the user message and assistant response to local state
        // The user message was already added on the server, but we add a local one for immediate feedback
        const userMsg: RefinerMessage = {
          id: `local_${Date.now()}`,
          role: 'user',
          content: action === 'chat' ? (userMessage || '') : `[${action.toUpperCase()}]`,
          action,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, userMsg, data.message])
      } catch (err) {
        console.error('Refiner chat error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, stage, currentPrompt, testInput]
  )

  /**
   * Handle chat message send
   */
  const handleChatSend = useCallback(
    (message: string) => {
      handleAction('chat', message)
    },
    [handleAction]
  )

  /**
   * Load a session from history
   */
  const handleLoadSession = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/prompt-studio/refine/sessions/${id}`)
      if (!response.ok) {
        throw new Error('Failed to load session')
      }

      const data = await response.json()
      setSessionId(id)
      setMessages(data.session.messages || [])
    } catch (err) {
      console.error('Error loading session:', err)
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Start a new session
   */
  const handleNewSession = useCallback(() => {
    setSessionId(undefined)
    setMessages([])
    setError(null)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Robot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Prompt Refiner</span>
          </div>
          <div className="flex items-center gap-2">
            <SessionManager
              stage={stage}
              currentSessionId={sessionId}
              onLoadSession={handleLoadSession}
              onNewSession={handleNewSession}
            />
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden p-4">
          <ChatMessages
            messages={messages}
            onApplyPrompt={onApplyPrompt}
            isLoading={isLoading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 py-3 border-t space-y-3">
          <ActionButtons
            onAction={handleAction}
            isLoading={isLoading}
            disabled={!currentPrompt.trim()}
          />
          <ChatInput
            onSend={handleChatSend}
            isLoading={isLoading}
            placeholder="Ask for specific changes or clarification..."
          />
        </div>
      </div>
    </TooltipProvider>
  )
}

export { ActionButtons } from './action-buttons'
export { ChatMessages } from './chat-messages'
export { ChatInput } from './chat-input'
export { CodeBlock } from './code-block'
export { SessionManager } from './session-manager'
