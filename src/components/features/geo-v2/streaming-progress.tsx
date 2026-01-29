'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  SpinnerGap,
  CheckCircle,
  Clock,
  XCircle,
  Hourglass,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import {
  type StreamStage,
  STAGE_LABELS,
  STAGE_WEIGHTS,
} from '@/lib/geo-v2/stream-generator'
import { getStageIcon } from '@/hooks/use-stream-generation'

interface StreamingProgressProps {
  isLoading: boolean
  progress: number
  currentStage: StreamStage | null
  stageMessage: string
  completedStages: StreamStage[]
  error: string | null
  language?: 'ko' | 'en'
  onCancel?: () => void
}

const STAGE_ORDER: StreamStage[] = [
  'initializing',
  'description',
  'usp_extraction',
  'chapters',
  'faq',
  'step_by_step',
  'case_studies',
  'keywords',
  'hashtags',
  'scoring',
]

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function StageItem({
  stage,
  isActive,
  isComplete,
  isPending,
  message,
  language,
}: {
  stage: StreamStage
  isActive: boolean
  isComplete: boolean
  isPending: boolean
  message?: string
  language: 'ko' | 'en'
}) {
  const icon = getStageIcon(stage)
  const name = STAGE_LABELS[stage][language]
  const weight = STAGE_WEIGHTS[stage]

  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
    }
    if (isActive) {
      return <SpinnerGap className="h-4 w-4 text-primary animate-spin" />
    }
    return <Hourglass className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        isActive && 'bg-primary/10',
        isComplete && 'bg-green-50 dark:bg-green-950/20',
        isPending && 'opacity-50'
      )}
    >
      {/* Status Icon */}
      <div className="w-6 h-6 flex items-center justify-center">
        {getStatusIcon()}
      </div>

      {/* Stage Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {icon}
          </span>
          <span className={cn(
            'text-sm font-medium',
            isComplete && 'text-green-700 dark:text-green-400',
            isActive && 'text-primary'
          )}>
            {name}
          </span>
        </div>
        {isActive && message && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {message}
          </p>
        )}
      </div>

      {/* Weight Percentage */}
      <div className="text-right">
        <span className={cn(
          'text-xs font-medium',
          isComplete && 'text-green-600 dark:text-green-400',
          isActive && 'text-primary',
          isPending && 'text-muted-foreground'
        )}>
          {weight}%
        </span>
      </div>
    </motion.div>
  )
}

export function StreamingProgress({
  isLoading,
  progress,
  currentStage,
  stageMessage,
  completedStages,
  error,
  language = 'ko',
  onCancel,
}: StreamingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  const isComplete = currentStage === 'complete'
  const hasError = currentStage === 'error' || !!error

  // Track elapsed time
  useEffect(() => {
    if (isComplete || hasError || !isLoading) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isComplete, hasError, isLoading, startTime])

  const completedSet = new Set(completedStages)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {language === 'ko' ? '생성 진행 상황' : 'Generation Progress'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedStages.length}/{STAGE_ORDER.length} {language === 'ko' ? '단계' : 'stages'}
            </Badge>
            <Badge
              variant={isComplete ? 'default' : hasError ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {isComplete
                ? language === 'ko' ? '완료' : 'Complete'
                : hasError
                ? language === 'ko' ? '오류' : 'Error'
                : language === 'ko' ? '진행 중' : 'In Progress'}
            </Badge>
            {isLoading && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                {language === 'ko' ? '취소' : 'Cancel'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {language === 'ko' ? '전체 진행률' : 'Overall Progress'}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Time Tracking */}
        <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
          <span className="text-muted-foreground">
            {language === 'ko' ? '경과 시간' : 'Elapsed Time'}
          </span>
          <span className="font-mono">{formatTime(elapsedTime)}</span>
        </div>

        {/* Current Stage Message */}
        {isLoading && stageMessage && (
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-center text-primary font-medium">
              {stageMessage}
            </p>
          </div>
        )}

        {/* Stage List */}
        <div className="space-y-1">
          {STAGE_ORDER.map((stage) => {
            const isStageComplete = completedSet.has(stage)
            const isStageActive = currentStage === stage
            const isPending = !isStageComplete && !isStageActive

            return (
              <StageItem
                key={stage}
                stage={stage}
                isActive={isStageActive}
                isComplete={isStageComplete}
                isPending={isPending}
                message={isStageActive ? stageMessage : undefined}
                language={language}
              />
            )
          })}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {hasError && error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
            >
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {language === 'ko' ? '생성 오류' : 'Generation Error'}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Message */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  {language === 'ko'
                    ? `${formatTime(elapsedTime)}만에 모든 단계가 성공적으로 완료되었습니다`
                    : `All stages completed successfully in ${formatTime(elapsedTime)}`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

/**
 * Compact inline progress indicator
 */
export function StreamingProgressInline({
  isLoading,
  progress,
  currentStage,
  stageMessage,
  language = 'ko',
}: Pick<StreamingProgressProps, 'isLoading' | 'progress' | 'currentStage' | 'stageMessage' | 'language'>) {
  const isComplete = currentStage === 'complete'
  const hasError = currentStage === 'error'

  if (isComplete) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
          {language === 'ko' ? '완료' : 'Complete'}
        </span>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400 font-medium">
          {language === 'ko' ? '오류' : 'Error'}
        </span>
      </div>
    )
  }

  if (!isLoading) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <SpinnerGap className="h-4 w-4 animate-spin text-primary" />
      <div className="flex items-center gap-2">
        <Progress value={progress} className="w-24 h-2" />
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      {currentStage && (
        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
          {getStageIcon(currentStage)} {stageMessage || STAGE_LABELS[currentStage][language]}
        </span>
      )}
    </div>
  )
}
