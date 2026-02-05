'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ClockCounterClockwise,
  ArrowClockwise,
  Spinner,
  Warning,
  Check,
  Eye,
  ArrowsLeftRight,
  CheckCircle,
} from '@phosphor-icons/react'
import type { PromptStage, StagePrompt } from '@/types/prompt-studio'

interface VersionHistoryItem {
  id: string
  version: number
  stage_system_prompt: string | null
  temperature: number
  max_tokens: number
  model: string
  workflow_status: string
  created_at: string
  is_active: boolean
  test_count: number
  avg_quality_score: number | null
}

interface StageVersionHistoryProps {
  stage: PromptStage
  currentVersion: number | null
  language: 'ko' | 'en'
  onRollback: (version: VersionHistoryItem) => void
}

export function StageVersionHistory({
  stage,
  currentVersion,
  language,
  onRollback,
}: StageVersionHistoryProps) {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<VersionHistoryItem | null>(null)
  const [compareVersion, setCompareVersion] = useState<VersionHistoryItem | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  const fetchVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/prompt-studio/stages/${stage}/versions`)
      if (!response.ok) {
        throw new Error('Failed to fetch version history')
      }
      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      console.error('Error fetching versions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [stage])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'testing':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'archived':
        return 'bg-gray-100 text-gray-600 border-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    }
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-sm">
                {language === 'ko' ? '버전 히스토리' : 'Version History'}
              </CardTitle>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={fetchVersions}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowClockwise className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ko' ? '버전 목록 새로고침' : 'Refresh version list'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm mb-3">
              <Warning className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {language === 'ko' ? '버전 히스토리가 없습니다' : 'No version history'}
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors cursor-pointer',
                      version.version === currentVersion
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    )}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">v{version.version}</span>
                        {version.version === currentVersion && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] border-primary text-primary">
                                {language === 'ko' ? '현재' : 'Current'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{language === 'ko' ? '현재 활성화된 프롬프트 버전' : 'Currently active prompt version'}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px]', getStatusColor(version.workflow_status))}
                            >
                              {version.workflow_status}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{language === 'ko' ? '버전 상태: active=운영중, testing=테스트중, archived=보관됨' : 'Version status: active=live, testing=in test, archived=stored'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(version.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {language === 'ko' ? '테스트' : 'Tests'}: {version.test_count}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{language === 'ko' ? '이 버전으로 실행된 테스트 횟수' : 'Number of tests run with this version'}</p>
                        </TooltipContent>
                      </Tooltip>
                      {version.avg_quality_score != null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              {language === 'ko' ? '평균 점수' : 'Avg Score'}:{' '}
                              {version.avg_quality_score.toFixed(0)}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{language === 'ko' ? '이 버전의 테스트 평균 품질 점수' : 'Average test quality score for this version'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span>T: {version.temperature.toFixed(2)}</span>
                      <span>{version.max_tokens} tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Version Detail Dialog */}
          <Dialog open={!!selectedVersion} onOpenChange={(open) => !open && setSelectedVersion(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ko' ? '버전' : 'Version'} {selectedVersion?.version}
                </DialogTitle>
                <DialogDescription>
                  {selectedVersion && formatDate(selectedVersion.created_at)}
                </DialogDescription>
              </DialogHeader>

              {selectedVersion && (
                <div className="space-y-4">
                  {/* Status and metrics */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(getStatusColor(selectedVersion.workflow_status))}
                    >
                      {selectedVersion.workflow_status}
                    </Badge>
                    <Badge variant="outline">
                      {language === 'ko' ? '테스트' : 'Tests'}: {selectedVersion.test_count}
                    </Badge>
                    {selectedVersion.avg_quality_score != null && (
                      <Badge variant="outline">
                        {language === 'ko' ? '점수' : 'Score'}:{' '}
                        {selectedVersion.avg_quality_score.toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  {/* Parameters */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="text-sm font-mono">{selectedVersion.model}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-sm font-mono">{selectedVersion.temperature}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Max Tokens</p>
                      <p className="text-sm font-mono">{selectedVersion.max_tokens}</p>
                    </div>
                  </div>

                  {/* Prompt content */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {language === 'ko' ? '스테이지 프롬프트' : 'Stage Prompt'}
                    </p>
                    <pre className="text-xs font-mono bg-muted p-3 rounded-lg whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {selectedVersion.stage_system_prompt || (
                        <span className="text-muted-foreground italic">
                          {language === 'ko' ? '(기본 프롬프트 사용)' : '(Using default prompt)'}
                        </span>
                      )}
                    </pre>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {selectedVersion && selectedVersion.version !== currentVersion && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCompareVersion(selectedVersion)
                          setShowCompare(true)
                        }}
                      >
                        <ArrowsLeftRight className="h-4 w-4 mr-1" />
                        {language === 'ko' ? '현재와 비교' : 'Compare with Current'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {language === 'ko'
                          ? '현재 활성 버전과 이 버전의 프롬프트를 나란히 비교'
                          : 'Compare this version\'s prompt side-by-side with current'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {selectedVersion && selectedVersion.version !== currentVersion && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          onRollback(selectedVersion)
                          setSelectedVersion(null)
                        }}
                      >
                        <ArrowClockwise className="h-4 w-4 mr-1" />
                        {language === 'ko' ? '이 버전으로 롤백' : 'Rollback to This'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {language === 'ko'
                          ? '이 버전의 프롬프트와 파라미터로 되돌리기 (새 버전으로 저장됨)'
                          : 'Revert to this version\'s prompt & parameters (saved as new version)'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {selectedVersion && selectedVersion.version === currentVersion && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {language === 'ko' ? '현재 버전' : 'Current Version'}
                  </Badge>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Compare Dialog */}
          <Dialog open={showCompare} onOpenChange={setShowCompare}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ko' ? '버전 비교' : 'Version Comparison'}
                </DialogTitle>
                <DialogDescription>
                  v{currentVersion} vs v{compareVersion?.version}
                </DialogDescription>
              </DialogHeader>

              {compareVersion && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Current version */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-primary border-primary">
                        v{currentVersion} ({language === 'ko' ? '현재' : 'Current'})
                      </Badge>
                    </div>
                    <pre className="text-xs font-mono bg-muted p-3 rounded-lg whitespace-pre-wrap h-[300px] overflow-y-auto">
                      {versions.find((v) => v.version === currentVersion)?.stage_system_prompt ||
                        (language === 'ko' ? '(기본 프롬프트 사용)' : '(Using default prompt)')}
                    </pre>
                  </div>

                  {/* Compare version */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{compareVersion.version}</Badge>
                    </div>
                    <pre className="text-xs font-mono bg-muted p-3 rounded-lg whitespace-pre-wrap h-[300px] overflow-y-auto">
                      {compareVersion.stage_system_prompt ||
                        (language === 'ko' ? '(기본 프롬프트 사용)' : '(Using default prompt)')}
                    </pre>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCompare(false)}>
                  {language === 'ko' ? '닫기' : 'Close'}
                </Button>
                {compareVersion && compareVersion.version !== currentVersion && (
                  <Button
                    onClick={() => {
                      onRollback(compareVersion)
                      setShowCompare(false)
                      setSelectedVersion(null)
                    }}
                  >
                    <ArrowClockwise className="h-4 w-4 mr-1" />
                    {language === 'ko' ? 'v' : 'Rollback to v'}
                    {compareVersion.version}
                    {language === 'ko' ? '으로 롤백' : ''}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
