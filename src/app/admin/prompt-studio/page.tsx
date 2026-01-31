'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Star,
  ChatCircle,
  ListNumbers,
  Briefcase,
  Tag,
  Hash,
  ArrowRight,
  Spinner,
  Warning,
  MagnifyingGlass,
  type Icon,
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  STAGE_CONFIG,
  WORKFLOW_STATUS_CONFIG,
  PROMPT_STAGES,
  type PromptStage,
  type StageStatusSummary,
} from '@/types/prompt-studio'

const STAGE_ICONS: Record<PromptStage, Icon> = {
  grounding: MagnifyingGlass,
  description: FileText,
  usp: Star,
  faq: ChatCircle,
  chapters: ListNumbers,
  case_studies: Briefcase,
  keywords: Tag,
  hashtags: Hash,
}

export default function PromptStudioDashboard() {
  const [stages, setStages] = useState<StageStatusSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStageStatus()
  }, [])

  const fetchStageStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/prompt-studio/stages')
      if (!response.ok) {
        throw new Error('Failed to fetch stage status')
      }
      const data = await response.json()
      setStages(data.stages || [])
    } catch (err) {
      console.error('Error fetching stage status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stages')
      // Create placeholder stages if API fails
      setStages(PROMPT_STAGES.map(stage => ({
        stage,
        hasActivePrompt: false,
        workflowStatus: 'draft' as const,
        avgQualityScore: null,
        testCount: 0,
        lastTestedAt: null,
        updatedAt: new Date().toISOString(),
      })))
    } finally {
      setIsLoading(false)
    }
  }

  const getStageStatus = (stage: PromptStage): StageStatusSummary | undefined => {
    return stages.find(s => s.stage === stage)
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
      {error && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
          <CardContent className="flex items-center gap-3 py-4">
            <Warning className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchStageStatus} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PROMPT_STAGES.map((stageId) => {
          const config = STAGE_CONFIG[stageId]
          const status = getStageStatus(stageId)
          const Icon = STAGE_ICONS[stageId]
          const workflowConfig = status
            ? WORKFLOW_STATUS_CONFIG[status.workflowStatus]
            : WORKFLOW_STATUS_CONFIG.draft

          return (
            <Card key={stageId} className="group relative overflow-hidden hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-1 h-full ${config.color}`} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${config.color} bg-opacity-10`}>
                    <Icon className="h-5 w-5 text-current" weight="duotone" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${workflowConfig.bgColor} ${workflowConfig.color} border-0`}
                  >
                    {workflowConfig.label}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{config.label}</CardTitle>
                <CardDescription className="text-xs">{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Score</p>
                    <p className="font-medium">
                      {status?.avgQualityScore != null
                        ? `${status.avgQualityScore.toFixed(1)}%`
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tests</p>
                    <p className="font-medium">{status?.testCount || 0}</p>
                  </div>
                </div>

                {status?.lastTestedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last tested:{' '}
                    {new Date(status.lastTestedAt).toLocaleDateString()}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/admin/prompt-studio/${stageId}`}>
                          Edit
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>프롬프트 내용 편집 및 버전 관리</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/admin/prompt-studio/${stageId}/test`}>
                          Test
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>실제 제품으로 프롬프트 테스트 실행</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
          <CardDescription>Summary of all stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {stages.filter(s => s.workflowStatus === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Prompts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {stages.filter(s => s.workflowStatus === 'testing').length}
              </p>
              <p className="text-sm text-muted-foreground">Testing</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {stages.reduce((sum, s) => sum + (s.testCount || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {(() => {
                  const scoresWithValue = stages.filter(s => s.avgQualityScore != null)
                  if (scoresWithValue.length === 0) return '--'
                  const avg = scoresWithValue.reduce((sum, s) => sum + (s.avgQualityScore || 0), 0) / scoresWithValue.length
                  return `${avg.toFixed(0)}%`
                })()}
              </p>
              <p className="text-sm text-muted-foreground">Avg Quality</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}
