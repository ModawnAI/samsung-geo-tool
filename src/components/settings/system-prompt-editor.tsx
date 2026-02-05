'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  Sparkle,
  CaretDown,
  CaretRight,
  FloppyDisk,
  Spinner,
  Check,
  Warning,
  Info,
} from '@phosphor-icons/react'

interface SystemPromptEditorProps {
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
  onChange?: (prompt: string) => void
}

export function SystemPromptEditor({ language, getAuthToken, onChange }: SystemPromptEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges = systemPrompt !== originalPrompt

  // Fetch the current active system prompt from Gemini config
  const fetchSystemPrompt = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      // Fetch from the tuning/prompts API which holds the base system prompts
      const response = await fetch('/api/tuning/prompts?engine=gemini', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch system prompt')
      }

      const data = await response.json()
      // Get the active version's system prompt
      const activeVersion = data.versions?.find((v: { is_active: boolean }) => v.is_active)
      const prompt = activeVersion?.system_prompt || ''
      setSystemPrompt(prompt)
      setOriginalPrompt(prompt)
    } catch (err) {
      console.error('Error fetching system prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken])

  useEffect(() => {
    fetchSystemPrompt()
  }, [fetchSystemPrompt])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/tuning/prompts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engine: 'gemini',
          system_prompt: systemPrompt,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setOriginalPrompt(systemPrompt)
      setSuccess(true)
      onChange?.(systemPrompt)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving system prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSystemPrompt(originalPrompt)
  }

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkle className="h-5 w-5 text-primary" weight="duotone" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {language === 'ko' ? '시스템 프롬프트 (공통)' : 'System Prompt (Common)'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {language === 'ko'
                        ? '모든 스테이지에 적용되는 기본 시스템 프롬프트'
                        : 'Base system prompt applied to all stages'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <span className="text-xs text-yellow-600 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                      {language === 'ko' ? '변경됨' : 'Modified'}
                    </span>
                  )}
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
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs">
                  {language === 'ko'
                    ? '이 시스템 프롬프트는 모든 생성 스테이지(Description, USP, FAQ 등)에 공통으로 적용됩니다. 스테이지별 세부 지침은 각 스테이지에서 별도로 설정할 수 있습니다.'
                    : 'This system prompt is applied globally to all generation stages (Description, USP, FAQ, etc.). Stage-specific instructions can be set individually for each stage.'}
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                  <Warning className="h-4 w-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Success message */}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                  <Check className="h-4 w-4 shrink-0" />
                  <p className="text-sm">
                    {language === 'ko' ? '저장되었습니다' : 'Saved successfully'}
                  </p>
                </div>
              )}

              {/* Textarea */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={
                    language === 'ko'
                      ? '시스템 프롬프트를 입력하세요...'
                      : 'Enter system prompt...'
                  }
                  className="min-h-[200px] font-mono text-sm"
                />
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={!hasChanges || isSaving}
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
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                    >
                      {isSaving ? (
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
                    <p>{language === 'ko' ? '시스템 프롬프트 저장' : 'Save system prompt'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  )
}
