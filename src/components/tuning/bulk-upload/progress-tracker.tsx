'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface UploadProgress {
  total: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  currentItem?: string
  errors: Array<{ item: string; error: string }>
}

interface ProgressTrackerProps {
  progress: UploadProgress
  isComplete: boolean
  onClose?: () => void
  onRetryFailed?: () => void
  className?: string
}

export function ProgressTracker({
  progress,
  isComplete,
  onClose,
  onRetryFailed,
  className,
}: ProgressTrackerProps) {
  const processed = progress.inserted + progress.updated + progress.skipped + progress.failed
  const percentComplete = progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0
  const hasErrors = progress.errors.length > 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isComplete ? (
              hasErrors ? (
                <>Upload Completed with Errors</>
              ) : (
                <>Upload Complete</>
              )
            ) : (
              <>Uploading...</>
            )}
          </CardTitle>
          {isComplete && (
            <Badge variant={hasErrors ? 'destructive' : 'default'}>
              {hasErrors ? 'Errors' : 'Success'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isComplete ? 'Completed' : progress.currentItem || 'Processing...'}
            </span>
            <span className="font-medium">{percentComplete}%</span>
          </div>
          <Progress value={percentComplete} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {processed} of {progress.total} records processed
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Inserted"
            value={progress.inserted}
            variant="success"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          />
          <StatCard
            label="Updated"
            value={progress.updated}
            variant="info"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
          <StatCard
            label="Skipped"
            value={progress.skipped}
            variant="warning"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            label="Failed"
            value={progress.failed}
            variant="error"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
        </div>

        {/* Error list */}
        {hasErrors && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <h4 className="mb-2 font-medium text-destructive">
              Errors ({progress.errors.length})
            </h4>
            <ul className="max-h-[200px] space-y-1 overflow-y-auto text-sm">
              {progress.errors.map((err, index) => (
                <li key={index} className="text-muted-foreground">
                  <span className="font-medium">{err.item}:</span> {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {isComplete && (
          <div className="flex justify-end gap-3">
            {hasErrors && onRetryFailed && (
              <Button variant="outline" onClick={onRetryFailed}>
                Retry Failed ({progress.failed})
              </Button>
            )}
            {onClose && (
              <Button onClick={onClose}>
                {hasErrors ? 'Close' : 'Done'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  label: string
  value: number
  variant: 'success' | 'info' | 'warning' | 'error'
  icon: React.ReactNode
}

function StatCard({ label, value, variant, icon }: StatCardProps) {
  const variantStyles = {
    success: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    warning: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
    error: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  }

  return (
    <div className={cn('rounded-lg p-3', variantStyles[variant])}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

export type { UploadProgress, ProgressTrackerProps }
