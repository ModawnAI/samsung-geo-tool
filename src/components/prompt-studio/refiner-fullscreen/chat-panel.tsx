'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Robot } from '@phosphor-icons/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ActionButtons } from '@/components/prompt-studio/refiner-chat/action-buttons'
import { ChatMessages } from '@/components/prompt-studio/refiner-chat/chat-messages'
import { ChatInput } from '@/components/prompt-studio/refiner-chat/chat-input'
import { SessionManager } from '@/components/prompt-studio/refiner-chat/session-manager'
import type {
  PromptStage,
  RefinerAction,
  RefinerMessage,
  RefineRequest,
  RefineResponse,
  StageTestInputData,
} from '@/types/prompt-studio'

interface ChatPanelProps {
  stage: PromptStage
  currentPrompt: string
  testInput?: StageTestInputData
  onApplyPrompt: (prompt: string) => void
  className?: string
}

export function ChatPanel({
  stage,
  currentPrompt,
  testInput,
  onApplyPrompt,
  className,
}: ChatPanelProps) {
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
      <Card className={cn('flex flex-col h-full overflow-hidden min-h-0', className)}>
        {/* Header */}
        <CardHeader className="py-3 px-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Robot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Refiner</CardTitle>
            </div>
            <SessionManager
              stage={stage}
              currentSessionId={sessionId}
              onLoadSession={handleLoadSession}
              onNewSession={handleNewSession}
            />
          </div>
        </CardHeader>

        {/* Messages area */}
        <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
          <div className="h-full p-4 overflow-y-auto min-h-0">
            <ChatMessages
              messages={messages}
              onApplyPrompt={onApplyPrompt}
              isLoading={isLoading}
            />
          </div>
        </CardContent>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Action buttons and input */}
        <div className="px-4 py-3 border-t space-y-3 shrink-0 bg-muted/30">
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
      </Card>
    </TooltipProvider>
  )
}

export type { ChatPanelProps }
