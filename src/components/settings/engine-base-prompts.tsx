'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Wrench,
  CaretDown,
  CaretRight,
  FloppyDisk,
  Spinner,
  Check,
  Warning,
  Info,
} from '@phosphor-icons/react'
import { ENGINE_CONFIG, type AIEngine } from '@/types/prompt-studio'

interface EngineBasePromptsProps {
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
}

interface EnginePromptState {
  id: string | null
  prompt: string
  originalPrompt: string
  isLoading: boolean
  isSaving: boolean
  error: string | null
  success: boolean
}

const ENGINES: AIEngine[] = ['gemini', 'perplexity', 'cohere']

export function EngineBasePrompts({ language, getAuthToken }: EngineBasePromptsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState<AIEngine>('gemini')
  const [engineStates, setEngineStates] = useState<Record<AIEngine, EnginePromptState>>({
    gemini: { id: null, prompt: '', originalPrompt: '', isLoading: false, isSaving: false, error: null, success: false },
    perplexity: { id: null, prompt: '', originalPrompt: '', isLoading: false, isSaving: false, error: null, success: false },
    cohere: { id: null, prompt: '', originalPrompt: '', isLoading: false, isSaving: false, error: null, success: false },
  })
  // Track which engines have been fetched to prevent infinite loop
  const fetchedEnginesRef = useRef<Set<AIEngine>>(new Set())

  const fetchEnginePrompt = useCallback(async (engine: AIEngine) => {
    setEngineStates(prev => ({
      ...prev,
      [engine]: { ...prev[engine], isLoading: true, error: null }
    }))
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/tuning/prompts?engine=${engine}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${engine} prompt`)
      }

      const data = await response.json()
      // API returns { prompts: [...] }, find the active one or fall back to first
      const activeVersion = (data.prompts || []).find((v: { is_active: boolean }) => v.is_active) || data.prompts?.[0]
      const prompt = activeVersion?.system_prompt || ''
      const id = activeVersion?.id || null

      setEngineStates(prev => ({
        ...prev,
        [engine]: {
          ...prev[engine],
          id,
          prompt,
          originalPrompt: prompt,
          isLoading: false
        }
      }))
    } catch (err) {
      console.error(`Error fetching ${engine} prompt:`, err)
      setEngineStates(prev => ({
        ...prev,
        [engine]: {
          ...prev[engine],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load'
        }
      }))
    }
  }, [getAuthToken])

  // Only fetch when panel is opened
  useEffect(() => {
    if (isOpen) {
      ENGINES.forEach(engine => {
        // Only fetch if not already fetched or in progress
        if (!fetchedEnginesRef.current.has(engine)) {
          fetchedEnginesRef.current.add(engine)
          fetchEnginePrompt(engine)
        }
      })
    }
  }, [isOpen, fetchEnginePrompt])

  const handleSave = async (engine: AIEngine) => {
    const state = engineStates[engine]
    setEngineStates(prev => ({
      ...prev,
      [engine]: { ...prev[engine], isSaving: true, error: null, success: false }
    }))

    try {
      const token = await getAuthToken()
      let response: Response

      if (state.id) {
        // Update existing prompt
        response = await fetch('/api/tuning/prompts', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: state.id,
            system_prompt: state.prompt,
          }),
        })
      } else {
        // Create new prompt
        response = await fetch('/api/tuning/prompts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${engine.charAt(0).toUpperCase() + engine.slice(1)} Base Prompt`,
            version: '1.0.0',
            engine,
            system_prompt: state.prompt,
            description: `Base system prompt for ${engine} engine`,
            is_active: true,
          }),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const result = await response.json()
      const savedId = result.prompt?.id || state.id

      setEngineStates(prev => ({
        ...prev,
        [engine]: {
          ...prev[engine],
          id: savedId,
          originalPrompt: state.prompt,
          isSaving: false,
          success: true
        }
      }))

      setTimeout(() => {
        setEngineStates(prev => ({
          ...prev,
          [engine]: { ...prev[engine], success: false }
        }))
      }, 3000)
    } catch (err) {
      console.error(`Error saving ${engine} prompt:`, err)
      setEngineStates(prev => ({
        ...prev,
        [engine]: {
          ...prev[engine],
          isSaving: false,
          error: err instanceof Error ? err.message : 'Failed to save'
        }
      }))
    }
  }

  const handleReset = (engine: AIEngine) => {
    setEngineStates(prev => ({
      ...prev,
      [engine]: { ...prev[engine], prompt: prev[engine].originalPrompt }
    }))
  }

  const currentState = engineStates[selectedEngine]
  const hasChanges = currentState.prompt !== currentState.originalPrompt

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-dashed">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">
                        {language === 'ko' ? '고급: 엔진별 베이스 프롬프트' : 'Advanced: Engine Base Prompts'}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        {language === 'ko' ? '고급' : 'Advanced'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {language === 'ko'
                        ? 'Gemini, Perplexity, Cohere 엔진의 기본 시스템 프롬프트를 편집합니다'
                        : 'Edit base system prompts for Gemini, Perplexity, and Cohere engines'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <CaretDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <CaretRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Info note */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs">
                  {language === 'ko'
                    ? '각 AI 엔진의 베이스 프롬프트입니다. 스테이지별 지침과 결합되어 최종 프롬프트가 생성됩니다. 일반적으로 변경할 필요가 없습니다.'
                    : 'These are base prompts for each AI engine. They are combined with stage-specific instructions to create the final prompt. Usually no changes needed.'}
                </p>
              </div>

              {/* Engine Tabs */}
              <Tabs value={selectedEngine} onValueChange={(v) => setSelectedEngine(v as AIEngine)}>
                <TabsList className="grid w-full grid-cols-3">
                  {ENGINES.map((engine) => {
                    const config = ENGINE_CONFIG[engine]
                    const state = engineStates[engine]
                    const engineHasChanges = state.prompt !== state.originalPrompt

                    return (
                      <TabsTrigger
                        key={engine}
                        value={engine}
                        className="gap-2"
                      >
                        <span className={config.color}>{config.label}</span>
                        {engineHasChanges && (
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {ENGINES.map((engine) => {
                  const state = engineStates[engine]
                  const config = ENGINE_CONFIG[engine]
                  const engineHasChanges = state.prompt !== state.originalPrompt

                  return (
                    <TabsContent key={engine} value={engine} className="space-y-4 mt-4">
                      {/* Engine description */}
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {engine === 'gemini' && (language === 'ko' ? '콘텐츠 생성 (Description, FAQ, Chapters 등)' : 'Content generation (Description, FAQ, Chapters, etc.)')}
                          {engine === 'perplexity' && (language === 'ko' ? '웹 검색 및 그라운딩 (Grounding, USP)' : 'Web search & grounding (Grounding, USP)')}
                          {engine === 'cohere' && (language === 'ko' ? 'RAG 및 리랭킹' : 'RAG and reranking')}
                        </span>
                      </div>

                      {/* Error message */}
                      {state.error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                          <Warning className="h-4 w-4 shrink-0" />
                          <p className="text-sm">{state.error}</p>
                        </div>
                      )}

                      {/* Success message */}
                      {state.success && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                          <Check className="h-4 w-4 shrink-0" />
                          <p className="text-sm">
                            {language === 'ko' ? '저장되었습니다' : 'Saved successfully'}
                          </p>
                        </div>
                      )}

                      {/* Textarea */}
                      {state.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <Textarea
                          value={state.prompt}
                          onChange={(e) => setEngineStates(prev => ({
                            ...prev,
                            [engine]: { ...prev[engine], prompt: e.target.value }
                          }))}
                          placeholder={
                            language === 'ko'
                              ? `${config.label} 베이스 프롬프트를 입력하세요...`
                              : `Enter ${config.label} base prompt...`
                          }
                          className="min-h-[200px] font-mono text-sm"
                        />
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {language === 'ko'
                            ? `기본 모델: ${config.defaultModel}`
                            : `Default model: ${config.defaultModel}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReset(engine)}
                                disabled={!engineHasChanges || state.isSaving}
                              >
                                {language === 'ko' ? '되돌리기' : 'Reset'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{language === 'ko' ? '변경사항 되돌리기' : 'Revert changes'}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => handleSave(engine)}
                                disabled={!engineHasChanges || state.isSaving}
                              >
                                {state.isSaving ? (
                                  <>
                                    <Spinner className="h-4 w-4 mr-1 animate-spin" />
                                    {language === 'ko' ? '저장 중...' : 'Saving...'}
                                  </>
                                ) : (
                                  <>
                                    <FloppyDisk className="h-4 w-4 mr-1" />
                                    {language === 'ko' ? '저장' : 'Save'}
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{language === 'ko' ? '베이스 프롬프트 저장' : 'Save base prompt'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  )
}
