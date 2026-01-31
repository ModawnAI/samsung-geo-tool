'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  FloppyDisk,
  ArrowCounterClockwise,
  Spinner,
  Warning,
  Check,
  Info,
  Robot,
  ChartBar,
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  saveRefinerPromptData,
  type RefinerPromptData,
} from '@/components/prompt-studio/refiner-fullscreen'
import { FeedbackSummaryWidget } from '@/components/prompt-studio/feedback-dashboard'
import {
  STAGE_CONFIG,
  DEFAULT_LLM_PARAMETERS,
  AVAILABLE_MODELS,
  PROMPT_STAGES,
  type PromptStage,
  type StagePrompt,
} from '@/types/prompt-studio'

interface PageParams {
  stage: string
}

export default function StageEditorPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const stageId = resolvedParams.stage as PromptStage

  // Validate stage
  if (!PROMPT_STAGES.includes(stageId)) {
    router.replace('/admin/prompt-studio')
    return null
  }

  const config = STAGE_CONFIG[stageId]

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Form state
  const [stagePrompt, setStagePrompt] = useState<StagePrompt | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(DEFAULT_LLM_PARAMETERS.temperature)
  const [maxTokens, setMaxTokens] = useState(DEFAULT_LLM_PARAMETERS.maxTokens)
  const [model, setModel] = useState(DEFAULT_LLM_PARAMETERS.model)

  useEffect(() => {
    fetchStagePrompt()
  }, [stageId])

  const fetchStagePrompt = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/prompt-studio/stages/${stageId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stage prompt')
      }
      const data = await response.json()
      if (data.stagePrompt) {
        // Use existing stage-specific prompt
        setStagePrompt(data.stagePrompt)
        setSystemPrompt(data.stagePrompt.stage_system_prompt || '')
        setTemperature(data.stagePrompt.temperature)
        setMaxTokens(data.stagePrompt.max_tokens)
        setModel(data.stagePrompt.model)
      } else if (data.defaultPrompt) {
        // Use the composed default prompt from base prompt_versions
        setSystemPrompt(data.defaultPrompt)
        setTemperature(DEFAULT_LLM_PARAMETERS.temperature)
        setMaxTokens(DEFAULT_LLM_PARAMETERS.maxTokens)
        setModel(DEFAULT_LLM_PARAMETERS.model)
      }
    } catch (err) {
      console.error('Error fetching stage prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to load prompt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const payload = {
        stage: stageId,
        stageSystemPrompt: systemPrompt || null,
        temperature,
        maxTokens,
        model,
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

      const data = await response.json()
      setStagePrompt(data.stagePrompt)
      setHasChanges(false)
      setSuccessMessage('Saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (stagePrompt) {
      setSystemPrompt(stagePrompt.stage_system_prompt || '')
      setTemperature(stagePrompt.temperature)
      setMaxTokens(stagePrompt.max_tokens)
      setModel(stagePrompt.model)
    } else {
      setSystemPrompt('')
      setTemperature(DEFAULT_LLM_PARAMETERS.temperature)
      setMaxTokens(DEFAULT_LLM_PARAMETERS.maxTokens)
      setModel(DEFAULT_LLM_PARAMETERS.model)
    }
    setHasChanges(false)
  }

  const insertVariable = (variable: string) => {
    setSystemPrompt((prev) => prev + variable)
    setHasChanges(true)
  }

  // Navigate to fullscreen refiner
  const handleOpenRefiner = () => {
    // Save current state to session storage for the refiner page
    const data: RefinerPromptData = {
      stageId,
      systemPrompt,
      stagePrompt,
      temperature,
      maxTokens,
      model,
    }
    saveRefinerPromptData(data)
    router.push(`/admin/prompt-studio/${stageId}/refiner`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/prompt-studio">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>대시보드로 돌아가기</p>
              </TooltipContent>
            </Tooltip>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{config.label}</h2>
                {hasChanges && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Refiner Button - navigates to fullscreen refiner */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenRefiner}
                >
                  <Robot className="h-4 w-4 mr-1" />
                  AI Refiner
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI 기반 프롬프트 개선 도구 (전체화면)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
                  <ArrowCounterClockwise className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>변경사항 되돌리기</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/prompt-studio/${stageId}/test`}>
                    <Play className="h-4 w-4 mr-1" />
                    Test
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>실제 제품으로 프롬프트 테스트</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Spinner className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FloppyDisk className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>프롬프트 설정 저장</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 py-3">
              <Warning className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
            <CardContent className="flex items-center gap-3 py-3">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* System Prompt Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stage System Prompt</CardTitle>
                <CardDescription>
                  Custom instructions for this stage (overrides base prompt)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value)
                    setHasChanges(true)
                  }}
                  placeholder="Enter stage-specific system prompt instructions..."
                  className="min-h-[400px] font-mono text-sm"
                />

                {/* Variable Inserter - only show if stage has template variables */}
                {config.templateVariables.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Insert Variable</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            변수는 테스트 실행 시 실제 값으로 대체됩니다
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.templateVariables.map((v) => (
                        <Tooltip key={v.name}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-mono"
                              onClick={() => insertVariable(v.name)}
                            >
                              {v.name}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{v.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Parameters Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LLM Parameters</CardTitle>
                <CardDescription>Configure model behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Model</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">사용할 AI 모델 선택. Flash는 빠르고 경제적, Pro는 더 높은 품질</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={model}
                    onValueChange={(value) => {
                      setModel(value)
                      setHasChanges(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Temperature</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">출력의 무작위성 조절. 낮을수록 일관된 결과, 높을수록 다양한 결과</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[temperature]}
                    onValueChange={([value]) => {
                      setTemperature(value)
                      setHasChanges(true)
                    }}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Max Tokens</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">생성할 최대 토큰 수. 더 긴 출력이 필요하면 값을 높이세요</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">{maxTokens}</span>
                  </div>
                  <Input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => {
                      setMaxTokens(parseInt(e.target.value) || 4096)
                      setHasChanges(true)
                    }}
                    min={100}
                    max={32000}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Test Stats */}
            {stagePrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Test Count</span>
                    <span>{stagePrompt.test_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Score</span>
                    <span>
                      {stagePrompt.avg_quality_score != null
                        ? `${stagePrompt.avg_quality_score.toFixed(1)}%`
                        : '--'}
                    </span>
                  </div>
                  {stagePrompt.last_tested_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Tested</span>
                      <span>{new Date(stagePrompt.last_tested_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Evaluation Summary */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChartBar className="h-4 w-4" />
                  AI Evaluation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <FeedbackSummaryWidget stage={stageId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
