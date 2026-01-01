'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTuningStore, selectPromptsByEngine } from '@/stores/tuning-store'
import { DiffViewer } from '@/components/tuning/prompt-manager/diff-viewer'
import {
  ArrowLeft,
  ChartLine,
  GitDiff,
  Scales,
  ListChecks,
  Warning,
  ArrowClockwise,
  TrendUp,
  TrendDown,
  Equals,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Lightning,
  Code,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { PromptVersion, BatchJob, Engine } from '@/types/tuning'

type TabValue = 'overview' | 'prompts' | 'weights' | 'batches'

interface WeightConfig {
  usp_coverage: number
  grounding_score: number
  semantic_similarity: number
  anti_fabrication: number
  keyword_density: number
  structure_quality: number
}

const weightLabels: Record<keyof WeightConfig, string> = {
  usp_coverage: 'USP Coverage',
  grounding_score: 'Grounding Score',
  semantic_similarity: 'Semantic Similarity',
  anti_fabrication: 'Anti-Fabrication',
  keyword_density: 'Keyword Density',
  structure_quality: 'Structure Quality',
}

const ENGINE_COLORS: Record<Engine, string> = {
  gemini: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  perplexity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cohere: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const STATUS_COLORS: Record<BatchJob['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_ICONS: Record<BatchJob['status'], React.ReactNode> = {
  pending: <Clock className="h-4 w-4" weight="duotone" />,
  running: <Lightning className="h-4 w-4" weight="duotone" />,
  paused: <Pause className="h-4 w-4" weight="duotone" />,
  completed: <CheckCircle className="h-4 w-4" weight="duotone" />,
  failed: <XCircle className="h-4 w-4" weight="duotone" />,
}

export default function AnalysisPage() {
  const {
    prompts,
    weights,
    batchJobs,
    isLoading,
    error,
    fetchPrompts,
    fetchWeights,
    fetchBatchJobs,
  } = useTuningStore()

  const [activeTab, setActiveTab] = useState<TabValue>('overview')
  const [selectedEngine, setSelectedEngine] = useState<Engine | 'all'>('all')
  const [compareLeft, setCompareLeft] = useState<PromptVersion | null>(null)
  const [compareRight, setCompareRight] = useState<PromptVersion | null>(null)
  const [compareWeightLeft, setCompareWeightLeft] = useState<string | null>(null)
  const [compareWeightRight, setCompareWeightRight] = useState<string | null>(null)

  useEffect(() => {
    fetchPrompts()
    fetchWeights()
    fetchBatchJobs()
  }, [fetchPrompts, fetchWeights, fetchBatchJobs])

  // Auto-select prompts for comparison when available
  useEffect(() => {
    if (prompts.length >= 2 && !compareLeft && !compareRight) {
      const sortedPrompts = [...prompts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setCompareRight(sortedPrompts[0])
      if (sortedPrompts.length > 1) {
        setCompareLeft(sortedPrompts[1])
      }
    }
  }, [prompts, compareLeft, compareRight])

  // Auto-select weights for comparison
  useEffect(() => {
    if (weights.length >= 2 && !compareWeightLeft && !compareWeightRight) {
      setCompareWeightLeft(weights[0].id)
      setCompareWeightRight(weights[1].id)
    }
  }, [weights, compareWeightLeft, compareWeightRight])

  // Filtered prompts by engine
  const filteredPrompts = useMemo(() => {
    if (selectedEngine === 'all') return prompts
    return prompts.filter((p) => p.engine === selectedEngine)
  }, [prompts, selectedEngine])

  // Statistics
  const stats = useMemo(() => {
    const activePrompt = prompts.find((p) => p.is_active)
    const activeWeight = weights.find((w) => w.is_active)
    const completedJobs = batchJobs.filter((j) => j.status === 'completed')
    const runningJobs = batchJobs.filter((j) => j.status === 'running')
    const failedJobs = batchJobs.filter((j) => j.status === 'failed')

    const totalItems = batchJobs.reduce((sum, j) => sum + (j.total_items || 0), 0)
    const processedItems = batchJobs.reduce((sum, j) => sum + (j.processed_items || 0), 0)
    const successfulItems = batchJobs.reduce((sum, j) => sum + ((j.processed_items || 0) - (j.failed_items || 0)), 0)
    const failedItems = batchJobs.reduce((sum, j) => sum + (j.failed_items || 0), 0)

    const successRate = processedItems > 0 ? (successfulItems / processedItems) * 100 : 0

    // Engine distribution
    const engineCounts: Record<Engine, number> = { gemini: 0, perplexity: 0, cohere: 0 }
    prompts.forEach((p) => {
      if (p.engine in engineCounts) {
        engineCounts[p.engine as Engine]++
      }
    })

    return {
      totalPrompts: prompts.length,
      activePrompt,
      totalWeights: weights.length,
      activeWeight,
      totalJobs: batchJobs.length,
      completedJobs: completedJobs.length,
      runningJobs: runningJobs.length,
      failedJobs: failedJobs.length,
      totalItems,
      processedItems,
      successfulItems,
      failedItems,
      successRate,
      engineCounts,
    }
  }, [prompts, weights, batchJobs])

  // Weight comparison data
  const weightComparisonData = useMemo(() => {
    const left = weights.find((w) => w.id === compareWeightLeft)
    const right = weights.find((w) => w.id === compareWeightRight)
    if (!left || !right) return null

    const leftWeights = left.weights as unknown as WeightConfig
    const rightWeights = right.weights as unknown as WeightConfig

    return Object.keys(weightLabels).map((key) => {
      const k = key as keyof WeightConfig
      const leftVal = leftWeights[k] || 0
      const rightVal = rightWeights[k] || 0
      const diff = rightVal - leftVal

      return {
        key: k,
        label: weightLabels[k],
        left: leftVal,
        right: rightVal,
        diff,
      }
    })
  }, [weights, compareWeightLeft, compareWeightRight])

  const handleVersionChange = useCallback(
    (side: 'left' | 'right', version: PromptVersion) => {
      if (side === 'left') {
        setCompareLeft(version)
      } else {
        setCompareRight(version)
      }
    },
    []
  )

  // Loading state
  if (isLoading && prompts.length === 0 && weights.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tuning Analysis</h1>
            <p className="text-muted-foreground">Analyze prompts, weights, and batch results</p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" weight="duotone" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check your connection and try again
              </p>
            </div>
            <Button
              onClick={() => {
                fetchPrompts()
                fetchWeights()
                fetchBatchJobs()
              }}
              variant="outline"
              className="gap-2"
            >
              <ArrowClockwise className="h-4 w-4" weight="bold" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tuning Analysis</h1>
            <p className="text-muted-foreground">
              Analyze prompts, weights, and batch results
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview" className="gap-2">
            <ChartLine className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <GitDiff className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="weights" className="gap-2">
            <Scales className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Weights</span>
          </TabsTrigger>
          <TabsTrigger value="batches" className="gap-2">
            <ListChecks className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Batches</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" weight="duotone" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPrompts}</div>
                {stats.activePrompt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Active: {stats.activePrompt.name}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Weight Configs</CardTitle>
                <Scales className="h-4 w-4 text-muted-foreground" weight="duotone" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWeights}</div>
                {stats.activeWeight && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Active: {stats.activeWeight.name}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Batch Jobs</CardTitle>
                <ListChecks className="h-4 w-4 text-muted-foreground" weight="duotone" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalJobs}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600">
                    {stats.completedJobs} completed
                  </span>
                  {stats.runningJobs > 0 && (
                    <span className="text-xs text-blue-600">
                      {stats.runningJobs} running
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendUp className="h-4 w-4 text-muted-foreground" weight="duotone" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                <Progress value={stats.successRate} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Engine Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Engine Distribution</CardTitle>
              <CardDescription>Prompts by AI engine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {(Object.keys(stats.engineCounts) as Engine[]).map((engine) => (
                  <div
                    key={engine}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={cn('text-xs', ENGINE_COLORS[engine])}>
                        {engine}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{stats.engineCounts[engine]}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Processing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Summary</CardTitle>
              <CardDescription>Batch job item statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{stats.totalItems}</div>
                    <div className="text-xs text-muted-foreground">Total Items</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{stats.processedItems}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.successfulItems}
                    </div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.failedItems}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Comparison Tab */}
        <TabsContent value="prompts" className="mt-6 space-y-6">
          {/* Engine Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Prompt Comparison</CardTitle>
                  <CardDescription>Compare prompt versions side by side</CardDescription>
                </div>
                <Select
                  value={selectedEngine}
                  onValueChange={(v) => setSelectedEngine(v as Engine | 'all')}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All engines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Engines</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                    <SelectItem value="cohere">Cohere</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {/* Diff Viewer */}
          {filteredPrompts.length >= 2 ? (
            <DiffViewer
              leftVersion={compareLeft}
              rightVersion={compareRight}
              versions={filteredPrompts}
              onVersionChange={handleVersionChange}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <GitDiff className="h-12 w-12 text-muted-foreground/50" weight="duotone" />
                <div className="text-center">
                  <p className="font-medium">Not enough prompts to compare</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create at least two prompts to enable comparison
                  </p>
                </div>
                <Button asChild>
                  <Link href="/tuning/prompts?action=new">Create Prompt</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Prompt List */}
          <Card>
            <CardHeader>
              <CardTitle>All Prompts ({filteredPrompts.length})</CardTitle>
              <CardDescription>Click to select for comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors',
                      (compareLeft?.id === prompt.id || compareRight?.id === prompt.id) &&
                        'border-primary bg-primary/5',
                      'hover:bg-muted/50'
                    )}
                    onClick={() => {
                      if (compareLeft?.id === prompt.id) {
                        setCompareLeft(null)
                      } else if (compareRight?.id === prompt.id) {
                        setCompareRight(null)
                      } else if (!compareLeft) {
                        setCompareLeft(prompt)
                      } else if (!compareRight) {
                        setCompareRight(prompt)
                      } else {
                        setCompareLeft(compareRight)
                        setCompareRight(prompt)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={cn('text-xs', ENGINE_COLORS[prompt.engine as Engine])}>
                        {prompt.engine}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{prompt.name}</span>
                          {prompt.is_active && (
                            <CheckCircle className="h-4 w-4 text-primary" weight="fill" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">v{prompt.version}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {compareLeft?.id === prompt.id && (
                        <Badge variant="outline" className="text-xs">
                          Left
                        </Badge>
                      )}
                      {compareRight?.id === prompt.id && (
                        <Badge variant="outline" className="text-xs">
                          Right
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weights Comparison Tab */}
        <TabsContent value="weights" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weight Comparison</CardTitle>
              <CardDescription>Compare weight configurations side by side</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Configuration A</label>
                  <Select
                    value={compareWeightLeft || ''}
                    onValueChange={(v) => setCompareWeightLeft(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {weights.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} (v{w.version})
                          {w.is_active && ' - Active'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Configuration B</label>
                  <Select
                    value={compareWeightRight || ''}
                    onValueChange={(v) => setCompareWeightRight(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {weights.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} (v{w.version})
                          {w.is_active && ' - Active'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comparison Table */}
              {weightComparisonData ? (
                <div className="rounded-lg border">
                  <div className="grid grid-cols-4 gap-4 border-b bg-muted/50 p-3 text-sm font-medium">
                    <div>Metric</div>
                    <div className="text-center">
                      {weights.find((w) => w.id === compareWeightLeft)?.name || 'Config A'}
                    </div>
                    <div className="text-center">
                      {weights.find((w) => w.id === compareWeightRight)?.name || 'Config B'}
                    </div>
                    <div className="text-center">Difference</div>
                  </div>
                  <div className="divide-y">
                    {weightComparisonData.map((row) => (
                      <div key={row.key} className="grid grid-cols-4 gap-4 p-3 text-sm">
                        <div className="text-muted-foreground">{row.label}</div>
                        <div className="text-center font-mono">
                          {(row.left * 100).toFixed(0)}%
                        </div>
                        <div className="text-center font-mono">
                          {(row.right * 100).toFixed(0)}%
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          {row.diff === 0 ? (
                            <Equals className="h-4 w-4 text-muted-foreground" weight="bold" />
                          ) : row.diff > 0 ? (
                            <>
                              <TrendUp className="h-4 w-4 text-green-600" weight="bold" />
                              <span className="text-green-600 font-mono text-xs">
                                +{(row.diff * 100).toFixed(0)}%
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendDown className="h-4 w-4 text-red-600" weight="bold" />
                              <span className="text-red-600 font-mono text-xs">
                                {(row.diff * 100).toFixed(0)}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : weights.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Scales className="h-12 w-12 text-muted-foreground/50" weight="duotone" />
                  <div className="text-center">
                    <p className="font-medium">Not enough weight configurations</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create at least two configurations to enable comparison
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/tuning/weights?action=new">Create Config</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Scales className="h-12 w-12 text-muted-foreground/50" weight="duotone" />
                  <p className="text-sm text-muted-foreground">
                    Select two configurations to compare
                  </p>
                </div>
              )}

              {/* Visual Comparison */}
              {weightComparisonData && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Visual Comparison</h4>
                  {weightComparisonData.map((row) => (
                    <div key={row.key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-xs text-muted-foreground">A</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${row.left * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-mono text-xs">
                            {(row.left * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-xs text-muted-foreground">B</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${row.right * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-mono text-xs">
                            {(row.right * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches" className="mt-6 space-y-6">
          {/* Batch Summary */}
          <div className="grid gap-4 md:grid-cols-5">
            {(['pending', 'running', 'paused', 'completed', 'failed'] as const).map((status) => {
              const count = batchJobs.filter((j) => j.status === status).length
              return (
                <Card key={status}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {STATUS_ICONS[status]}
                        <span className="text-sm font-medium capitalize">{status}</span>
                      </div>
                      <Badge className={cn('text-xs', STATUS_COLORS[status])}>{count}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Batch Jobs</CardTitle>
              <CardDescription>Latest batch processing results</CardDescription>
            </CardHeader>
            <CardContent>
              {batchJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <ListChecks className="h-12 w-12 text-muted-foreground/50" weight="duotone" />
                  <div className="text-center">
                    <p className="font-medium">No batch jobs</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Run a batch job to see results here
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/tuning/batch">Go to Batch Runner</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {batchJobs.slice(0, 10).map((job) => {
                    const progress =
                      job.total_items > 0
                        ? ((job.processed_items || 0) / job.total_items) * 100
                        : 0
                    const successRate =
                      (job.processed_items || 0) > 0
                        ? ((job.successful_items || 0) / (job.processed_items || 1)) * 100
                        : 0

                    return (
                      <div key={job.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={cn('text-xs', STATUS_COLORS[job.status])}>
                              <span className="flex items-center gap-1">
                                {STATUS_ICONS[job.status]}
                                {job.status}
                              </span>
                            </Badge>
                            <span className="font-medium">{job.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(job.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-mono">
                              {job.processed_items || 0} / {job.total_items}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-green-600">
                            {job.successful_items || 0} successful
                          </span>
                          <span className="text-red-600">{job.failed_items || 0} failed</span>
                          <span className="text-muted-foreground">
                            {successRate.toFixed(1)}% success rate
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
