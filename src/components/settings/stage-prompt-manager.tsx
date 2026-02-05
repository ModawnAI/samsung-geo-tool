'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Sparkle,
  FloppyDisk,
  Spinner,
  Check,
  Warning,
  Info,
  Play,
  Robot,
  ClockCounterClockwise,
  ChartBar,
  ArrowCounterClockwise,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import {
  STAGE_CONFIG,
  DEFAULT_LLM_PARAMETERS,
  AVAILABLE_MODELS,
  PROMPT_STAGES,
  STAGE_ENGINE_MAP,
  ENGINE_CONFIG,
  type PromptStage,
  type StagePrompt,
  type StageStatusSummary,
} from '@/types/prompt-studio'

// Import child components
import { StagePipelineBar } from './stage-pipeline-bar'
import { StageTestPanel } from './stage-test-panel'
import { StageRefinerPanel } from './stage-refiner-panel'
import { StageVersionHistory } from './stage-version-history'
import { EngineBasePrompts } from './engine-base-prompts'
import { FeedbackDashboard } from '@/components/prompt-studio/feedback-dashboard'
import { PipelineTestRunner } from './pipeline-test-runner'

interface StagePromptManagerProps {
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
}

export function StagePromptManager({ language, getAuthToken }: StagePromptManagerProps) {
  // Stage selection state
  const [selectedStage, setSelectedStage] = useState<PromptStage>('description')
  const [stageStatuses, setStageStatuses] = useState<StageStatusSummary[]>([])
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState('test')

  // Current stage prompt state
  const [stagePrompt, setStagePrompt] = useState<StagePrompt | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [temperature, setTemperature] = useState(DEFAULT_LLM_PARAMETERS.temperature)
  const [maxTokens, setMaxTokens] = useState(DEFAULT_LLM_PARAMETERS.maxTokens)
  const [model, setModel] = useState(DEFAULT_LLM_PARAMETERS.model)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges = systemPrompt !== originalPrompt

  // Get engine info for selected stage
  const engine = STAGE_ENGINE_MAP[selectedStage]
  const engineConfig = ENGINE_CONFIG[engine]

  // Fetch all stage statuses
  const fetchStageStatuses = useCallback(async () => {
    setIsLoadingStatuses(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/prompt-studio/stages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setStageStatuses(data.stages || [])
      }
    } catch (err) {
      console.error('Error fetching stage statuses:', err)
      // Create placeholder stages
      setStageStatuses(
        PROMPT_STAGES.map((stage) => ({
          stage,
          hasActivePrompt: false,
          workflowStatus: 'draft' as const,
          avgQualityScore: null,
          testCount: 0,
          lastTestedAt: null,
          updatedAt: new Date().toISOString(),
          engine: STAGE_ENGINE_MAP[stage],
        }))
      )
    } finally {
      setIsLoadingStatuses(false)
    }
  }, [getAuthToken])

  // Fetch prompt for selected stage
  const fetchStagePrompt = useCallback(async () => {
    setIsLoadingPrompt(true)
    setError(null)
    try {
      const response = await fetch(`/api/prompt-studio/stages/${selectedStage}`)
      if (response.ok) {
        const data = await response.json()
        if (data.stagePrompt) {
          setStagePrompt(data.stagePrompt)
          setSystemPrompt(data.stagePrompt.stage_system_prompt || '')
          setOriginalPrompt(data.stagePrompt.stage_system_prompt || '')
          setTemperature(data.stagePrompt.temperature)
          setMaxTokens(data.stagePrompt.max_tokens)
          setModel(data.stagePrompt.model)
        } else if (data.defaultPrompt) {
          setSystemPrompt(data.defaultPrompt)
          setOriginalPrompt(data.defaultPrompt)
          setTemperature(DEFAULT_LLM_PARAMETERS.temperature)
          setMaxTokens(DEFAULT_LLM_PARAMETERS.maxTokens)
          setModel(DEFAULT_LLM_PARAMETERS.model)
          setStagePrompt(null)
        }
      }
    } catch (err) {
      console.error('Error fetching stage prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoadingPrompt(false)
    }
  }, [selectedStage])

  useEffect(() => {
    fetchStageStatuses()
  }, [fetchStageStatuses])

  useEffect(() => {
    fetchStagePrompt()
  }, [fetchStagePrompt])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const payload = {
        stage: selectedStage,
        stageSystemPrompt: systemPrompt || null,
        temperature,
        maxTokens,
        model,
      }

      const response = await fetch(`/api/prompt-studio/stages/${selectedStage}`, {
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
      setOriginalPrompt(systemPrompt)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Refresh statuses
      fetchStageStatuses()
    } catch (err) {
      console.error('Error saving:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSystemPrompt(originalPrompt)
    if (stagePrompt) {
      setTemperature(stagePrompt.temperature)
      setMaxTokens(stagePrompt.max_tokens)
      setModel(stagePrompt.model)
    } else {
      setTemperature(DEFAULT_LLM_PARAMETERS.temperature)
      setMaxTokens(DEFAULT_LLM_PARAMETERS.maxTokens)
      setModel(DEFAULT_LLM_PARAMETERS.model)
    }
  }

  const handleApplyRefinerPrompt = (prompt: string) => {
    setSystemPrompt(prompt)
  }

  const handleRollback = (version: { stage_system_prompt: string | null; temperature: number; max_tokens: number; model: string }) => {
    setSystemPrompt(version.stage_system_prompt || '')
    setTemperature(version.temperature)
    setMaxTokens(version.max_tokens)
    setModel(version.model)
  }

  const config = STAGE_CONFIG[selectedStage]
  const currentStatus = stageStatuses.find((s) => s.stage === selectedStage)

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stage Pipeline Bar - Grid Cards */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {language === 'ko' ? '스테이지 파이프라인' : 'Stage Pipeline'}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {language === 'ko'
                ? '각 스테이지 카드에서 엔진, 모델, 상태를 확인하고 편집할 스테이지를 선택하세요'
                : 'View engine, model, and status for each stage. Select a stage to edit.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatuses ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <StagePipelineBar
                language={language}
                selectedStage={selectedStage}
                stageStatuses={stageStatuses}
                onStageSelect={setSelectedStage}
              />
            )}
          </CardContent>
        </Card>

        {/* Selected Stage Editor */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', config.color, 'bg-opacity-10')}>
                  <Sparkle className="h-5 w-5" weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">
                      {language === 'ko' ? config.labelKo : config.label}
                    </CardTitle>
                    {/* Engine badge */}
                    <Badge className={cn('text-xs', engineConfig.bgColor, engineConfig.color, 'border-0')}>
                      {engineConfig.label}
                    </Badge>
                    {stagePrompt && (
                      <Badge variant="outline" className="text-blue-600 border-blue-300 font-mono text-xs">
                        v{(stagePrompt as any).current_version || 1}
                      </Badge>
                    )}
                    {currentStatus?.workflowStatus && (
                      <Badge
                        variant={currentStatus.workflowStatus === 'active' ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          currentStatus.workflowStatus === 'active'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : ''
                        )}
                      >
                        {currentStatus.workflowStatus}
                      </Badge>
                    )}
                    {hasChanges && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                        {language === 'ko' ? '변경됨' : 'Modified'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {language === 'ko' ? config.descriptionKo : config.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
                      <ArrowCounterClockwise className="h-4 w-4 mr-1" />
                      {language === 'ko' ? '리셋' : 'Reset'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{language === 'ko' ? '변경사항 되돌리기' : 'Revert changes'}</p>
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
                      {language === 'ko' ? '저장' : 'Save'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{language === 'ko' ? '프롬프트 저장' : 'Save prompt'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                <Warning className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                <Check className="h-4 w-4 shrink-0" />
                <p className="text-sm">{language === 'ko' ? '저장되었습니다' : 'Saved successfully'}</p>
              </div>
            )}

            {isLoadingPrompt ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: Prompt Editor */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Stage Prompt Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">
                        {language === 'ko' ? '스테이지 지침' : 'Stage Instructions'}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            {language === 'ko'
                              ? `이 스테이지에 특화된 지침입니다. ${engineConfig.label} 엔진의 베이스 프롬프트와 결합되어 사용됩니다.`
                              : `Stage-specific instructions. Combined with ${engineConfig.label} engine's base prompt.`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder={
                        language === 'ko'
                          ? '이 스테이지의 지침을 입력하세요...'
                          : 'Enter stage-specific instructions...'
                      }
                      className="h-[350px] max-h-[350px] font-mono text-sm resize-none overflow-y-auto"
                    />
                  </div>

                  {/* Template Variables */}
                  {config.templateVariables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {language === 'ko' ? '사용 가능한 변수' : 'Available Variables'}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {config.templateVariables.map((v) => (
                          <Tooltip key={v.name}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-mono h-7"
                                onClick={() => setSystemPrompt((prev) => prev + v.name)}
                              >
                                {v.name}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{language === 'ko' ? v.descriptionKo : v.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: LLM Parameters */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="py-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {language === 'ko' ? 'LLM 파라미터' : 'LLM Parameters'}
                        </CardTitle>
                        <Badge className={cn('text-[10px]', engineConfig.bgColor, engineConfig.color, 'border-0')}>
                          {engineConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Model */}
                      <div className="space-y-2">
                        <Label className="text-xs">Model</Label>
                        <Select value={model} onValueChange={setModel}>
                          <SelectTrigger className="h-8 text-sm">
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Temperature</Label>
                          <span className="text-xs text-muted-foreground font-mono">
                            {temperature.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          value={[temperature]}
                          onValueChange={([value]) => setTemperature(value)}
                          min={0}
                          max={2}
                          step={0.1}
                        />
                      </div>

                      {/* Max Tokens */}
                      <div className="space-y-2">
                        <Label className="text-xs">Max Tokens</Label>
                        <Input
                          type="number"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                          min={100}
                          max={32000}
                          className="h-8 text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Test Stats */}
                  {currentStatus && (
                    <Card>
                      <CardContent className="py-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {language === 'ko' ? '테스트 수' : 'Test Count'}
                          </span>
                          <span>{currentStatus.testCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {language === 'ko' ? '평균 점수' : 'Avg Score'}
                          </span>
                          <span>
                            {currentStatus.avgQualityScore != null
                              ? `${currentStatus.avgQualityScore.toFixed(0)}%`
                              : '--'}
                          </span>
                        </div>
                        {currentStatus.lastTestedAt && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {language === 'ko' ? '마지막 테스트' : 'Last Tested'}
                            </span>
                            <span>
                              {new Date(currentStatus.lastTestedAt).toLocaleDateString(
                                language === 'ko' ? 'ko-KR' : 'en-US'
                              )}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="test" className="gap-2">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'ko' ? '테스트' : 'Test'}</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <ArrowsClockwise className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'ko' ? '파이프라인' : 'Pipeline'}</span>
            </TabsTrigger>
            <TabsTrigger value="refiner" className="gap-2">
              <Robot className="h-4 w-4" />
              <span className="hidden sm:inline">AI Refiner</span>
            </TabsTrigger>
            <TabsTrigger value="versions" className="gap-2">
              <ClockCounterClockwise className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'ko' ? '버전' : 'Versions'}</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <ChartBar className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'ko' ? '피드백' : 'Feedback'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <StageTestPanel
              stage={selectedStage}
              stagePrompt={stagePrompt}
              language={language}
            />
          </TabsContent>

          <TabsContent value="pipeline">
            <PipelineTestRunner
              language={language}
              targetStage={selectedStage}
              onStageClick={(stage) => {
                setSelectedStage(stage)
                setActiveTab('test')
              }}
            />
          </TabsContent>

          <TabsContent value="refiner">
            <StageRefinerPanel
              stage={selectedStage}
              currentPrompt={systemPrompt}
              stagePrompt={stagePrompt}
              language={language}
              onApplyPrompt={handleApplyRefinerPrompt}
            />
          </TabsContent>

          <TabsContent value="versions">
            <StageVersionHistory
              stage={selectedStage}
              currentVersion={(stagePrompt as any)?.current_version || null}
              language={language}
              onRollback={handleRollback}
            />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackDashboard stage={selectedStage} />
          </TabsContent>
        </Tabs>

        {/* Advanced: Engine Base Prompts - Collapsed by default */}
        <EngineBasePrompts language={language} getAuthToken={getAuthToken} />
      </div>
    </TooltipProvider>
  )
}
