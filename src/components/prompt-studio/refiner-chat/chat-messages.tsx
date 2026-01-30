'use client'

import { useRef, useEffect } from 'react'
import { User, Robot, Spinner } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { CodeBlock } from './code-block'
import type { RefinerMessage } from '@/types/prompt-studio'

interface ChatMessagesProps {
  messages: RefinerMessage[]
  onApplyPrompt?: (prompt: string) => void
  isLoading?: boolean
}

export function ChatMessages({ messages, onApplyPrompt, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <Robot className="h-12 w-12 mx-auto opacity-50" />
          <p>Start by clicking an action button below</p>
          <p className="text-xs">Analyze, Improve, Test, or Chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 px-1">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onApplyPrompt={onApplyPrompt}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Robot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

interface MessageBubbleProps {
  message: RefinerMessage
  onApplyPrompt?: (prompt: string) => void
}

function MessageBubble({ message, onApplyPrompt }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-5 w-5" />
        ) : (
          <Robot className="h-5 w-5" />
        )}
      </div>

      {/* Message content */}
      <div className={cn('flex-1 max-w-[85%] space-y-2', isUser && 'flex flex-col items-end')}>
        {/* Action badge for user messages */}
        {isUser && message.action && message.action !== 'chat' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase">
            {message.action}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg p-3 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {/* For user messages with action, show a simplified version */}
          {isUser && message.action && message.action !== 'chat' ? (
            <p className="text-sm">
              {message.action === 'analyze' && 'Analyzing current prompt...'}
              {message.action === 'improve' && 'Improving prompt...'}
              {message.action === 'test' && 'Testing prompt versions...'}
            </p>
          ) : (
            <MessageContent content={message.content} />
          )}
        </div>

        {/* Code blocks for assistant messages */}
        {!isUser && message.codeBlocks && message.codeBlocks.length > 0 && (
          <div className="w-full space-y-2 mt-2">
            {message.codeBlocks.map((code, index) => (
              <CodeBlock
                key={index}
                code={code}
                onApply={onApplyPrompt}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

/**
 * Render message content with basic markdown support
 */
function MessageContent({ content }: { content: string }) {
  // Split content by code blocks and render appropriately
  const parts = content.split(/```[\s\S]*?```/g)
  const hasCodeBlocks = content.includes('```')

  // If no special formatting needed, just render the text
  if (!hasCodeBlocks) {
    return <div className="whitespace-pre-wrap">{formatInlineMarkdown(content)}</div>
  }

  // Render parts, skipping the code blocks (they're rendered separately)
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => (
        <span key={index}>{formatInlineMarkdown(part)}</span>
      ))}
    </div>
  )
}

/**
 * Format inline markdown (bold, italic, code)
 */
function formatInlineMarkdown(text: string): string {
  // For now, just return the text as-is
  // Could add proper markdown rendering with react-markdown later
  return text
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than a minute
  if (diff < 60000) {
    return 'Just now'
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }

  // Same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Different day
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
