'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Robot,
  ArrowsOut,
  MagnifyingGlass,
  Sparkle,
  ArrowClockwise,
  ChatCircle,
  Play,
  Check,
  Warning,
  Spinner,
  Copy,
} from '@phosphor-icons/react'
import {
  STAGE_CONFIG,
  type PromptStage,
  type StagePrompt,
  type RefinerAction,
  type RefinerMessage,
  type RefineRequest,
  type RefineResponse,
  type StageTestInputData,
} from '@/types/prompt-studio'
import {
  saveRefinerPromptData,
  type RefinerPromptData,
} from '@/components/prompt-studio/refiner-fullscreen'

interface StageRefinerPanelProps {
  stage: PromptStage
  currentPrompt: string
  stagePrompt: StagePrompt | null
  language: 'ko' | 'en'
  onApplyPrompt: (prompt: string) => void
}

export function StageRefinerPanel({
  stage,
  currentPrompt,
  stagePrompt,
  language,
  onApplyPrompt,
}: StageRefinerPanelProps) {
  const router = useRouter()
  const config = STAGE_CONFIG[stage]

  const [sessionId, setSessionId] = useState<string | undefined>()
  const [messages, setMessages] = useState<RefinerMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null)

  // Navigate to fullscreen refiner
  const handleOpenFullscreen = () => {
    const data: RefinerPromptData = {
      stageId: stage,
      systemPrompt: currentPrompt,
      stagePrompt,
      temperature: stagePrompt?.temperature ?? 0.7,
      maxTokens: stagePrompt?.max_tokens ?? 4096,
      model: stagePrompt?.model ?? 'gemini-3-flash-preview',
    }
    saveRefinerPromptData(data)
    router.push(`/admin/prompt-studio/${stage}/refiner`)
  }

  // Execute a refiner action
  const handleAction = useCallback(
    async (action: RefinerAction, userMessage?: string) => {
      if (!currentPrompt.trim()) {
        setError(language === 'ko' ? '프롬프트를 먼저 입력하세요' : 'Please enter a prompt first')
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

        if (!sessionId) {
          setSessionId(data.sessionId)
        }

        // Add messages
        const userMsg: RefinerMessage = {
          id: `local_${Date.now()}`,
          role: 'user',
          content: action === 'chat' ? userMessage || '' : `[${action.toUpperCase()}]`,
          action,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, userMsg, data.message])

        // If there's a code block (improved prompt), show it
        if (data.codeBlocks && data.codeBlocks.length > 0) {
          setSuggestedPrompt(data.codeBlocks[0])
        }
      } catch (err) {
        console.error('Refiner error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, stage, currentPrompt, language]
  )

  const handleChatSend = () => {
    if (chatInput.trim()) {
      handleAction('chat', chatInput)
      setChatInput('')
    }
  }

  const handleApplySuggestion = () => {
    if (suggestedPrompt) {
      onApplyPrompt(suggestedPrompt)
      setSuggestedPrompt(null)
    }
  }

  const handleCopyPrompt = async () => {
    if (suggestedPrompt) {
      await navigator.clipboard.writeText(suggestedPrompt)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Robot className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">
                  {language === 'ko' ? 'AI Refiner' : 'AI Refiner'}
                </CardTitle>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleOpenFullscreen}>
                    <ArrowsOut className="h-4 w-4 mr-1" />
                    {language === 'ko' ? '전체화면' : 'Fullscreen'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {language === 'ko'
                      ? '전체 화면 모드에서 프롬프트 편집 및 AI 대화'
                      : 'Edit prompt and chat with AI in fullscreen mode'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('analyze')}
                    disabled={isLoading || !currentPrompt.trim()}
                    className="justify-start"
                  >
                    <MagnifyingGlass className="h-4 w-4 mr-2" />
                    {language === 'ko' ? '분석' : 'Analyze'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {language === 'ko'
                      ? '현재 프롬프트의 강점, 약점, 개선점을 AI가 분석'
                      : 'AI analyzes current prompt strengths, weaknesses, improvements'}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('improve')}
                    disabled={isLoading || !currentPrompt.trim()}
                    className="justify-start"
                  >
                    <Sparkle className="h-4 w-4 mr-2" />
                    {language === 'ko' ? '개선' : 'Improve'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {language === 'ko'
                      ? 'AI가 개선된 프롬프트 버전을 생성하여 제안'
                      : 'AI generates an improved version of the prompt'}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('test')}
                    disabled={isLoading || !currentPrompt.trim()}
                    className="justify-start"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {language === 'ko' ? '비교 테스트' : 'Compare Test'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {language === 'ko'
                      ? '현재 프롬프트와 개선안을 동일 입력으로 비교 테스트'
                      : 'Compare test current vs improved prompt with same input'}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMessages([])
                      setSessionId(undefined)
                      setSuggestedPrompt(null)
                      setError(null)
                    }}
                    disabled={messages.length === 0}
                    className="justify-start"
                  >
                    <ArrowClockwise className="h-4 w-4 mr-2" />
                    {language === 'ko' ? '초기화' : 'Reset'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{language === 'ko' ? '대화 기록 초기화하고 새 세션 시작' : 'Clear chat history and start new session'}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                <Warning className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Chat Messages (compact view) */}
            {messages.length > 0 && (
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                {messages.slice(-4).map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={cn(
                      'text-xs p-2 rounded',
                      msg.role === 'user'
                        ? 'bg-primary/10 text-primary ml-4'
                        : 'bg-muted text-muted-foreground mr-4'
                    )}
                  >
                    {msg.role === 'user' && msg.action && msg.action !== 'chat' ? (
                      <Badge variant="outline" className="text-[10px]">
                        {msg.action.toUpperCase()}
                      </Badge>
                    ) : (
                      <p className="whitespace-pre-wrap line-clamp-4">{msg.content}</p>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                    <Spinner className="h-3 w-3 animate-spin" />
                    {language === 'ko' ? '응답 생성 중...' : 'Generating response...'}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Prompt */}
            {suggestedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    {language === 'ko' ? '제안된 프롬프트' : 'Suggested Prompt'}
                  </Label>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPrompt}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{language === 'ko' ? '개선된 프롬프트를 클립보드에 복사' : 'Copy improved prompt to clipboard'}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          className="h-6 text-xs"
                          onClick={handleApplySuggestion}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {language === 'ko' ? '적용' : 'Apply'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {language === 'ko'
                            ? '개선된 프롬프트를 에디터에 적용 (저장은 별도)'
                            : 'Apply improved prompt to editor (save separately)'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <pre className="text-xs font-mono bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                  {suggestedPrompt}
                </pre>
              </div>
            )}

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  language === 'ko'
                    ? '특정 수정 요청 또는 질문...'
                    : 'Ask for specific changes...'
                }
                rows={2}
                className="text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSend()
                  }
                }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={handleChatSend}
                    disabled={isLoading || !chatInput.trim()}
                    className="shrink-0"
                  >
                    <ChatCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{language === 'ko' ? '메시지 전송' : 'Send message'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

// Need to import Label
import { Label } from '@/components/ui/label'
