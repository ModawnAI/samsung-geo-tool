'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sliders,
  FileArrowUp,
  Code,
  Scales,
  Queue,
  ArrowRight,
  CheckCircle,
  Clock,
  Warning,
  ArrowClockwise,
} from '@phosphor-icons/react'
import { useTuningStore } from '@/stores/tuning-store'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

interface QuickStatProps {
  title: string
  value: number | string
  description: string
  icon: React.ElementType
  href: string
  status?: 'success' | 'warning' | 'neutral'
}

function QuickStat({ title, value, description, icon: Icon, href, status = 'neutral' }: QuickStatProps) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />}
            {status === 'warning' && <Warning className="h-4 w-4 text-amber-500" weight="fill" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function TuningModule({
  title,
  description,
  icon: Icon,
  href,
  stats,
  actions,
  openLabel,
}: {
  title: string
  description: string
  icon: React.ElementType
  href: string
  stats?: { label: string; value: string | number }[]
  actions?: { label: string; href: string }[]
  openLabel: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={href} className="gap-1">
              {openLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      {(stats || actions) && (
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {stats.map((stat, i) => (
                <div key={i} className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-lg font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
          {actions && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, i) => (
                <Button key={i} variant="outline" size="sm" asChild>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function TuningSkeleton() {
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
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function TuningPage() {
  const { t } = useTranslation()
  const { prompts, weights, batchJobs, isLoading, error, fetchPrompts, fetchWeights, fetchBatchJobs } = useTuningStore()

  useEffect(() => {
    fetchPrompts()
    fetchWeights()
    fetchBatchJobs()
  }, [fetchPrompts, fetchWeights, fetchBatchJobs])

  const activePrompts = prompts.filter((p) => p.is_active).length
  const activeWeights = weights.filter((w) => w.is_active).length
  const runningJobs = batchJobs.filter((j) => j.status === 'running').length
  const pendingJobs = batchJobs.filter((j) => j.status === 'pending').length

  if (isLoading && prompts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.tuning.console.title}</h1>
            <p className="text-muted-foreground">{t.tuning.console.subtitle}</p>
          </div>
        </div>
        <TuningSkeleton />
      </div>
    )
  }

  if (error && prompts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.tuning.console.title}</h1>
            <p className="text-muted-foreground">{t.tuning.console.subtitle}</p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.tuning.console.connectionError}</p>
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
              <ArrowClockwise className="h-4 w-4" />
              {t.tuning.console.retry}
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
        <div>
          <h1 className="text-2xl font-bold">{t.tuning.console.title}</h1>
          <p className="text-muted-foreground">{t.tuning.console.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/tuning/upload">
              <FileArrowUp className="h-4 w-4 mr-2" />
              {t.tuning.console.bulkUpload}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tuning/batch">
              <Queue className="h-4 w-4 mr-2" />
              {t.tuning.console.runBatch}
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          title={t.tuning.quickStats.activePrompts}
          value={activePrompts}
          description={`${prompts.length} ${t.tuning.quickStats.totalVersions}`}
          icon={Code}
          href="/tuning/prompts"
          status={activePrompts > 0 ? 'success' : 'warning'}
        />
        <QuickStat
          title={t.tuning.quickStats.activeWeights}
          value={activeWeights}
          description={`${weights.length} ${t.tuning.quickStats.weightConfigs}`}
          icon={Scales}
          href="/tuning/weights"
          status={activeWeights > 0 ? 'success' : 'warning'}
        />
        <QuickStat
          title={t.tuning.quickStats.runningJobs}
          value={runningJobs}
          description={`${pendingJobs} ${t.tuning.quickStats.pendingJobs}`}
          icon={Queue}
          href="/tuning/batch"
          status={runningJobs > 0 ? 'warning' : 'neutral'}
        />
        <QuickStat
          title={t.tuning.quickStats.totalJobs}
          value={batchJobs.length}
          description={t.tuning.quickStats.batchOperations}
          icon={Clock}
          href="/tuning/batch"
        />
      </div>

      {/* Module Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TuningModule
          title={t.tuning.modules.uploadTitle}
          description={t.tuning.modules.uploadDesc}
          icon={FileArrowUp}
          href="/tuning/upload"
          openLabel={t.tuning.console.open}
          stats={[
            { label: t.tuning.modules.products, value: '-' },
            { label: t.tuning.modules.briefs, value: '-' },
            { label: t.tuning.modules.keywords, value: '-' },
          ]}
          actions={[
            { label: t.tuning.modules.uploadCsv, href: '/tuning/upload?type=csv' },
            { label: t.tuning.modules.uploadJson, href: '/tuning/upload?type=json' },
          ]}
        />

        <TuningModule
          title={t.tuning.modules.promptsTitle}
          description={t.tuning.modules.promptsDesc}
          icon={Code}
          href="/tuning/prompts"
          openLabel={t.tuning.console.open}
          stats={[
            { label: t.tuning.modules.gemini, value: prompts.filter((p) => p.engine === 'gemini').length },
            { label: t.tuning.modules.perplexity, value: prompts.filter((p) => p.engine === 'perplexity').length },
            { label: t.tuning.modules.cohere, value: prompts.filter((p) => p.engine === 'cohere').length },
          ]}
          actions={[
            { label: t.tuning.modules.newPrompt, href: '/tuning/prompts?action=new' },
            { label: t.tuning.modules.compareVersions, href: '/tuning/prompts?action=compare' },
          ]}
        />

        <TuningModule
          title={t.tuning.modules.weightsTitle}
          description={t.tuning.modules.weightsDesc}
          icon={Scales}
          href="/tuning/weights"
          openLabel={t.tuning.console.open}
          stats={[
            { label: t.tuning.modules.active, value: activeWeights },
            { label: t.tuning.modules.total, value: weights.length },
            { label: t.tuning.modules.validated, value: '-' },
          ]}
          actions={[
            { label: t.tuning.modules.newConfig, href: '/tuning/weights?action=new' },
            { label: t.tuning.modules.abTest, href: '/tuning/weights?action=test' },
          ]}
        />

        <TuningModule
          title={t.tuning.modules.batchTitle}
          description={t.tuning.modules.batchDesc}
          icon={Queue}
          href="/tuning/batch"
          openLabel={t.tuning.console.open}
          stats={[
            { label: t.tuning.recentJobs.running, value: runningJobs },
            { label: t.tuning.recentJobs.pending, value: pendingJobs },
            { label: t.tuning.recentJobs.completed, value: batchJobs.filter((j) => j.status === 'completed').length },
          ]}
          actions={[
            { label: t.tuning.modules.newJob, href: '/tuning/batch?action=new' },
            { label: t.tuning.modules.viewQueue, href: '/tuning/batch?view=queue' },
          ]}
        />
      </div>

      {/* Recent Activity */}
      {batchJobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t.tuning.recentJobs.title}</CardTitle>
              <CardDescription>{t.tuning.recentJobs.subtitle}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tuning/batch" className="gap-1">
                {t.tuning.recentJobs.viewAll}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  href={`/tuning/batch/${job.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        job.status === 'completed' && 'bg-green-100',
                        job.status === 'running' && 'bg-blue-100',
                        job.status === 'pending' && 'bg-muted',
                        job.status === 'failed' && 'bg-red-100',
                        job.status === 'paused' && 'bg-amber-100'
                      )}
                    >
                      {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />}
                      {job.status === 'running' && <ArrowClockwise className="h-4 w-4 text-blue-600 animate-spin" />}
                      {job.status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {job.status === 'failed' && <Warning className="h-4 w-4 text-red-600" weight="fill" />}
                      {job.status === 'paused' && <Clock className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{job.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.processed_items}/{job.total_items} {t.tuning.recentJobs.items}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        job.status === 'completed'
                          ? 'default'
                          : job.status === 'running'
                            ? 'secondary'
                            : job.status === 'failed'
                              ? 'destructive'
                              : 'outline'
                      }
                    >
                      {job.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
