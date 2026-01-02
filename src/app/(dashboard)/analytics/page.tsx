'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ChartBar,
  TrendUp,
  TrendDown,
  Target,
  Lightning,
  Tag,
  Folder,
  ArrowClockwise,
  Warning,
  Medal,
  CalendarBlank,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  summary: {
    totalGenerations: number
    avgScore: number
    highQualityRate: number
    thisMonthCount: number
    lastMonthCount: number
    momChange: number
    thisMonthAvg: number
    lastMonthAvg: number
    scoreImprovement: number
  }
  scoreDistribution: Array<{ range: string; count: number }>
  scoreTrend: Array<{ date: string; avgScore: number | null; count: number }>
  topKeywords: Array<{ keyword: string; count: number }>
  categoryBreakdown: Array<{ category: string; count: number }>
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend === 'up' && <TrendUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendDown className="h-3 w-3 text-red-500" />}
            {trendValue && (
              <span className={cn(
                trend === 'up' && 'text-green-500',
                trend === 'down' && 'text-red-500'
              )}>
                {trendValue}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreDistributionChart({ data }: { data: Array<{ range: string; count: number }> }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.range} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.range}</span>
            <span className="font-medium">{item.count}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', colors[i])}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoreTrendChart({ data }: { data: Array<{ date: string; avgScore: number | null; count: number }> }) {
  const scores = data.map(d => d.avgScore).filter((s): s is number => s !== null)
  const maxScore = Math.max(...scores, 100)
  const minScore = Math.min(...scores, 0)
  const range = maxScore - minScore || 1

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {data.map((day, i) => {
          const hasData = day.avgScore !== null
          const height = hasData && day.avgScore !== null ? ((day.avgScore - minScore) / range) * 100 : 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all',
                  hasData ? 'bg-primary/80 hover:bg-primary' : 'bg-muted'
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
                title={hasData ? `${day.date}: ${day.avgScore} avg (${day.count} gen)` : `${day.date}: No data`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function KeywordCloud({ keywords }: { keywords: Array<{ keyword: string; count: number }> }) {
  const maxCount = Math.max(...keywords.map(k => k.count), 1)

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw) => {
        const intensity = Math.min(kw.count / maxCount, 1)
        return (
          <Badge
            key={kw.keyword}
            variant="secondary"
            className={cn(
              'transition-all',
              intensity > 0.7 && 'bg-primary/20 border-primary/30',
              intensity > 0.4 && intensity <= 0.7 && 'bg-primary/10'
            )}
          >
            {kw.keyword}
            <span className="ml-1 text-muted-foreground">({kw.count})</span>
          </Badge>
        )
      })}
    </div>
  )
}

function CategoryBreakdown({ categories }: { categories: Array<{ category: string; count: number }> }) {
  const total = categories.reduce((sum, c) => sum + c.count, 0)
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-green-500',
  ]

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
        {categories.map((cat, i) => (
          <div
            key={cat.category}
            className={cn('h-full transition-all', colors[i % colors.length])}
            style={{ width: `${(cat.count / total) * 100}%` }}
            title={`${cat.category}: ${cat.count} (${Math.round((cat.count / total) * 100)}%)`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat, i) => (
          <div key={cat.category} className="flex items-center gap-2 text-sm">
            <div className={cn('w-3 h-3 rounded-sm', colors[i % colors.length])} />
            <span className="truncate flex-1">{cat.category}</span>
            <span className="text-muted-foreground">{cat.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analytics')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(t.analytics.errors.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.analytics.title}</h1>
          <p className="text-muted-foreground">{t.analytics.subtitle}</p>
        </div>
        <AnalyticsSkeleton />
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.analytics.title}</h1>
          <p className="text-muted-foreground">{t.analytics.subtitle}</p>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.analytics.errors.retry}</p>
            </div>
            <Button onClick={fetchAnalytics} variant="outline" className="gap-2">
              <ArrowClockwise className="h-4 w-4" />
              {t.common.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { summary } = analytics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.analytics.title}</h1>
          <p className="text-muted-foreground">{t.analytics.subtitle}</p>
        </div>
        <Button variant="outline" onClick={fetchAnalytics} className="gap-2">
          <ArrowClockwise className="h-4 w-4" />
          {t.common.refresh}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.analytics.stats.averageGeoScore}
          value={summary.avgScore}
          description={t.analytics.stats.acrossAllGenerations}
          icon={Target}
          trend={summary.scoreImprovement > 0 ? 'up' : summary.scoreImprovement < 0 ? 'down' : 'neutral'}
          trendValue={summary.scoreImprovement !== 0 ? `${summary.scoreImprovement > 0 ? '+' : ''}${summary.scoreImprovement} ${t.analytics.stats.vsLastMonth}` : undefined}
        />
        <StatCard
          title={t.analytics.stats.highQualityRate}
          value={`${summary.highQualityRate}%`}
          description={t.analytics.stats.scoreThreshold}
          icon={Medal}
          trend={summary.highQualityRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title={t.analytics.stats.thisMonth}
          value={summary.thisMonthCount}
          description={`vs ${summary.lastMonthCount} ${t.analytics.stats.vsLastMonth}`}
          icon={CalendarBlank}
          trend={summary.momChange > 0 ? 'up' : summary.momChange < 0 ? 'down' : 'neutral'}
          trendValue={summary.momChange !== 0 ? `${summary.momChange > 0 ? '+' : ''}${summary.momChange}%` : undefined}
        />
        <StatCard
          title={t.analytics.stats.totalGenerations}
          value={summary.totalGenerations}
          description={t.analytics.stats.allTime}
          icon={Lightning}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ChartBar className="h-4 w-4" />
              {t.analytics.charts.scoreTrend}
            </CardTitle>
            <CardDescription>{t.analytics.charts.dailyAvgGeoScores}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.scoreTrend.some(d => d.avgScore !== null) ? (
              <ScoreTrendChart data={analytics.scoreTrend} />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                {t.analytics.charts.noScoreData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t.analytics.charts.geoScoreDistribution}
            </CardTitle>
            <CardDescription>{t.analytics.charts.geoScoreDistributionDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.scoreDistribution.some(d => d.count > 0) ? (
              <ScoreDistributionChart data={analytics.scoreDistribution} />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                {t.analytics.charts.noScoreData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Keywords and Categories */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t.analytics.charts.topKeywords}
            </CardTitle>
            <CardDescription>{t.analytics.charts.frequentKeywords}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topKeywords.length > 0 ? (
              <KeywordCloud keywords={analytics.topKeywords} />
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                {t.analytics.charts.noKeywordData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Folder className="h-4 w-4" />
              {t.analytics.charts.categoryBreakdown}
            </CardTitle>
            <CardDescription>{t.analytics.charts.categoryBreakdownDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.categoryBreakdown.length > 0 ? (
              <CategoryBreakdown categories={analytics.categoryBreakdown} />
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                {t.analytics.charts.noCategoryData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.analytics.monthly.title}</CardTitle>
          <CardDescription>{t.analytics.monthly.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t.analytics.monthly.thisMonthGenerations}</p>
              <p className="text-2xl font-bold mt-1">{summary.thisMonthCount}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t.analytics.monthly.lastMonthGenerations}</p>
              <p className="text-2xl font-bold mt-1">{summary.lastMonthCount}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t.analytics.monthly.thisMonthAvgScore}</p>
              <p className="text-2xl font-bold mt-1">{summary.thisMonthAvg || '-'}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t.analytics.monthly.lastMonthAvgScore}</p>
              <p className="text-2xl font-bold mt-1">{summary.lastMonthAvg || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
