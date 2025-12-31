'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sparkle,
  Check,
  FileText,
  ChartLineUp,
  Clock,
  TrendUp,
  TrendDown,
  ArrowRight,
  Lightning,
  Package,
  Article,
  ArrowClockwise,
  Warning,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { POLLING, ICON_SIZES } from '@/lib/constants/ui'

interface StatsData {
  overview: {
    totalGenerations: number
    todayGenerations: number
    weekGenerations: number
    confirmedGenerations: number
    draftGenerations: number
    totalBriefs: number
    activeBriefs: number
    totalProducts: number
    confirmationRate: number
  }
  weeklyTrend: Array<{
    date: string
    total: number
    confirmed: number
    draft: number
  }>
  topProducts: Array<{
    name: string
    count: number
  }>
  recentActivity: Array<{
    id: string
    status: 'draft' | 'confirmed'
    campaign_tag: string | null
    created_at: string
    products: { name: string } | null
    users: { email: string; name: string | null } | null
  }>
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  href,
}: {
  title: string
  value: number | string
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  href?: string
}) {
  const content = (
    <Card className={cn(href && 'hover:bg-muted/50 transition-colors cursor-pointer')}>
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
            {trendValue && <span className={cn(
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500'
            )}>{trendValue}</span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function MiniBarChart({ data }: { data: Array<{ date: string; total: number }> }) {
  const maxValue = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/80 rounded-sm transition-all hover:bg-primary"
            style={{ height: `${(day.total / maxValue) * 100}%`, minHeight: day.total > 0 ? '4px' : '0' }}
            title={`${day.date}: ${day.total} generations`}
          />
          <span className="text-[10px] text-muted-foreground">{day.date}</span>
        </div>
      ))}
    </div>
  )
}

function StatsSkeleton() {
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
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchStats = useCallback(async (isInitial = false) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    if (isInitial) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await fetch('/api/stats', {
        signal: abortControllerRef.current.signal,
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setStats(data)
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Failed to fetch stats:', err)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats(true)
    // Refresh stats at configured interval
    const interval = setInterval(() => fetchStats(false), POLLING.stats)
    return () => {
      clearInterval(interval)
      // Cancel pending request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchStats])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your content generation activity</p>
          </div>
          <Button asChild>
            <Link href="/generate">
              <Sparkle className={`${ICON_SIZES.sm} mr-2`} />
              New Generation
            </Link>
          </Button>
        </div>
        <StatsSkeleton />
      </div>
    )
  }

  // Error state with retry option
  if (error && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your content generation activity</p>
          </div>
          <Button asChild>
            <Link href="/generate">
              <Sparkle className={`${ICON_SIZES.sm} mr-2`} />
              New Generation
            </Link>
          </Button>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check your connection and try again
              </p>
            </div>
            <Button onClick={() => fetchStats(true)} variant="outline" className="gap-2">
              <ArrowClockwise className={ICON_SIZES.sm} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { overview, weeklyTrend, topProducts, recentActivity } = stats || {
    overview: {
      totalGenerations: 0,
      todayGenerations: 0,
      weekGenerations: 0,
      confirmedGenerations: 0,
      draftGenerations: 0,
      totalBriefs: 0,
      activeBriefs: 0,
      totalProducts: 0,
      confirmationRate: 0,
    },
    weeklyTrend: [],
    topProducts: [],
    recentActivity: [],
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your content generation activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/briefs">
              <FileText className="h-4 w-4 mr-2" />
              Manage Briefs
            </Link>
          </Button>
          <Button asChild>
            <Link href="/generate">
              <Sparkle className="h-4 w-4 mr-2" />
              New Generation
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Generations"
          value={overview.todayGenerations}
          description="generated today"
          icon={Lightning}
          href="/history"
        />
        <StatCard
          title="This Week"
          value={overview.weekGenerations}
          description="last 7 days"
          icon={ChartLineUp}
          trend={overview.weekGenerations > 0 ? 'up' : 'neutral'}
          href="/history"
        />
        <StatCard
          title="Confirmation Rate"
          value={`${overview.confirmationRate}%`}
          description={`${overview.confirmedGenerations} confirmed`}
          icon={Check}
          trend={overview.confirmationRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title="Active Briefs"
          value={overview.activeBriefs}
          description={`of ${overview.totalBriefs} total`}
          icon={Article}
          href="/briefs"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Weekly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Weekly Activity</CardTitle>
            <CardDescription>Generations over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length > 0 ? (
              <MiniBarChart data={weeklyTrend} />
            ) : (
              <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
            <CardDescription>Most generated this month</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {product.name}
                      </span>
                    </div>
                    <Badge variant="secondary">{product.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm text-center py-4">
                No generations yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Generations"
          value={overview.totalGenerations}
          description="all time"
          icon={FileText}
          href="/history"
        />
        <StatCard
          title="Products"
          value={overview.totalProducts}
          description="in database"
          icon={Package}
        />
        <StatCard
          title="Drafts Pending"
          value={overview.draftGenerations}
          description="awaiting confirmation"
          icon={Clock}
          href="/history"
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest content generations</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history" className="gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No generations yet</p>
              <p className="text-sm mt-1">Click &quot;New Generation&quot; to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((gen) => (
                <Link
                  key={gen.id}
                  href={`/generate/${gen.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {gen.status === 'confirmed' ? (
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" weight="bold" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{gen.products?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-muted-foreground">
                        {gen.campaign_tag || 'No campaign'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={gen.status === 'confirmed' ? 'default' : 'secondary'}>
                      {gen.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                    </Badge>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {gen.users?.name || gen.users?.email?.split('@')[0]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(gen.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
