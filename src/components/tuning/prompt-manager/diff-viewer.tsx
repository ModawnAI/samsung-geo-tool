'use client'

import * as React from 'react'
import { useCallback, useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDiffWorker, computeDiffSync } from '@/hooks/use-diff-worker'
import type { PromptVersion } from '@/types/tuning'
import {
  GitDiff,
  Plus,
  Minus,
  Equals,
  ArrowsClockwise,
  Copy,
  Check,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'

export interface DiffViewerProps {
  leftVersion: PromptVersion | null
  rightVersion: PromptVersion | null
  versions?: PromptVersion[]
  onVersionChange?: (side: 'left' | 'right', version: PromptVersion) => void
  className?: string
}

type ViewMode = 'split' | 'unified'

interface LineData {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  leftLineNumber: number | null
  rightLineNumber: number | null
}

export function DiffViewer({
  leftVersion,
  rightVersion,
  versions = [],
  onVersionChange,
  className,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState<'left' | 'right' | null>(null)

  const leftText = useMemo(() => {
    if (!leftVersion) return ''
    return leftVersion.system_prompt || ''
  }, [leftVersion])

  const rightText = useMemo(() => {
    if (!rightVersion) return ''
    return rightVersion.system_prompt || ''
  }, [rightVersion])

  // Process text based on ignoreWhitespace setting
  const processedLeftText = useMemo(() => {
    if (!ignoreWhitespace) return leftText
    return leftText.replace(/\s+/g, ' ').trim()
  }, [leftText, ignoreWhitespace])

  const processedRightText = useMemo(() => {
    if (!ignoreWhitespace) return rightText
    return rightText.replace(/\s+/g, ' ').trim()
  }, [rightText, ignoreWhitespace])

  // Use the diff worker hook
  const { computeDiff, result, isComputing, error } = useDiffWorker()

  // Compute diff when texts change
  useEffect(() => {
    if (processedLeftText || processedRightText) {
      computeDiff(processedLeftText, processedRightText)
    }
  }, [processedLeftText, processedRightText, computeDiff])

  // Fallback to sync computation if worker fails
  const diffResult = useMemo(() => {
    if (error && (processedLeftText || processedRightText)) {
      return computeDiffSync(processedLeftText, processedRightText)
    }
    return result
  }, [result, error, processedLeftText, processedRightText])

  // Convert diff result to line data for rendering
  const lineData = useMemo((): LineData[] => {
    if (!diffResult) return []

    const lines: LineData[] = []
    let leftLineNum = 1
    let rightLineNum = 1

    for (const change of diffResult.lines) {
      if (change.type === 'unchanged') {
        lines.push({
          type: 'unchanged',
          content: change.content,
          leftLineNumber: leftLineNum++,
          rightLineNumber: rightLineNum++,
        })
      } else if (change.type === 'removed') {
        lines.push({
          type: 'removed',
          content: change.content,
          leftLineNumber: leftLineNum++,
          rightLineNumber: null,
        })
      } else if (change.type === 'added') {
        lines.push({
          type: 'added',
          content: change.content,
          leftLineNumber: null,
          rightLineNumber: rightLineNum++,
        })
      }
    }

    return lines
  }, [diffResult])

  // Group consecutive unchanged lines for collapsing
  const groupedLineData = useMemo(() => {
    const groups: { type: 'changes' | 'context'; lines: LineData[]; startIndex: number }[] = []
    let currentGroup: LineData[] = []
    let currentType: 'changes' | 'context' | null = null
    let startIndex = 0

    for (let i = 0; i < lineData.length; i++) {
      const line = lineData[i]
      const lineType = line.type === 'unchanged' ? 'context' : 'changes'

      if (currentType !== lineType) {
        if (currentGroup.length > 0) {
          groups.push({ type: currentType!, lines: currentGroup, startIndex })
        }
        currentGroup = [line]
        currentType = lineType
        startIndex = i
      } else {
        currentGroup.push(line)
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ type: currentType!, lines: currentGroup, startIndex })
    }

    return groups
  }, [lineData])

  const handleCopy = useCallback(async (side: 'left' | 'right') => {
    const text = side === 'left' ? leftText : rightText
    await navigator.clipboard.writeText(text)
    setCopied(side)
    setTimeout(() => setCopied(null), 2000)
  }, [leftText, rightText])

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const stats = diffResult?.stats

  const renderVersionSelector = (
    side: 'left' | 'right',
    currentVersion: PromptVersion | null
  ) => {
    if (!onVersionChange || versions.length === 0) {
      return currentVersion ? (
        <div className="flex items-center gap-2">
          <span className="font-medium">{currentVersion.name}</span>
          <Badge variant="outline" className="text-xs">
            v{currentVersion.version}
          </Badge>
        </div>
      ) : (
        <span className="text-muted-foreground">No version selected</span>
      )
    }

    return (
      <Select
        value={currentVersion?.id || ''}
        onValueChange={(id) => {
          const version = versions.find((v) => v.id === id)
          if (version) onVersionChange(side, version)
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent>
          {versions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              <div className="flex items-center gap-2">
                <span>{version.name}</span>
                <Badge variant="outline" className="text-xs">
                  v{version.version}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const renderSplitView = () => (
    <div className="grid grid-cols-2 divide-x">
      {/* Left side (old/base) */}
      <div className="overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          {renderVersionSelector('left', leftVersion)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy('left')}
            disabled={!leftText}
          >
            {copied === 'left' ? (
              <Check className="h-4 w-4" weight="bold" />
            ) : (
              <Copy className="h-4 w-4" weight="duotone" />
            )}
          </Button>
        </div>
        <div className="font-mono text-sm">
          {lineData
            .filter((line) => line.type !== 'added')
            .map((line, idx) => (
              <div
                key={`left-${idx}`}
                className={cn(
                  'flex border-b border-border/50',
                  line.type === 'removed' && 'bg-red-500/10'
                )}
              >
                {showLineNumbers && (
                  <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                    {line.leftLineNumber || ''}
                  </span>
                )}
                <span
                  className={cn(
                    'flex-1 whitespace-pre-wrap break-all px-2 py-1',
                    line.type === 'removed' && 'text-red-700 dark:text-red-400'
                  )}
                >
                  {line.type === 'removed' && (
                    <Minus className="mr-1 inline-block h-3 w-3" weight="bold" />
                  )}
                  {line.content}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Right side (new/compare) */}
      <div className="overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          {renderVersionSelector('right', rightVersion)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy('right')}
            disabled={!rightText}
          >
            {copied === 'right' ? (
              <Check className="h-4 w-4" weight="bold" />
            ) : (
              <Copy className="h-4 w-4" weight="duotone" />
            )}
          </Button>
        </div>
        <div className="font-mono text-sm">
          {lineData
            .filter((line) => line.type !== 'removed')
            .map((line, idx) => (
              <div
                key={`right-${idx}`}
                className={cn(
                  'flex border-b border-border/50',
                  line.type === 'added' && 'bg-green-500/10'
                )}
              >
                {showLineNumbers && (
                  <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                    {line.rightLineNumber || ''}
                  </span>
                )}
                <span
                  className={cn(
                    'flex-1 whitespace-pre-wrap break-all px-2 py-1',
                    line.type === 'added' && 'text-green-700 dark:text-green-400'
                  )}
                >
                  {line.type === 'added' && (
                    <Plus className="mr-1 inline-block h-3 w-3" weight="bold" />
                  )}
                  {line.content}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )

  const renderUnifiedView = () => (
    <div className="overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-4">
          {renderVersionSelector('left', leftVersion)}
          <ArrowsClockwise className="h-4 w-4 text-muted-foreground" weight="duotone" />
          {renderVersionSelector('right', rightVersion)}
        </div>
      </div>
      <div className="font-mono text-sm">
        {groupedLineData.map((group, groupIdx) => {
          // Collapse large context sections
          if (group.type === 'context' && group.lines.length > 6) {
            const isExpanded = expandedSections.has(groupIdx)
            const visibleLines = isExpanded
              ? group.lines
              : [...group.lines.slice(0, 3), ...group.lines.slice(-3)]

            return (
              <div key={`group-${groupIdx}`}>
                {visibleLines.slice(0, 3).map((line, idx) => (
                  <div
                    key={`unified-${groupIdx}-${idx}`}
                    className="flex border-b border-border/50"
                  >
                    {showLineNumbers && (
                      <>
                        <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                          {line.leftLineNumber}
                        </span>
                        <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                          {line.rightLineNumber}
                        </span>
                      </>
                    )}
                    <span className="flex-1 whitespace-pre-wrap break-all px-2 py-1">
                      {line.content}
                    </span>
                  </div>
                ))}
                {!isExpanded && (
                  <button
                    type="button"
                    onClick={() => toggleSection(groupIdx)}
                    className="flex w-full items-center justify-center gap-2 border-b bg-muted/20 py-2 text-xs text-muted-foreground hover:bg-muted/40"
                  >
                    <CaretDown className="h-3 w-3" weight="bold" />
                    <span>Show {group.lines.length - 6} hidden lines</span>
                    <CaretDown className="h-3 w-3" weight="bold" />
                  </button>
                )}
                {isExpanded && group.lines.length > 6 && (
                  <>
                    {group.lines.slice(3, -3).map((line, idx) => (
                      <div
                        key={`unified-${groupIdx}-mid-${idx}`}
                        className="flex border-b border-border/50"
                      >
                        {showLineNumbers && (
                          <>
                            <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                              {line.leftLineNumber}
                            </span>
                            <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                              {line.rightLineNumber}
                            </span>
                          </>
                        )}
                        <span className="flex-1 whitespace-pre-wrap break-all px-2 py-1">
                          {line.content}
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => toggleSection(groupIdx)}
                      className="flex w-full items-center justify-center gap-2 border-b bg-muted/20 py-2 text-xs text-muted-foreground hover:bg-muted/40"
                    >
                      <CaretUp className="h-3 w-3" weight="bold" />
                      <span>Hide lines</span>
                      <CaretUp className="h-3 w-3" weight="bold" />
                    </button>
                  </>
                )}
                {visibleLines.slice(-3).map((line, idx) => (
                  <div
                    key={`unified-${groupIdx}-end-${idx}`}
                    className="flex border-b border-border/50"
                  >
                    {showLineNumbers && (
                      <>
                        <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                          {line.leftLineNumber}
                        </span>
                        <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                          {line.rightLineNumber}
                        </span>
                      </>
                    )}
                    <span className="flex-1 whitespace-pre-wrap break-all px-2 py-1">
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            )
          }

          return group.lines.map((line, idx) => (
            <div
              key={`unified-${groupIdx}-${idx}`}
              className={cn(
                'flex border-b border-border/50',
                line.type === 'added' && 'bg-green-500/10',
                line.type === 'removed' && 'bg-red-500/10'
              )}
            >
              {showLineNumbers && (
                <>
                  <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                    {line.leftLineNumber || ''}
                  </span>
                  <span className="w-12 flex-shrink-0 select-none border-r bg-muted/30 px-2 py-1 text-right text-muted-foreground">
                    {line.rightLineNumber || ''}
                  </span>
                </>
              )}
              <span
                className={cn(
                  'flex-1 whitespace-pre-wrap break-all px-2 py-1',
                  line.type === 'added' && 'text-green-700 dark:text-green-400',
                  line.type === 'removed' && 'text-red-700 dark:text-red-400'
                )}
              >
                {line.type === 'added' && (
                  <Plus className="mr-1 inline-block h-3 w-3" weight="bold" />
                )}
                {line.type === 'removed' && (
                  <Minus className="mr-1 inline-block h-3 w-3" weight="bold" />
                )}
                {line.content}
              </span>
            </div>
          ))
        })}
      </div>
    </div>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitDiff className="h-5 w-5 text-muted-foreground" weight="duotone" />
            <div>
              <CardTitle>Prompt Comparison</CardTitle>
              <CardDescription>Compare changes between prompt versions</CardDescription>
            </div>
          </div>

          {/* Stats badges */}
          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-green-600">
                <Plus className="h-3 w-3" weight="bold" />
                {stats.added}
              </Badge>
              <Badge variant="outline" className="gap-1 text-red-600">
                <Minus className="h-3 w-3" weight="bold" />
                {stats.removed}
              </Badge>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Equals className="h-3 w-3" weight="bold" />
                {stats.unchanged}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-4">
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="split">Split View</SelectItem>
                <SelectItem value="unified">Unified View</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="line-numbers"
                checked={showLineNumbers}
                onCheckedChange={setShowLineNumbers}
              />
              <Label htmlFor="line-numbers" className="text-sm">
                Line numbers
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ignore-whitespace"
                checked={ignoreWhitespace}
                onCheckedChange={setIgnoreWhitespace}
              />
              <Label htmlFor="ignore-whitespace" className="text-sm">
                Ignore whitespace
              </Label>
            </div>
          </div>

          {isComputing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" />
              Computing diff...
            </div>
          )}
        </div>

        {/* Diff content */}
        {!leftVersion && !rightVersion ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitDiff className="h-12 w-12 text-muted-foreground/50" weight="duotone" />
            <p className="mt-4 text-sm text-muted-foreground">
              Select two versions to compare
            </p>
          </div>
        ) : error && !diffResult ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to compute diff: {error}
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-hidden rounded-lg border">
            {viewMode === 'split' ? renderSplitView() : renderUnifiedView()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { ViewMode, LineData }
