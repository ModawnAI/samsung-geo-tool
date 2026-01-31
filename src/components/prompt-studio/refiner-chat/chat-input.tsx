'use client'

import { useState, useRef, useEffect } from 'react'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  placeholder?: string
}

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = () => {
    if (!message.trim() || isLoading) return
    onSend(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Type a message or ask for specific changes...'}
        disabled={isLoading}
        className="min-h-[40px] max-h-[120px] resize-none text-sm"
        rows={1}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            className="flex-shrink-0"
          >
            <PaperPlaneTilt className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>메시지 전송 (Enter)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
