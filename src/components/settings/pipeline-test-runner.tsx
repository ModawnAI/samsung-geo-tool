'use client'

import { useReducer, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Play,
  Stop,
  Spinner,
  Check,
  XCircle,
  Clock,
  CaretDown,
  CaretUp,
  SkipForward,
} from '@phosphor-icons/react'
import {
  STAGE_CONFIG,
  STAGE_ENGINE_MAP,
  ENGINE_CONFIG,
  type PromptStage,
  type QualityScore,
} from '@/types/prompt-studio'
import type {
  PipelineStageResult,
  PipelineStageStatus,
} from '@/types/pipeline'
import { getUpstreamChain } from '@/lib/prompt-studio/stage-dependencies'
import { executeUpToStage } from '@/lib/prompt-studio/pipeline-orchestrator'

// ============================================================================
// Reducer
// ============================================================================

interface PipelineReducerState {
  stages: Partial<Record<PromptStage, PipelineStageResult>>
  status: 'idle' | 'running' | 'completed' | 'partial' | 'failed' | 'aborted'
  totalLatencyMs: number
  startedAt?: number
  completedAt?: number
}

type PipelineAction =
  | { type: 'START' }
  | { type: 'STAGE_UPDATE'; stage: PromptStage; result: PipelineStageResult }
  | { type: 'COMPLETE' }
  | { type: 'ABORT' }
  | { type: 'RESET' }

function pipelineReducer(state: PipelineReducerState, action: PipelineAction): PipelineReducerState {
  switch (action.type) {
    case 'START':
      return {
        stages: {},
        status: 'running',
        totalLatencyMs: 0,
        startedAt: Date.now(),
        completedAt: undefined,
      }
    case 'STAGE_UPDATE': {
      const newStages = { ...state.stages, [action.stage]: action.result }
      return { ...state, stages: newStages }
    }
    case 'COMPLETE': {
      const completedAt = Date.now()
      const totalLatencyMs = state.startedAt ? completedAt - state.startedAt : 0
      const stageResults = Object.values(state.stages)
      const hasFailed = stageResults.some((r) => r.status === 'failed')
      const hasSkipped = stageResults.some((r) => r.status === 'skipped')
      let status: PipelineReducerState['status'] = 'completed'
      if (hasFailed) status = hasSkipped ? 'partial' : 'failed'
      return { ...state, status, totalLatencyMs, completedAt }
    }
    case 'ABORT':
      return { ...state, status: 'aborted', completedAt: Date.now() }
    case 'RESET':
      return { stages: {}, status: 'idle', totalLatencyMs: 0 }
    default:
      return state
  }
}

const initialState: PipelineReducerState = {
  stages: {},
  status: 'idle',
  totalLatencyMs: 0,
}

// ============================================================================
// Component
// ============================================================================

interface PipelineTestRunnerProps {
  language: 'ko' | 'en'
  targetStage: PromptStage
  onStageClick?: (stage: PromptStage) => void
}

export function PipelineTestRunner({ language, targetStage, onStageClick }: PipelineTestRunnerProps) {
  const [state, dispatch] = useReducer(pipelineReducer, initialState)
  const abortRef = useRef<AbortController | null>(null)

  // Input form state
  const [productName, setProductName] = useState('Galaxy Z Flip7')
  const [category, setCategory] = useState('smartphone')
  const [keywords, setKeywords] = useState('foldable, AI camera, FlexWindow, Galaxy AI')
  const [videoDescription, setVideoDescription] = useState('')
  const [srtContent, setSrtContent] = useState('')
  const [testLanguage, setTestLanguage] = useState<'ko' | 'en'>('en')

  // Expanded stage details
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const toggleExpanded = useCallback((stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }, [])

  const levels = getUpstreamChain(targetStage)

  const runPipeline = async () => {
    dispatch({ type: 'START' })
    const abortController = new AbortController()
    abortRef.current = abortController

    const baseInput: Record<string, unknown> = {
      productName,
      category,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
    }
    if (videoDescription) baseInput.videoDescription = videoDescription
    if (srtContent) baseInput.srtContent = srtContent

    try {
      await executeUpToStage(
        targetStage,
        baseInput,
        testLanguage,
        (stage, result) => dispatch({ type: 'STAGE_UPDATE', stage, result }),
        abortController.signal
      )
      dispatch({ type: 'COMPLETE' })
    } catch {
      dispatch({ type: 'COMPLETE' })
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    dispatch({ type: 'ABORT' })
  }

  const handleReset = () => {
    dispatch({ type: 'RESET' })
  }

  // Compute summary stats
  const stageResults = Object.values(state.stages)
  const completedCount = stageResults.filter((r) => r.status === 'completed').length
  const failedCount = stageResults.filter((r) => r.status === 'failed').length
  const skippedCount = stageResults.filter((r) => r.status === 'skipped').length
  const totalStages = levels.reduce((sum, l) => sum + l.stages.length, 0)
  const progressPercent = totalStages > 0 ? Math.round(((completedCount + failedCount + skippedCount) / totalStages) * 100) : 0

  const avgScore = (() => {
    const scores = stageResults
      .filter((r) => r.result?.qualityScore)
      .map((r) => r.result!.qualityScore.total)
    if (scores.length === 0) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  })()

  const minScore = (() => {
    const scored = stageResults.filter((r) => r.result?.qualityScore)
    if (scored.length === 0) return null
    return scored.reduce((min, r) => {
      const s = r.result!.qualityScore.total
      return s < min.score ? { score: s, stage: r.stage } : min
    }, { score: Infinity, stage: '' as PromptStage })
  })()

  const maxScore = (() => {
    const scored = stageResults.filter((r) => r.result?.qualityScore)
    if (scored.length === 0) return null
    return scored.reduce((max, r) => {
      const s = r.result!.qualityScore.total
      return s > max.score ? { score: s, stage: r.stage } : max
    }, { score: -Infinity, stage: '' as PromptStage })
  })()

  const isRunning = state.status === 'running'
  const isDone = state.status === 'completed' || state.status === 'partial' || state.status === 'failed' || state.status === 'aborted'

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">
            {language === 'ko' ? '파이프라인 테스트' : 'Pipeline Test'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {levels.length > 1
              ? language === 'ko'
                ? `${levels.flatMap((l) => l.stages).map((s) => STAGE_CONFIG[s].labelKo).join(' → ')} 순서로 실행합니다`
                : `Runs ${levels.flatMap((l) => l.stages).map((s) => STAGE_CONFIG[s].label).join(' → ')} in order`
              : language === 'ko'
                ? `${STAGE_CONFIG[targetStage].labelKo}을(를) 단독 실행합니다`
                : `Runs ${STAGE_CONFIG[targetStage].label} independently`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">
                {language === 'ko' ? '제품명' : 'Product Name'} *
              </Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Galaxy Z Flip7"
                className="h-8 text-sm"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{language === 'ko' ? '카테고리' : 'Category'}</Label>
              <Select value={category} onValueChange={setCategory} disabled={isRunning}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smartphone">Smartphone</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="wearable">Wearable</SelectItem>
                  <SelectItem value="tv">TV</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{language === 'ko' ? '키워드' : 'Keywords'}</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="foldable, AI camera, FlexWindow"
              className="h-8 text-sm"
              disabled={isRunning}
            />
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">
                <CaretDown className="h-3 w-3 mr-1" />
                {language === 'ko' ? '추가 옵션' : 'Additional Options'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  {language === 'ko' ? '영상 설명' : 'Video Description'}
                </Label>
                <Textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Enter video description..."
                  rows={2}
                  className="text-sm"
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SRT</Label>
                <Textarea
                  value={srtContent}
                  onChange={(e) => setSrtContent(e.target.value)}
                  placeholder="Paste SRT transcript..."
                  rows={2}
                  className="text-sm"
                  disabled={isRunning}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-2">
            <Label className="text-xs">{language === 'ko' ? '언어' : 'Language'}</Label>
            <Select value={testLanguage} onValueChange={(v: 'ko' | 'en') => setTestLanguage(v)} disabled={isRunning}>
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button
                size="sm"
                onClick={runPipeline}
                disabled={!productName || isRunning}
              >
                <Play className="h-4 w-4 mr-1" weight="fill" />
                {levels.length > 1
                  ? language === 'ko'
                    ? `${STAGE_CONFIG[targetStage].labelKo}까지 실행`
                    : `Run up to ${STAGE_CONFIG[targetStage].label}`
                  : language === 'ko'
                    ? `${STAGE_CONFIG[targetStage].labelKo} 실행`
                    : `Run ${STAGE_CONFIG[targetStage].label}`}
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={handleStop}>
                <Stop className="h-4 w-4 mr-1" weight="fill" />
                {language === 'ko' ? '중지' : 'Stop'}
              </Button>
            )}
            {isDone && (
              <Button size="sm" variant="outline" onClick={handleReset}>
                {language === 'ko' ? '리셋' : 'Reset'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {state.status !== 'idle' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isRunning
                ? language === 'ko'
                  ? '실행 중...'
                  : 'Running...'
                : language === 'ko'
                  ? '완료'
                  : 'Done'}
            </span>
            <span>
              {completedCount + failedCount + skippedCount}/{totalStages}{' '}
              {language === 'ko' ? '스테이지' : 'stages'}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Execution Levels */}
      {state.status !== 'idle' && (
        <div className="space-y-3">
          {levels.map((level) => (
            <div key={level.level} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Level {level.level}
                {level.stages.length > 1 && (
                  <span className="ml-1 opacity-60">
                    ({language === 'ko' ? '병렬' : 'parallel'})
                  </span>
                )}
              </p>
              <div className="space-y-1">
                {level.stages.map((stage) => {
                  const stageResult = state.stages[stage]
                  return (
                    <StageRow
                      key={stage}
                      stage={stage}
                      result={stageResult}
                      language={language}
                      expanded={expandedStages.has(stage)}
                      onToggle={() => toggleExpanded(stage)}
                      onClick={() => onStageClick?.(stage)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {isDone && stageResults.length > 0 && (
        <Card className="border-muted">
          <CardContent className="py-3">
            <p className="text-xs font-medium mb-2">
              {language === 'ko' ? '결과 요약' : 'Result Summary'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-sm font-bold">
                  {completedCount}/{totalStages}
                </p>
                <p className="text-muted-foreground">
                  {language === 'ko' ? '성공' : 'Passed'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-sm font-bold">
                  {failedCount > 0 ? (
                    <span className="text-red-600">{failedCount}</span>
                  ) : (
                    '0'
                  )}
                </p>
                <p className="text-muted-foreground">
                  {language === 'ko' ? '실패' : 'Failed'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-sm font-bold">
                  {avgScore !== null ? avgScore : '--'}
                </p>
                <p className="text-muted-foreground">
                  {language === 'ko' ? '평균 점수' : 'Avg Score'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-sm font-bold">
                  {state.totalLatencyMs > 0
                    ? `${(state.totalLatencyMs / 1000).toFixed(1)}s`
                    : '--'}
                </p>
                <p className="text-muted-foreground">
                  {language === 'ko' ? '총 소요' : 'Total Time'}
                </p>
              </div>
            </div>
            {minScore && maxScore && minScore.score !== Infinity && (
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  {language === 'ko' ? '최저' : 'Min'}: {minScore.score} ({STAGE_CONFIG[minScore.stage]?.label})
                </span>
                <span>
                  {language === 'ko' ? '최고' : 'Max'}: {maxScore.score} ({STAGE_CONFIG[maxScore.stage]?.label})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// StageRow Sub-component
// ============================================================================

function StageRow({
  stage,
  result,
  language,
  expanded,
  onToggle,
  onClick,
}: {
  stage: PromptStage
  result?: PipelineStageResult
  language: 'ko' | 'en'
  expanded: boolean
  onToggle: () => void
  onClick: () => void
}) {
  const config = STAGE_CONFIG[stage]
  const engine = STAGE_ENGINE_MAP[stage]
  const engineCfg = ENGINE_CONFIG[engine]
  const status = result?.status || 'pending'

  const statusIcon = getStatusIcon(status)
  const latency = result?.startedAt && result?.completedAt
    ? ((result.completedAt - result.startedAt) / 1000).toFixed(1)
    : null
  const score = result?.result?.qualityScore?.total
  const grade = result?.result?.qualityScore?.grade

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <div
        className={cn(
          'rounded-lg border transition-colors',
          status === 'running' && 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10',
          status === 'completed' && 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-900/10',
          status === 'failed' && 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-900/10',
          status === 'skipped' && 'border-muted bg-muted/30 opacity-50',
          status === 'pending' && 'border-muted'
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/20">
            <div className="flex items-center gap-2">
              {statusIcon}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClick()
                }}
                className="text-sm font-medium hover:underline"
              >
                {language === 'ko' ? config.labelKo : config.label}
              </button>
              <Badge className={cn('text-[10px] border-0', engineCfg.bgColor, engineCfg.color)}>
                {engineCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {score != null && (
                <span className="text-xs font-mono">
                  {score}{language === 'ko' ? '점' : 'pt'}
                </span>
              )}
              {grade && (
                <Badge className={cn('text-[10px] border-0', getGradeColor(grade))}>
                  {grade}
                </Badge>
              )}
              {latency && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {latency}s
                </span>
              )}
              {result?.error && status === 'failed' && (
                <Badge variant="destructive" className="text-[10px]">
                  {language === 'ko' ? '실패' : 'Failed'}
                </Badge>
              )}
              {status === 'skipped' && (
                <Badge variant="secondary" className="text-[10px]">
                  <SkipForward className="h-3 w-3 mr-0.5" />
                  {language === 'ko' ? '건너뜀' : 'Skipped'}
                </Badge>
              )}
              {result?.result && (
                expanded ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {result?.result && (
            <div className="px-3 pb-2 space-y-2 border-t">
              {/* Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center pt-2">
                <div className="p-1 rounded bg-muted/50">
                  <p className="text-xs font-bold">{result.result.qualityScore.total}</p>
                  <p className="text-[9px] text-muted-foreground">Score</p>
                </div>
                <div className="p-1 rounded bg-muted/50">
                  <p className="text-xs font-bold">{result.result.metrics.latencyMs}ms</p>
                  <p className="text-[9px] text-muted-foreground">Latency</p>
                </div>
                <div className="p-1 rounded bg-muted/50">
                  <p className="text-xs font-bold">{result.result.metrics.inputTokens}</p>
                  <p className="text-[9px] text-muted-foreground">In Tokens</p>
                </div>
                <div className="p-1 rounded bg-muted/50">
                  <p className="text-xs font-bold">{result.result.metrics.outputTokens}</p>
                  <p className="text-[9px] text-muted-foreground">Out Tokens</p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-1">
                {Object.entries(result.result.qualityScore.breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-[10px] text-muted-foreground">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(value / 30) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono w-4 text-right">{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Output Preview */}
              <div className="text-xs">
                <pre className="font-mono bg-muted p-2 rounded text-[10px] overflow-x-auto whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                  {JSON.stringify(result.result.output, null, 2).slice(0, 500)}
                  {JSON.stringify(result.result.output, null, 2).length > 500 && '\n...'}
                </pre>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="px-3 pb-2 border-t pt-2">
              <p className="text-xs text-red-600">{result.error}</p>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusIcon(status: PipelineStageStatus) {
  switch (status) {
    case 'running':
      return <Spinner className="h-4 w-4 text-blue-600 animate-spin" />
    case 'completed':
      return <Check className="h-4 w-4 text-green-600" weight="bold" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-muted-foreground" />
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function getGradeColor(grade: QualityScore['grade']) {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-green-600 bg-green-100'
    case 'B':
      return 'text-blue-600 bg-blue-100'
    case 'C':
      return 'text-yellow-600 bg-yellow-100'
    case 'D':
    case 'F':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}
