'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { PipelineStage, PipelineProgress as PipelineProgressType } from '@/types/geo-v2'
import { STAGE_PROGRESS_MAP } from '@/types/geo-v2'
import {
  getStageIcon,
  getStageName,
  formatTime,
} from '@/lib/geo-v2/progress'
import {
  SpinnerGap,
  CheckCircle,
  Clock,
  XCircle,
  Hourglass,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface PipelineProgressProps {
  progress: PipelineProgressType[]
  currentStage?: PipelineStage | null
  isComplete?: boolean
  hasError?: boolean
  errorMessage?: string
}

const PIPELINE_ORDER: PipelineStage[] = [
  'description',
  'usp_extraction',
  'chapters',
  'faq',
  'step_by_step',
  'case_studies',
  'keywords',
  'grounding_aggregation',
]

function StageItem({
  stage,
  progress,
  isActive,
  isComplete,
  isError,
  showParallel,
}: {
  stage: PipelineStage
  progress?: PipelineProgressType
  isActive: boolean
  isComplete: boolean
  isError: boolean
  showParallel?: boolean
}) {
  const icon = getStageIcon(stage)
  const name = getStageName(stage, 'ko')
  const stageConfig = STAGE_PROGRESS_MAP[stage]

  const getStatusIcon = () => {
    if (isError) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (isComplete) {
      return <CheckCircle className="h-4 w-4 text-[#040523] dark:text-slate-200" />
    }
    if (isActive) {
      return <SpinnerGap className="h-4 w-4 text-[#040523] dark:text-slate-200 animate-spin" />
    }
    return <Hourglass className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        isActive && 'bg-[#040523]/10 dark:bg-[#040523]/30',
        isComplete && 'bg-[#040523]/5 dark:bg-[#040523]/20',
        isError && 'bg-red-50 dark:bg-red-950/30'
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
          <span className="text-sm font-medium">{name}</span>
          {showParallel && (
            <Badge variant="outline" className="text-xs">
              병렬 실행
            </Badge>
          )}
        </div>
        {isActive && progress?.message && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {progress.message}
          </p>
        )}
      </div>

      {/* Progress Percentage */}
      <div className="text-right">
        <span className={cn(
          'text-xs font-medium',
          isActive ? 'text-[#040523] dark:text-slate-200' : 'text-muted-foreground'
        )}>
          {stageConfig.percentage}%
        </span>
      </div>
    </motion.div>
  )
}

export function PipelineProgress({
  progress,
  currentStage,
  isComplete,
  hasError,
  errorMessage,
}: PipelineProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  // Track elapsed time
  useEffect(() => {
    if (isComplete || hasError) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isComplete, hasError, startTime])

  // Calculate overall progress
  const completedStages = progress.filter((p) => p.completedAt).length
  const overallProgress = isComplete
    ? 100
    : currentStage
    ? STAGE_PROGRESS_MAP[currentStage]?.percentage || 0
    : 0

  // Determine which stages are complete
  const completedStageSet = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.stage)
  )

  // Group parallel stages
  const parallelGroups: { stages: PipelineStage[], parallel: boolean }[] = [
    { stages: ['description'], parallel: false },
    { stages: ['usp_extraction'], parallel: false },
    { stages: ['chapters', 'faq'], parallel: true },
    { stages: ['step_by_step', 'case_studies'], parallel: true },
    { stages: ['keywords'], parallel: false },
    { stages: ['grounding_aggregation'], parallel: false },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            파이프라인 진행 상황
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedStages}/{PIPELINE_ORDER.length} 단계
            </Badge>
            <Badge
              variant={isComplete ? 'default' : hasError ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {isComplete ? '완료' : hasError ? '오류' : '진행 중'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">전체 진행률</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Time Tracking */}
        <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
          <span className="text-muted-foreground">경과 시간</span>
          <span className="font-mono">{formatTime(elapsedTime)}</span>
        </div>

        {/* Stage List */}
        <div className="space-y-2">
          {parallelGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.parallel && group.stages.length > 1 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 border-t border-dashed" />
                  <span className="text-xs text-muted-foreground">
                    병렬 실행
                  </span>
                  <div className="flex-1 border-t border-dashed" />
                </div>
              )}
              <div className={cn(
                group.parallel && group.stages.length > 1 && 'pl-4 border-l-2 border-[#040523]/20 dark:border-slate-600 space-y-1'
              )}>
                {group.stages.map((stage) => {
                  const stageProgress = progress.find((p) => p.stage === stage)
                  const isStageComplete = completedStageSet.has(stage)
                  const isStageActive = currentStage === stage
                  const isStageError = !!(hasError && currentStage === stage)

                  return (
                    <StageItem
                      key={stage}
                      stage={stage}
                      progress={stageProgress}
                      isActive={isStageActive}
                      isComplete={isStageComplete}
                      isError={isStageError}
                      showParallel={group.parallel && group.stages.length > 1}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {hasError && errorMessage && (
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
                    파이프라인 오류
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {errorMessage}
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
              className="p-3 rounded-lg bg-[#040523]/5 dark:bg-[#040523]/20 border border-[#040523]/20 dark:border-slate-600"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#040523] dark:text-slate-200" />
                <p className="text-sm font-medium text-[#040523] dark:text-slate-200">
                  {formatTime(elapsedTime)}만에 모든 단계가 성공적으로 완료되었습니다
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
 * Compact inline progress indicator for use in headers/toolbars
 */
export function PipelineProgressInline({
  progress,
  currentStage,
  isComplete,
}: Pick<PipelineProgressProps, 'progress' | 'currentStage' | 'isComplete'>) {
  const overallProgress = isComplete
    ? 100
    : currentStage
    ? STAGE_PROGRESS_MAP[currentStage]?.percentage || 0
    : 0

  if (isComplete) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-[#040523] dark:text-slate-200" />
        <span className="text-sm text-[#040523] dark:text-slate-200 font-medium">완료</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <SpinnerGap className="h-4 w-4 animate-spin text-[#040523] dark:text-slate-200" />
      <div className="flex items-center gap-2">
        <Progress value={overallProgress} className="w-24 h-2" />
        <span className="text-xs text-muted-foreground">{overallProgress}%</span>
      </div>
      {currentStage && (
        <span className="text-xs text-muted-foreground">
          {getStageIcon(currentStage)} {getStageName(currentStage, 'ko')}
        </span>
      )}
    </div>
  )
}
