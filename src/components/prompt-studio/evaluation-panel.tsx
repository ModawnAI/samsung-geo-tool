'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Robot,
  Spinner,
  Star,
  Target,
  Sparkle,
  ChartLine,
  Check,
  Warning,
  Lightning,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type {
  PromptStage,
  StageTestInputData,
  StageOutput,
  LLMJudgeEvaluation,
} from '@/types/prompt-studio'
import { getEvaluationConfig } from '@/lib/prompt-studio/stage-evaluation-config'

interface EvaluationPanelProps {
  stage: PromptStage
  input: StageTestInputData
  output: StageOutput
  prompt: string
  testRunId?: string
  language?: 'ko' | 'en'
  className?: string
}

const DIMENSION_ICONS = {
  overall: ChartLine,
  relevance: Target,
  quality: Star,
  creativity: Sparkle,
}

function getScoreColor(score: number): string {
  if (score >= 4.0) return 'text-green-600'
  if (score >= 3.0) return 'text-blue-600'
  if (score >= 2.0) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBgColor(score: number): string {
  if (score >= 4.0) return 'bg-green-100 dark:bg-green-900/30'
  if (score >= 3.0) return 'bg-blue-100 dark:bg-blue-900/30'
  if (score >= 2.0) return 'bg-yellow-100 dark:bg-yellow-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

function ScoreBar({ score, maxScore = 5 }: { score: number; maxScore?: number }) {
  const percentage = (score / maxScore) * 100

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          score >= 4.0 ? 'bg-green-500' : '',
          score >= 3.0 && score < 4.0 ? 'bg-blue-500' : '',
          score >= 2.0 && score < 3.0 ? 'bg-yellow-500' : '',
          score < 2.0 ? 'bg-red-500' : ''
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export function EvaluationPanel({
  stage,
  input,
  output,
  prompt,
  testRunId,
  language = 'en',
  className,
}: EvaluationPanelProps) {
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<LLMJudgeEvaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const runEvaluation = useCallback(async () => {
    setIsEvaluating(true)
    setError(null)

    try {
      const response = await fetch('/api/prompt-studio/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          input,
          output,
          prompt,
          testRunId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Evaluation failed')
      }

      const data = await response.json()
      setEvaluation(data.evaluation)
    } catch (err) {
      console.error('Evaluation error:', err)
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    } finally {
      setIsEvaluating(false)
    }
  }, [stage, input, output, prompt, testRunId])

  // Check if output has actual content (not empty object or error state)
  const hasValidOutput = React.useMemo(() => {
    if (!output) return false
    if (typeof output !== 'object') return false
    // Check if output has actual data (not just error fields)
    const keys = Object.keys(output)
    if (keys.length === 0) return false
    // Check for error indicators
    if ('error' in output || 'message' in output) return false
    return true
  }, [output])

  // Auto-evaluate on mount or output change (only if valid output and no error)
  React.useEffect(() => {
    if (hasValidOutput && !evaluation && !isEvaluating && !error) {
      runEvaluation()
    }
  }, [hasValidOutput, evaluation, isEvaluating, error, runEvaluation])

  if (!hasValidOutput) {
    return null
  }

  return (
    <TooltipProvider>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Robot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Evaluation</CardTitle>
              {evaluation && (
                <Badge
                  className={cn(
                    'ml-2',
                    getScoreBgColor(evaluation.scores.overall),
                    getScoreColor(evaluation.scores.overall),
                    'border-0'
                  )}
                >
                  {evaluation.scores.overall.toFixed(1)}/5
                </Badge>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runEvaluation}
                  disabled={isEvaluating}
                >
                  {isEvaluating ? (
                    <>
                      <Spinner className="h-4 w-4 mr-1 animate-spin" />
                      Evaluating...
                    </>
                  ) : evaluation ? (
                    <>
                      <Lightning className="h-4 w-4 mr-1" />
                      Re-evaluate
                    </>
                  ) : (
                    <>
                      <Robot className="h-4 w-4 mr-1" />
                      Evaluate
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ko' ? 'LLM-as-Judge로 4차원 품질 평가 실행 (별도 AI가 채점)' : 'Run 4-dimension quality evaluation via LLM-as-Judge'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm mb-4">
              <Warning className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {isEvaluating && !evaluation && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analyzing output quality...</p>
            </div>
          )}

          {evaluation && (
            <div className="space-y-4">
              {/* Score Grid */}
              <div className="grid grid-cols-2 gap-3">
                {getEvaluationConfig(stage).dimensions.map((dim) => {
                  const Icon = DIMENSION_ICONS[dim.key]
                  const score = evaluation.scores[dim.key]
                  const label = language === 'ko' ? dim.labelKo : dim.label
                  const desc = language === 'ko' ? dim.descriptionKo : dim.description

                  return (
                    <Tooltip key={dim.key}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'p-3 rounded-lg transition-colors cursor-default',
                            getScoreBgColor(score)
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className={cn('h-4 w-4', getScoreColor(score))} weight="duotone" />
                              <span className="text-sm font-medium">{label}</span>
                            </div>
                            <span className={cn('text-lg font-bold', getScoreColor(score))}>
                              {score.toFixed(1)}
                            </span>
                          </div>
                          <ScoreBar score={score} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{desc}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">{evaluation.feedback.summary}</p>
              </div>

              {/* Detailed Feedback (Collapsible) */}
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Detailed Feedback</span>
                    {showDetails ? (
                      <CaretUp className="h-4 w-4" />
                    ) : (
                      <CaretDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {/* Strengths */}
                  {evaluation.feedback.strengths.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Strengths
                      </p>
                      <ul className="space-y-1">
                        {evaluation.feedback.strengths.map((strength, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-green-500"
                          >
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {evaluation.feedback.weaknesses.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-1">
                        <Warning className="h-4 w-4" />
                        Weaknesses
                      </p>
                      <ul className="space-y-1">
                        {evaluation.feedback.weaknesses.map((weakness, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-yellow-500"
                          >
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {evaluation.feedback.suggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                        <Lightning className="h-4 w-4" />
                        Suggestions
                      </p>
                      <ul className="space-y-1">
                        {evaluation.feedback.suggestions.map((suggestion, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-blue-500"
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export type { EvaluationPanelProps }
