'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Rows, Columns } from '@phosphor-icons/react'
import type { DiffMode } from './hooks/use-refiner-state'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
  oldLineNumber?: number
  newLineNumber?: number
}

interface DiffViewerProps {
  oldText: string
  newText: string
  mode: DiffMode
  onModeChange: (mode: DiffMode) => void
  className?: string
  title?: string
}

/**
 * Compute diff between two texts
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  const maxLength = Math.max(oldLines.length, newLines.length)
  let oldLineNum = 1
  let newLineNum = 1

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined && newLine !== undefined) {
      result.push({
        type: 'added',
        content: newLine,
        lineNumber: newLineNum,
        newLineNumber: newLineNum++,
      })
    } else if (oldLine !== undefined && newLine === undefined) {
      result.push({
        type: 'removed',
        content: oldLine,
        lineNumber: oldLineNum,
        oldLineNumber: oldLineNum++,
      })
    } else if (oldLine !== newLine) {
      result.push({
        type: 'removed',
        content: oldLine || '',
        lineNumber: oldLineNum,
        oldLineNumber: oldLineNum++,
      })
      result.push({
        type: 'added',
        content: newLine || '',
        lineNumber: newLineNum,
        newLineNumber: newLineNum++,
      })
    } else {
      result.push({
        type: 'unchanged',
        content: oldLine || '',
        lineNumber: oldLineNum,
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      })
    }
  }

  return result
}

/**
 * Inline diff view - shows changes in a single column
 */
function InlineDiffView({ diffLines }: { diffLines: DiffLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th scope="col">Line number</th>
            <th scope="col">Change type</th>
            <th scope="col">Content</th>
          </tr>
        </thead>
        <tbody>
          {diffLines.map((line, index) => (
            <tr
              key={index}
              className={cn(
                'border-b border-muted/50 last:border-b-0',
                line.type === 'added' && 'bg-green-50 dark:bg-green-950/30',
                line.type === 'removed' && 'bg-red-50 dark:bg-red-950/30'
              )}
            >
              <td className="w-12 select-none px-3 py-0.5 text-right text-xs text-muted-foreground font-mono">
                {line.oldLineNumber || line.newLineNumber}
              </td>
              <td className="w-8 select-none px-2 py-0.5 text-center font-mono">
                <span
                  className={cn(
                    line.type === 'added' && 'text-green-600',
                    line.type === 'removed' && 'text-red-600',
                    line.type === 'unchanged' && 'text-muted-foreground'
                  )}
                >
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
              </td>
              <td className="px-3 py-0.5">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {line.content || '\u00A0'}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Side-by-side diff view - shows old and new in parallel columns
 */
function SideBySideDiffView({
  oldText,
  newText,
}: {
  oldText: string
  newText: string
}) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const maxLength = Math.max(oldLines.length, newLines.length)

  return (
    <div className="grid grid-cols-2 gap-0 overflow-x-auto">
      {/* Old (Before) */}
      <div className="border-r border-muted">
        <div className="sticky top-0 bg-red-50/80 dark:bg-red-950/50 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 border-b border-muted">
          Before
        </div>
        <div className="overflow-x-auto">
          {Array.from({ length: maxLength }).map((_, i) => {
            const oldLine = oldLines[i]
            const newLine = newLines[i]
            const isRemoved = oldLine !== undefined && oldLine !== newLine
            const isEmpty = oldLine === undefined

            return (
              <div
                key={i}
                className={cn(
                  'flex border-b border-muted/30 last:border-b-0',
                  isRemoved && 'bg-red-50 dark:bg-red-950/30',
                  isEmpty && 'bg-muted/20'
                )}
              >
                <span className="w-10 shrink-0 select-none px-2 py-0.5 text-right text-xs text-muted-foreground font-mono border-r border-muted/30">
                  {isEmpty ? '' : i + 1}
                </span>
                <pre className="flex-1 px-3 py-0.5 whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-hidden">
                  {isEmpty ? '\u00A0' : oldLine || '\u00A0'}
                </pre>
              </div>
            )
          })}
        </div>
      </div>

      {/* New (After) */}
      <div>
        <div className="sticky top-0 bg-green-50/80 dark:bg-green-950/50 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 border-b border-muted">
          After
        </div>
        <div className="overflow-x-auto">
          {Array.from({ length: maxLength }).map((_, i) => {
            const oldLine = oldLines[i]
            const newLine = newLines[i]
            const isAdded = newLine !== undefined && oldLine !== newLine
            const isEmpty = newLine === undefined

            return (
              <div
                key={i}
                className={cn(
                  'flex border-b border-muted/30 last:border-b-0',
                  isAdded && 'bg-green-50 dark:bg-green-950/30',
                  isEmpty && 'bg-muted/20'
                )}
              >
                <span className="w-10 shrink-0 select-none px-2 py-0.5 text-right text-xs text-muted-foreground font-mono border-r border-muted/30">
                  {isEmpty ? '' : i + 1}
                </span>
                <pre className="flex-1 px-3 py-0.5 whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-hidden">
                  {isEmpty ? '\u00A0' : newLine || '\u00A0'}
                </pre>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function DiffViewer({
  oldText,
  newText,
  mode,
  onModeChange,
  className,
  title = 'Changes Preview',
}: DiffViewerProps) {
  const diffLines = React.useMemo(() => computeDiff(oldText, newText), [oldText, newText])

  const addedCount = diffLines.filter((l) => l.type === 'added').length
  const removedCount = diffLines.filter((l) => l.type === 'removed').length

  // No changes
  if (addedCount === 0 && removedCount === 0) {
    return (
      <div className={cn('rounded-lg border bg-muted/30 p-4 text-center', className)}>
        <p className="text-sm text-muted-foreground">No changes to display</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-background overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex gap-3 text-xs">
            <span className="text-green-600" aria-label={`${addedCount} lines added`}>
              +{addedCount} added
            </span>
            <span className="text-red-600" aria-label={`${removedCount} lines removed`}>
              -{removedCount} removed
            </span>
          </div>
        </div>
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === 'inline' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onModeChange('inline')}
                >
                  <Rows className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Inline view - show changes in single column</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === 'side-by-side' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onModeChange('side-by-side')}
                >
                  <Columns className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Side-by-side view - compare before and after</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Diff content */}
      <div
        role="region"
        aria-label={`${title}: ${addedCount} additions, ${removedCount} deletions`}
        className="max-h-[300px] overflow-y-auto"
      >
        {mode === 'inline' ? (
          <InlineDiffView diffLines={diffLines} />
        ) : (
          <SideBySideDiffView oldText={oldText} newText={newText} />
        )}
      </div>

      <div className="sr-only" aria-live="polite">
        Diff view updated: {addedCount} additions, {removedCount} deletions
      </div>
    </div>
  )
}

export type { DiffLine, DiffViewerProps }
