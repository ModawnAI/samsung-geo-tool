'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Queue,
  Plus,
  ArrowLeft,
  DotsThree,
  Play,
  Pause,
  Stop,
  Trash,
  CheckCircle,
  Warning,
  ArrowClockwise,
  Clock,
  Eye,
  Funnel,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { useTuningStore } from '@/stores/tuning-store'
import { cn } from '@/lib/utils'

type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'
type JobType = 'generation' | 'validation' | 'reprocessing'

interface JobFormData {
  name: string
  type: JobType
  config: {
    product_ids?: string[]
    brief_ids?: string[]
    prompt_version_id?: string
    weights_version_id?: string
    batch_size?: number
    concurrent?: number
  }
}

const statusColors: Record<JobStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const statusIcons: Record<JobStatus, React.ElementType> = {
  pending: Clock,
  running: ArrowClockwise,
  paused: Pause,
  completed: CheckCircle,
  failed: Warning,
}

export default function BatchRunnerPage() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const view = searchParams.get('view')

  const { batchJobs, prompts, weights, isLoading, error, fetchBatchJobs, createBatchJob, updateBatchJob, deleteBatchJob } =
    useTuningStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(action === 'new')
  const [viewingJob, setViewingJob] = useState<string | null>(null)
  const [formData, setFormData] = useState<JobFormData>({
    name: '',
    type: 'generation',
    config: {
      batch_size: 10,
      concurrent: 3,
    },
  })
  const [productIdsInput, setProductIdsInput] = useState('')
  const [briefIdsInput, setBriefIdsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchBatchJobs()
    // Poll for running jobs
    const interval = setInterval(() => {
      const hasRunning = batchJobs.some((j) => j.status === 'running')
      if (hasRunning) {
        fetchBatchJobs()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchBatchJobs, batchJobs])

  const filteredJobs = batchJobs.filter((job) => {
    const matchesSearch = job.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by status (running first) then by created_at
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const statusOrder: Record<JobStatus, number> = {
      running: 0,
      pending: 1,
      paused: 2,
      failed: 3,
      completed: 4,
    }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'generation',
      config: {
        batch_size: 10,
        concurrent: 3,
      },
    })
    setProductIdsInput('')
    setBriefIdsInput('')
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const productIds = productIdsInput
        .split(/[\n,]/)
        .map((id) => id.trim())
        .filter(Boolean)
      const briefIds = briefIdsInput
        .split(/[\n,]/)
        .map((id) => id.trim())
        .filter(Boolean)

      const config = {
        ...formData.config,
        product_ids: productIds.length > 0 ? productIds : undefined,
        brief_ids: briefIds.length > 0 ? briefIds : undefined,
      }

      await createBatchJob({
        name: formData.name,
        type: formData.type,
        total_items: productIds.length || briefIds.length || 0,
        config,
      })
      setIsDialogOpen(false)
    } catch {
      // Error handled by store
    } finally {
      setIsSaving(false)
    }
  }

  const handleAction = async (jobId: string, action: 'start' | 'pause' | 'resume' | 'cancel') => {
    const statusMap: Record<string, JobStatus> = {
      start: 'running',
      pause: 'paused',
      resume: 'running',
      cancel: 'failed',
    }
    await updateBatchJob(jobId, { status: statusMap[action] })
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this batch job?')) return
    await deleteBatchJob(jobId)
  }

  const viewedJob = viewingJob ? batchJobs.find((j) => j.id === viewingJob) : null

  if (isLoading && batchJobs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Batch Runner</h1>
            <p className="text-muted-foreground">Run batch operations for bulk content generation</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && batchJobs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Batch Runner</h1>
            <p className="text-muted-foreground">Run batch operations for bulk content generation</p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
            </div>
            <Button onClick={() => fetchBatchJobs()} variant="outline" className="gap-2">
              <ArrowClockwise className="h-4 w-4" />
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
            <h1 className="text-2xl font-bold">Batch Runner</h1>
            <p className="text-muted-foreground">Run batch operations for bulk content generation</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batchJobs.filter((j) => j.status === 'running').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batchJobs.filter((j) => j.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batchJobs.filter((j) => j.status === 'completed').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batchJobs.filter((j) => j.status === 'failed').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <Funnel className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      {sortedJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Queue className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No batch jobs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first batch job'}
              </p>
            </div>
            {!search && statusFilter === 'all' && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Batch Job
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedJobs.map((job) => {
            const StatusIcon = statusIcons[job.status]
            const progress = job.total_items > 0 ? (job.processed_items / job.total_items) * 100 : 0

            return (
              <Card key={job.id} className={cn(job.status === 'running' && 'border-blue-500/50')}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {job.name}
                        <Badge className={statusColors[job.status]}>
                          <StatusIcon
                            className={cn('h-3 w-3 mr-1', job.status === 'running' && 'animate-spin')}
                            weight={job.status === 'completed' ? 'fill' : 'regular'}
                          />
                          {job.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Type: {job.type} | Created: {new Date(job.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <DotsThree className="h-4 w-4" weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingJob(job.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {job.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleAction(job.id, 'start')}>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </DropdownMenuItem>
                        )}
                        {job.status === 'running' && (
                          <DropdownMenuItem onClick={() => handleAction(job.id, 'pause')}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {job.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleAction(job.id, 'resume')}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {(job.status === 'running' || job.status === 'paused') && (
                          <DropdownMenuItem onClick={() => handleAction(job.id, 'cancel')}>
                            <Stop className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive">
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono">
                        {job.processed_items}/{job.total_items} ({progress.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  {job.failed_items > 0 && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <Warning className="h-4 w-4" />
                      {job.failed_items} failed items
                    </div>
                  )}
                  {job.estimated_cost && (
                    <div className="text-sm text-muted-foreground">
                      Estimated cost: ${job.estimated_cost.toFixed(2)}
                      {job.actual_cost && ` | Actual: $${job.actual_cost.toFixed(2)}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Batch Job</DialogTitle>
            <DialogDescription>Configure a new batch operation</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Batch Generation - Jan 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as JobType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="reprocessing">Reprocessing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product IDs (one per line or comma-separated)</Label>
              <Textarea
                value={productIdsInput}
                onChange={(e) => setProductIdsInput(e.target.value)}
                placeholder="product-uuid-1&#10;product-uuid-2&#10;product-uuid-3"
                className="font-mono text-sm min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Brief IDs (optional, one per line or comma-separated)</Label>
              <Textarea
                value={briefIdsInput}
                onChange={(e) => setBriefIdsInput(e.target.value)}
                placeholder="brief-uuid-1&#10;brief-uuid-2"
                className="font-mono text-sm min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prompt Version</Label>
                <Select
                  value={formData.config.prompt_version_id || ''}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, prompt_version_id: v || undefined },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use default</SelectItem>
                    {prompts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (v{p.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight Config</Label>
                <Select
                  value={formData.config.weights_version_id || ''}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, weights_version_id: v || undefined },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select weights..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use default</SelectItem>
                    {weights.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} (v{w.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  value={formData.config.batch_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, batch_size: parseInt(e.target.value) || 10 },
                    })
                  }
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Concurrent Operations</Label>
                <Input
                  type="number"
                  value={formData.config.concurrent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, concurrent: parseInt(e.target.value) || 3 },
                    })
                  }
                  min={1}
                  max={10}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name || (!productIdsInput && !briefIdsInput)}>
              {isSaving ? 'Creating...' : 'Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingJob} onOpenChange={() => setViewingJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewedJob?.name}</DialogTitle>
            <DialogDescription>Job ID: {viewedJob?.id}</DialogDescription>
          </DialogHeader>
          {viewedJob && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[viewedJob.status]}>{viewedJob.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p>{viewedJob.type}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Progress</Label>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {viewedJob.processed_items} of {viewedJob.total_items} items
                    </span>
                    <span className="font-mono">
                      {viewedJob.total_items > 0
                        ? ((viewedJob.processed_items / viewedJob.total_items) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={viewedJob.total_items > 0 ? (viewedJob.processed_items / viewedJob.total_items) * 100 : 0}
                    className="h-2"
                  />
                </div>
                {viewedJob.failed_items > 0 && (
                  <p className="text-sm text-destructive">{viewedJob.failed_items} failed items</p>
                )}
              </div>

              {viewedJob.config && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Configuration</Label>
                  <pre className="p-4 rounded-md bg-muted font-mono text-sm overflow-auto max-h-[200px]">
                    {JSON.stringify(viewedJob.config, null, 2)}
                  </pre>
                </div>
              )}

              {viewedJob.error_log && viewedJob.error_log.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Error Log</Label>
                  <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 max-h-[200px] overflow-auto">
                    {viewedJob.error_log.map((err, i) => (
                      <p key={i} className="text-sm text-destructive font-mono">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{new Date(viewedJob.created_at).toLocaleString()}</p>
                </div>
                {viewedJob.started_at && (
                  <div>
                    <Label className="text-muted-foreground">Started</Label>
                    <p>{new Date(viewedJob.started_at).toLocaleString()}</p>
                  </div>
                )}
                {viewedJob.completed_at && (
                  <div>
                    <Label className="text-muted-foreground">Completed</Label>
                    <p>{new Date(viewedJob.completed_at).toLocaleString()}</p>
                  </div>
                )}
                {viewedJob.estimated_cost && (
                  <div>
                    <Label className="text-muted-foreground">Cost</Label>
                    <p>
                      Est: ${viewedJob.estimated_cost.toFixed(2)}
                      {viewedJob.actual_cost && ` | Actual: $${viewedJob.actual_cost.toFixed(2)}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingJob(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
