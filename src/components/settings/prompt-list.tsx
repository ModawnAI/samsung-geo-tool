'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  SpinnerGap,
  Sparkle,
  MagnifyingGlass,
  BookOpen,
  CheckCircle,
  PencilSimple,
  ArrowClockwise,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PromptVersion {
  id: string
  name: string
  version: string
  engine: 'gemini' | 'perplexity' | 'cohere'
  system_prompt: string
  description: string | null
  is_active: boolean
  performance_score: number | null
  created_at: string
}

interface PromptListProps {
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
  onSelectPrompt: (engine: 'gemini' | 'perplexity' | 'cohere') => void
  selectedEngine: 'gemini' | 'perplexity' | 'cohere' | null
}

export function PromptList({
  language,
  getAuthToken,
  onSelectPrompt,
  selectedEngine,
}: PromptListProps) {
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/tuning/prompts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch prompts')

      const data = await response.json()
      setPrompts(data.prompts || [])
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const engineConfig = {
    gemini: {
      icon: <Sparkle className="h-5 w-5" />,
      label: 'Gemini',
      description: language === 'ko' ? '콘텐츠 생성 엔진' : 'Content Generation Engine',
      color: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    perplexity: {
      icon: <MagnifyingGlass className="h-5 w-5" />,
      label: 'Perplexity',
      description: language === 'ko' ? '웹 검색 & 그라운딩' : 'Web Search & Grounding',
      color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    cohere: {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Cohere',
      description: language === 'ko' ? 'RAG 검색 & 리랭킹' : 'RAG Search & Reranking',
      color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  }

  const getActivePromptForEngine = (engine: 'gemini' | 'perplexity' | 'cohere') => {
    return prompts.find((p) => p.engine === engine && p.is_active)
  }

  const getPromptCountForEngine = (engine: 'gemini' | 'perplexity' | 'cohere') => {
    return prompts.filter((p) => p.engine === engine).length
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">
            {language === 'ko' ? '시스템 프롬프트' : 'System Prompts'}
          </CardTitle>
          <CardDescription className="text-xs">
            {language === 'ko'
              ? 'AI 엔진별 시스템 프롬프트를 관리합니다'
              : 'Manage system prompts for each AI engine'}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchPrompts}
          disabled={isLoading}
        >
          {isLoading ? (
            <SpinnerGap className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowClockwise className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {(['gemini', 'perplexity', 'cohere'] as const).map((engine) => {
          const config = engineConfig[engine]
          const activePrompt = getActivePromptForEngine(engine)
          const promptCount = getPromptCountForEngine(engine)
          const isSelected = selectedEngine === engine

          return (
            <button
              key={engine}
              onClick={() => onSelectPrompt(engine)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                config.color,
                isSelected && 'ring-2 ring-primary/30',
                'hover:border-primary/50'
              )}
            >
              <div className={cn('p-2 rounded-lg bg-white/50 dark:bg-black/20', config.iconColor)}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{config.label}</span>
                  <div className="flex items-center gap-1.5">
                    {activePrompt && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        v{activePrompt.version}
                      </Badge>
                    )}
                    {promptCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {promptCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
                {activePrompt && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {activePrompt.system_prompt.substring(0, 60)}...
                  </p>
                )}
              </div>
              <PencilSimple className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
