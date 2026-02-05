'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
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
  ChartLine,
  ChartBar,
  Target,
  Star,
  Sparkle,
  TrendUp,
  TrendDown,
  Minus,
  Warning,
  Lightning,
  Spinner,
  ArrowsClockwise,
  Info,
} from '@phosphor-icons/react'
import type {
  PromptStage,
  FeedbackAnalysis,
  EvaluationScores,
  WeaknessPattern,
} from '@/types/prompt-studio'
import { getEvaluationConfig, getDimensionLabel } from '@/lib/prompt-studio/stage-evaluation-config'

interface FeedbackDashboardProps {
  stage: PromptStage
  language?: 'ko' | 'en'
  className?: string
  compact?: boolean
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

function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  switch (trend) {
    case 'improving':
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendUp className="h-4 w-4" />
          <span className="text-xs">Improving</span>
        </span>
      )
    case 'declining':
      return (
        <span className="flex items-center gap-1 text-red-600">
          <TrendDown className="h-4 w-4" />
          <span className="text-xs">Declining</span>
        </span>
      )
    default:
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          <span className="text-xs">Stable</span>
        </span>
      )
  }
}

function ScoreDistributionBar({
  distribution,
  language = 'en',
}: {
  distribution: Record<string, number>
  language?: 'ko' | 'en'
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const ranges = ['4-5', '3-4', '2-3', '1-2']
  const colors = {
    '4-5': 'bg-green-500',
    '3-4': 'bg-blue-500',
    '2-3': 'bg-yellow-500',
    '1-2': 'bg-red-500',
  }

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {ranges.map((range) => {
        const count = distribution[range] || 0
        const percentage = (count / total) * 100
        if (percentage === 0) return null
        return (
          <Tooltip key={range}>
            <TooltipTrigger asChild>
              <div
                className={cn(colors[range as keyof typeof colors], 'h-full')}
                style={{ width: `${percentage}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {language === 'ko' ? `점수 ${range}` : `Score ${range}`}: {count} ({percentage.toFixed(0)}%)
              </p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function WeaknessPatternCard({ pattern, stage, language = 'en' }: { pattern: WeaknessPattern; stage: PromptStage; language?: 'ko' | 'en' }) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Warning className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm">{pattern.pattern}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {pattern.affectedDimensions.map((dim) => (
          <Badge key={dim} variant="outline" className="text-xs">
            {getDimensionLabel(stage, dim, language)}
          </Badge>
        ))}
      </div>
      {pattern.suggestedFix && (
        <div className="flex items-start gap-2 pt-1">
          <Lightning className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{pattern.suggestedFix}</p>
        </div>
      )}
    </div>
  )
}

export function FeedbackDashboard({ stage, language = 'en', className, compact = false }: FeedbackDashboardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null)

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/prompt-studio/feedback?stage=${stage}&patterns=true`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch feedback')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      console.error('Error fetching feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback')
    } finally {
      setIsLoading(false)
    }
  }, [stage])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <Warning className="h-4 w-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis || analysis.stats.totalFeedback === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Info className="h-4 w-4" />
            <p>No evaluation data yet. Run tests to generate feedback.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { stats, weaknessPatterns, improvementPriorities } = analysis

  // Compact view for stage editor summary
  if (compact) {
    return (
      <TooltipProvider>
        <Card className={cn('overflow-hidden', className)}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <ChartLine className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={cn('font-semibold', getScoreColor(stats.averageScores.overall))}
                      >
                        {stats.averageScores.overall.toFixed(1)}/5
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'ko' ? '전체 평가의 평균 종합 점수' : 'Average overall score across all evaluations'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <ChartBar className="h-4 w-4" />
                      <span>{stats.totalFeedback} tests</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'ko' ? '실행된 총 LLM-as-Judge 평가 횟수' : 'Total LLM-as-Judge evaluations performed'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><TrendIndicator trend={stats.recentTrend} /></span>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'ko' ? '최근 점수 추이: Improving=상승, Stable=유지, Declining=하락' : 'Recent score trend direction'}</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <Warning className="h-3 w-3 mr-1 text-yellow-600" />
                      {getDimensionLabel(stage, stats.weakestDimension, language)}:{' '}
                      {stats.averageScores[stats.weakestDimension].toFixed(1)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'ko' ? '가장 점수가 낮아 개선이 필요한 평가 차원' : 'Lowest-scoring dimension that needs improvement'}</TooltipContent>
                </Tooltip>

                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchAnalysis}>
                  <ArrowsClockwise className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    )
  }

  // Full dashboard view
  return (
    <TooltipProvider>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChartBar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Feedback Analytics</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="ml-2">
                    {stats.totalFeedback} evaluations
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{language === 'ko' ? '실행된 총 LLM-as-Judge 평가 횟수' : 'Total LLM-as-Judge evaluations performed'}</TooltipContent>
              </Tooltip>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAnalysis}>
              <ArrowsClockwise className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-6">
          {/* Score Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Score Overview</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><TrendIndicator trend={stats.recentTrend} /></span>
                </TooltipTrigger>
                <TooltipContent>{language === 'ko' ? '최근 점수 추이: Improving=상승, Stable=유지, Declining=하락' : 'Recent score trend direction'}</TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {getEvaluationConfig(stage).dimensions.map((dim) => {
                const Icon = DIMENSION_ICONS[dim.key]
                const score = stats.averageScores[dim.key]
                const distribution = stats.scoreDistribution[dim.key]
                const label = language === 'ko' ? dim.labelKo : dim.label

                return (
                  <div key={dim.key} className={cn('p-3 rounded-lg', getScoreBgColor(score))}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', getScoreColor(score))} weight="duotone" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <span className={cn('text-lg font-bold', getScoreColor(score))}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                    <ScoreDistributionBar distribution={distribution} language={language} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weakness Patterns */}
          {weaknessPatterns.length > 0 && (
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="text-sm font-medium flex items-center gap-2 cursor-default">
                    <Warning className="h-4 w-4 text-yellow-600" />
                    {language === 'ko' ? '약점 패턴' : 'Identified Weakness Patterns'}
                  </h4>
                </TooltipTrigger>
                <TooltipContent>{language === 'ko' ? '반복적으로 발견되는 품질 문제 패턴' : 'Recurring quality issue patterns'}</TooltipContent>
              </Tooltip>
              <div className="space-y-2">
                {weaknessPatterns.map((pattern, idx) => (
                  <WeaknessPatternCard key={idx} pattern={pattern} stage={stage} language={language} />
                ))}
              </div>
            </div>
          )}

          {/* Improvement Priorities */}
          {improvementPriorities.length > 0 && (
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="text-sm font-medium flex items-center gap-2 cursor-default">
                    <Lightning className="h-4 w-4 text-blue-600" />
                    {language === 'ko' ? '개선 우선순위' : 'Improvement Priorities'}
                  </h4>
                </TooltipTrigger>
                <TooltipContent>{language === 'ko' ? '개선 시 가장 큰 효과가 예상되는 항목 순위' : 'Items ranked by expected improvement impact'}</TooltipContent>
              </Tooltip>
              <div className="space-y-2">
                {improvementPriorities.map((priority, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <Badge variant="outline" className="shrink-0">
                      #{idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getDimensionLabel(stage, priority.dimension, language)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {priority.currentScore.toFixed(1)} → {priority.targetScore.toFixed(1)}
                        </span>
                      </div>
                      {priority.suggestions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {priority.suggestions[0]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

/**
 * Compact summary widget for stage editor
 */
export function FeedbackSummaryWidget({
  stage,
  language,
  className,
}: {
  stage: PromptStage
  language?: 'ko' | 'en'
  className?: string
}) {
  return <FeedbackDashboard stage={stage} language={language} className={className} compact />
}

export type { FeedbackDashboardProps }
