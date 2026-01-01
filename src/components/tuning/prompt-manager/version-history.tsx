'use client'

import * as React from 'react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PromptVersion, Engine } from '@/types/tuning'

export interface VersionHistoryProps {
  versions: PromptVersion[]
  currentVersionId?: string
  onSelect: (version: PromptVersion) => void
  onCompare?: (version1: PromptVersion, version2: PromptVersion) => void
  onActivate?: (version: PromptVersion) => void
  onDelete?: (version: PromptVersion) => void
  className?: string
}

const ENGINE_COLORS: Record<Engine, string> = {
  gemini: 'bg-blue-500',
  perplexity: 'bg-purple-500',
  cohere: 'bg-green-500',
}

export function VersionHistory({
  versions,
  currentVersionId,
  onSelect,
  onCompare,
  onActivate,
  onDelete,
  className,
}: VersionHistoryProps) {
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<PromptVersion | null>(null)
  const [filterEngine, setFilterEngine] = useState<Engine | 'all'>('all')

  // Filter versions
  const filteredVersions = versions.filter(
    (v) => filterEngine === 'all' || v.engine === filterEngine
  )

  // Group by engine
  const groupedVersions = filteredVersions.reduce(
    (acc, version) => {
      if (!acc[version.engine]) {
        acc[version.engine] = []
      }
      acc[version.engine].push(version)
      return acc
    },
    {} as Record<Engine, PromptVersion[]>
  )

  const handleVersionClick = useCallback(
    (version: PromptVersion) => {
      if (compareMode) {
        if (!selectedForCompare) {
          setSelectedForCompare(version)
        } else if (selectedForCompare.id !== version.id) {
          onCompare?.(selectedForCompare, version)
          setCompareMode(false)
          setSelectedForCompare(null)
        }
      } else {
        onSelect(version)
      }
    },
    [compareMode, selectedForCompare, onSelect, onCompare]
  )

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => !prev)
    setSelectedForCompare(null)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Version History</CardTitle>
            <CardDescription>
              {versions.length} version{versions.length !== 1 ? 's' : ''} available
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={filterEngine}
              onValueChange={(v) => setFilterEngine(v as Engine | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engines</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="perplexity">Perplexity</SelectItem>
                <SelectItem value="cohere">Cohere</SelectItem>
              </SelectContent>
            </Select>
            {onCompare && (
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={toggleCompareMode}
              >
                {compareMode ? 'Cancel Compare' : 'Compare'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {compareMode && (
          <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">
            {selectedForCompare
              ? `Selected "${selectedForCompare.name}" v${selectedForCompare.version}. Click another version to compare.`
              : 'Select the first version to compare.'}
          </div>
        )}

        {filteredVersions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No versions found
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedVersions).map(([engine, engineVersions]) => (
              <div key={engine}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', ENGINE_COLORS[engine as Engine])} />
                  <h4 className="text-sm font-medium capitalize">{engine}</h4>
                  <span className="text-xs text-muted-foreground">
                    ({engineVersions.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {engineVersions.map((version) => (
                    <div
                      key={version.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
                        version.id === currentVersionId && 'border-primary bg-primary/5',
                        compareMode && selectedForCompare?.id === version.id && 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
                        'hover:bg-muted/50'
                      )}
                      onClick={() => handleVersionClick(version)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleVersionClick(version)
                        }
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{version.name}</span>
                          <Badge variant="outline" className="text-xs">
                            v{version.version}
                          </Badge>
                          {version.is_active && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                          {version.id === currentVersionId && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(version.created_at)}</span>
                          <span>({getRelativeTime(version.created_at)})</span>
                        </div>
                        {version.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {version.description}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {onActivate && !version.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onActivate(version)}
                            title="Set as active"
                          >
                            Activate
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(version)}
                            className="text-destructive hover:text-destructive"
                            title="Delete version"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
