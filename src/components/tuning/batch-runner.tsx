'use client'

import * as React from 'react'
import { useCallback, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { BatchJobStatus, BatchJobItemStatus } from '@/types/tuning'

// UI-only states extend database states
// Database BatchJobStatus: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
// UI adds: 'idle' (before start), 'cancelled' (user action)
type UIBatchStatus = BatchJobStatus | 'idle' | 'cancelled'

// UI-only item states extend database states
// Database BatchJobItemStatus: 'pending' | 'processing' | 'completed' | 'failed'
// UI adds: 'skipped' (for unselected items)
type UIBatchItemStatus = BatchJobItemStatus | 'skipped'

interface BatchItem {
  id: string
  name: string
  status: UIBatchItemStatus
  progress: number
  result?: unknown
  error?: string
  startedAt?: string
  completedAt?: string
}

interface BatchConfig {
  concurrency: number
  retryOnFailure: boolean
  retryAttempts: number
  stopOnError: boolean
  delayBetweenItems: number
}

interface BatchRunnerProps {
  items: Array<{ id: string; name: string; data: unknown }>
  onProcessItem: (item: { id: string; name: string; data: unknown }) => Promise<unknown>
  onBatchComplete?: (results: BatchItem[]) => void
  onBatchError?: (error: Error, item: BatchItem) => void
  defaultConfig?: Partial<BatchConfig>
  className?: string
}

const DEFAULT_CONFIG: BatchConfig = {
  concurrency: 3,
  retryOnFailure: true,
  retryAttempts: 2,
  stopOnError: false,
  delayBetweenItems: 100,
}

export function BatchRunner({
  items,
  onProcessItem,
  onBatchComplete,
  onBatchError,
  defaultConfig,
  className,
}: BatchRunnerProps) {
  const [config, setConfig] = useState<BatchConfig>({ ...DEFAULT_CONFIG, ...defaultConfig })
  const [batchStatus, setBatchStatus] = useState<UIBatchStatus>('idle')
  const [batchItems, setBatchItems] = useState<BatchItem[]>(() =>
    items.map((item) => ({
      id: item.id,
      name: item.name,
      status: 'pending',
      progress: 0,
    }))
  )
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(items.map((item) => item.id))
  )

  const abortControllerRef = useRef<AbortController | null>(null)
  const pauseRef = useRef(false)

  const updateConfig = useCallback(<K extends keyof BatchConfig>(key: K, value: BatchConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)))
    }
  }, [items, selectedItems])

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const processWithRetry = useCallback(
    async (
      item: { id: string; name: string; data: unknown },
      attempts: number
    ): Promise<{ success: boolean; result?: unknown; error?: string }> => {
      for (let attempt = 0; attempt <= attempts; attempt++) {
        try {
          const result = await onProcessItem(item)
          return { success: true, result }
        } catch (error) {
          if (attempt === attempts) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
      return { success: false, error: 'Max retries exceeded' }
    },
    [onProcessItem]
  )

  const runBatch = useCallback(async () => {
    const itemsToProcess = items.filter((item) => selectedItems.has(item.id))
    if (itemsToProcess.length === 0) return

    abortControllerRef.current = new AbortController()
    pauseRef.current = false
    setBatchStatus('running')

    // Reset items to pending
    setBatchItems((prev) =>
      prev.map((item) =>
        selectedItems.has(item.id)
          ? { ...item, status: 'pending', progress: 0, result: undefined, error: undefined }
          : { ...item, status: 'skipped' }
      )
    )

    const queue = [...itemsToProcess]
    const results: BatchItem[] = []
    const activeProcesses: Promise<void>[] = []

    const processNext = async (): Promise<void> => {
      while (queue.length > 0) {
        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          return
        }

        // Check for pause
        while (pauseRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          if (abortControllerRef.current?.signal.aborted) {
            return
          }
        }

        const item = queue.shift()
        if (!item) return

        // Update status to processing
        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'processing', startedAt: new Date().toISOString() }
              : i
          )
        )

        // Process item
        const { success, result, error } = await processWithRetry(
          item,
          config.retryOnFailure ? config.retryAttempts : 0
        )

        const batchItem: BatchItem = {
          id: item.id,
          name: item.name,
          status: success ? 'completed' : 'failed',
          progress: 100,
          result,
          error,
          completedAt: new Date().toISOString(),
        }

        results.push(batchItem)

        // Update batch items
        setBatchItems((prev) =>
          prev.map((i) => (i.id === item.id ? batchItem : i))
        )

        // Handle errors
        if (!success) {
          const err = new Error(error || 'Processing failed')
          onBatchError?.(err, batchItem)

          if (config.stopOnError) {
            abortControllerRef.current?.abort()
            setBatchStatus('failed')
            return
          }
        }

        // Delay between items
        if (config.delayBetweenItems > 0 && queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, config.delayBetweenItems))
        }
      }
    }

    // Start concurrent workers
    for (let i = 0; i < Math.min(config.concurrency, itemsToProcess.length); i++) {
      activeProcesses.push(processNext())
    }

    await Promise.all(activeProcesses)

    if (!abortControllerRef.current?.signal.aborted) {
      setBatchStatus('completed')
      onBatchComplete?.(results)
    }
  }, [
    items,
    selectedItems,
    config,
    processWithRetry,
    onBatchComplete,
    onBatchError,
  ])

  const pauseBatch = useCallback(() => {
    pauseRef.current = true
    setBatchStatus('paused')
  }, [])

  const resumeBatch = useCallback(() => {
    pauseRef.current = false
    setBatchStatus('running')
  }, [])

  const cancelBatch = useCallback(() => {
    abortControllerRef.current?.abort()
    pauseRef.current = false
    setBatchStatus('cancelled')
  }, [])

  const resetBatch = useCallback(() => {
    setBatchStatus('idle')
    setBatchItems(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        status: 'pending',
        progress: 0,
      }))
    )
    setSelectedItems(new Set(items.map((item) => item.id)))
  }, [items])

  // Calculate statistics
  const stats = React.useMemo(() => {
    const completed = batchItems.filter((i) => i.status === 'completed').length
    const failed = batchItems.filter((i) => i.status === 'failed').length
    const pending = batchItems.filter((i) => i.status === 'pending').length
    const processing = batchItems.filter((i) => i.status === 'processing').length
    const skipped = batchItems.filter((i) => i.status === 'skipped').length
    const total = batchItems.length - skipped
    const progress = total > 0 ? ((completed + failed) / total) * 100 : 0

    return { completed, failed, pending, processing, skipped, total, progress }
  }, [batchItems])

  const isRunning = batchStatus === 'running'
  const isPaused = batchStatus === 'paused'
  const isIdle = batchStatus === 'idle'
  const isFinished = ['completed', 'failed', 'cancelled'].includes(batchStatus)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Batch Runner</CardTitle>
            <CardDescription>
              Process {selectedItems.size} of {items.length} items
            </CardDescription>
          </div>
          <Badge
            variant={
              batchStatus === 'completed'
                ? 'default'
                : batchStatus === 'failed'
                  ? 'destructive'
                  : batchStatus === 'running'
                    ? 'secondary'
                    : 'outline'
            }
            className="capitalize"
          >
            {batchStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        {isIdle && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="concurrency">Concurrency</Label>
              <Select
                value={config.concurrency.toString()}
                onValueChange={(v) => updateConfig('concurrency', parseInt(v))}
              >
                <SelectTrigger id="concurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} parallel
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delay">Delay (ms)</Label>
              <Select
                value={config.delayBetweenItems.toString()}
                onValueChange={(v) => updateConfig('delayBetweenItems', parseInt(v))}
              >
                <SelectTrigger id="delay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 50, 100, 200, 500, 1000].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}ms
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="retry"
                checked={config.retryOnFailure}
                onCheckedChange={(checked) => updateConfig('retryOnFailure', !!checked)}
              />
              <Label htmlFor="retry" className="text-sm">
                Retry on failure ({config.retryAttempts}x)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="stop-on-error"
                checked={config.stopOnError}
                onCheckedChange={(checked) => updateConfig('stopOnError', !!checked)}
              />
              <Label htmlFor="stop-on-error" className="text-sm">
                Stop on first error
              </Label>
            </div>
          </div>
        )}

        {/* Progress */}
        {!isIdle && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.completed + stats.failed} of {stats.total} processed
              </span>
              <span className="font-medium">{stats.progress.toFixed(0)}%</span>
            </div>
            <Progress value={stats.progress} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="text-green-600">Completed: {stats.completed}</span>
              <span className="text-red-600">Failed: {stats.failed}</span>
              <span className="text-blue-600">Processing: {stats.processing}</span>
              <span>Pending: {stats.pending}</span>
              {stats.skipped > 0 && <span>Skipped: {stats.skipped}</span>}
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.size === items.length}
                onCheckedChange={toggleSelectAll}
                disabled={!isIdle}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedItems.size} selected
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {batchItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between border-b px-4 py-2 last:border-0',
                  item.status === 'processing' && 'bg-blue-50 dark:bg-blue-950/20',
                  item.status === 'completed' && 'bg-green-50 dark:bg-green-950/20',
                  item.status === 'failed' && 'bg-red-50 dark:bg-red-950/20',
                  item.status === 'skipped' && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => toggleSelectItem(item.id)}
                    disabled={!isIdle}
                  />
                  <div>
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.error && (
                      <p className="text-xs text-destructive">{item.error}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {isIdle && (
            <Button onClick={runBatch} disabled={selectedItems.size === 0}>
              Start Batch ({selectedItems.size})
            </Button>
          )}

          {isRunning && (
            <>
              <Button variant="outline" onClick={pauseBatch}>
                Pause
              </Button>
              <Button variant="destructive" onClick={cancelBatch}>
                Cancel
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button variant="outline" onClick={resumeBatch}>
                Resume
              </Button>
              <Button variant="destructive" onClick={cancelBatch}>
                Cancel
              </Button>
            </>
          )}

          {isFinished && (
            <Button onClick={resetBatch}>
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: BatchItem['status'] }) {
  const config = {
    pending: { variant: 'outline' as const, label: 'Pending' },
    processing: { variant: 'secondary' as const, label: 'Processing' },
    completed: { variant: 'default' as const, label: 'Completed' },
    failed: { variant: 'destructive' as const, label: 'Failed' },
    skipped: { variant: 'outline' as const, label: 'Skipped' },
  }

  const { variant, label } = config[status]

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  )
}

export type { UIBatchStatus, UIBatchItemStatus, BatchItem, BatchConfig, BatchRunnerProps }
