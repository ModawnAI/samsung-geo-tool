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
  STAGE_CONFIG,
  WORKFLOW_STATUS_CONFIG,
  DEFAULT_LLM_PARAMETERS,
  AVAILABLE_MODELS,
  PROMPT_STAGES,
  type PromptStage,
  type StagePrompt,
  type WorkflowStatus,
} from '@/types/prompt-studio'
import { TEMPLATE_VARIABLES } from '@/types/tuning'

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
  const [topP, setTopP] = useState(DEFAULT_LLM_PARAMETERS.topP)
  const [model, setModel] = useState(DEFAULT_LLM_PARAMETERS.model)
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('draft')

  useEffect(() => {
    fetchStagePrompt()
  }, [stageId])

  const fetchStagePrompt = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/prompt-studio/stages/${stageId}`)
      if (!response.ok) {
        if (response.status === 404) {
          // No existing prompt, use defaults
          setSystemPrompt('')
          setTemperature(DEFAULT_LLM_PARAMETERS.temperature)
          setMaxTokens(DEFAULT_LLM_PARAMETERS.maxTokens)
          setTopP(DEFAULT_LLM_PARAMETERS.topP)
          setModel(DEFAULT_LLM_PARAMETERS.model)
          setWorkflowStatus('draft')
          return
        }
        throw new Error('Failed to fetch stage prompt')
      }
      const data = await response.json()
      if (data.stagePrompt) {
        setStagePrompt(data.stagePrompt)
        setSystemPrompt(data.stagePrompt.stage_system_prompt || '')
        setTemperature(data.stagePrompt.temperature)
        setMaxTokens(data.stagePrompt.max_tokens)
        setTopP(data.stagePrompt.top_p)
        setModel(data.stagePrompt.model)
        setWorkflowStatus(data.stagePrompt.workflow_status)
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
        topP,
        model,
        workflowStatus,
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
      setTopP(stagePrompt.top_p)
      setModel(stagePrompt.model)
      setWorkflowStatus(stagePrompt.workflow_status)
    } else {
      setSystemPrompt('')
      setTemperature(DEFAULT_LLM_PARAMETERS.temperature)
      setMaxTokens(DEFAULT_LLM_PARAMETERS.maxTokens)
      setTopP(DEFAULT_LLM_PARAMETERS.topP)
      setModel(DEFAULT_LLM_PARAMETERS.model)
      setWorkflowStatus('draft')
    }
    setHasChanges(false)
  }

  const insertVariable = (variable: string) => {
    setSystemPrompt((prev) => prev + variable)
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statusConfig = WORKFLOW_STATUS_CONFIG[workflowStatus]

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/prompt-studio">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{config.label}</h2>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  {statusConfig.label}
                </Badge>
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
            <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
              <ArrowCounterClockwise className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/prompt-studio/${stageId}/test`}>
                <Play className="h-4 w-4 mr-1" />
                Test
              </Link>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Spinner className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FloppyDisk className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
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

                {/* Variable Inserter */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Insert Variable</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Variables are replaced with actual values during generation
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <Button
                        key={v.name}
                        variant="outline"
                        size="sm"
                        className="text-xs font-mono"
                        onClick={() => insertVariable(v.name)}
                      >
                        {v.name}
                      </Button>
                    ))}
                  </div>
                </div>
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
                  <Label>Model</Label>
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
                    <Label>Temperature</Label>
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
                    <Label>Max Tokens</Label>
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

                {/* Top P */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Top P</Label>
                    <span className="text-sm text-muted-foreground font-mono">
                      {topP.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[topP]}
                    onValueChange={([value]) => {
                      setTopP(value)
                      setHasChanges(true)
                    }}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Workflow Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow Status</CardTitle>
                <CardDescription>Current prompt status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={workflowStatus}
                  onValueChange={(value: WorkflowStatus) => {
                    setWorkflowStatus(value)
                    setHasChanges(true)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKFLOW_STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${cfg.bgColor.replace('bg-', 'bg-')}`}
                          />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Stats */}
                {stagePrompt && (
                  <div className="pt-4 border-t space-y-2">
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
