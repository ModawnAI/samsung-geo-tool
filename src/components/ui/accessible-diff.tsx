'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
}

interface AccessibleDiffProps {
  oldText: string
  newText: string
  className?: string
  showLineNumbers?: boolean
  title?: string
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  // Simple line-by-line diff (can be enhanced with proper diff algorithm)
  const maxLength = Math.max(oldLines.length, newLines.length)
  let lineNumber = 1

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined && newLine !== undefined) {
      result.push({ type: 'added', content: newLine, lineNumber: lineNumber++ })
    } else if (oldLine !== undefined && newLine === undefined) {
      result.push({ type: 'removed', content: oldLine, lineNumber: lineNumber++ })
    } else if (oldLine !== newLine) {
      result.push({ type: 'removed', content: oldLine || '', lineNumber: lineNumber })
      result.push({ type: 'added', content: newLine || '', lineNumber: lineNumber++ })
    } else {
      result.push({ type: 'unchanged', content: oldLine || '', lineNumber: lineNumber++ })
    }
  }

  return result
}

const AccessibleDiff = React.forwardRef<HTMLDivElement, AccessibleDiffProps>(
  ({ oldText, newText, className, showLineNumbers = true, title = 'Content Diff' }, ref) => {
    const diffLines = React.useMemo(() => computeDiff(oldText, newText), [oldText, newText])

    const addedCount = diffLines.filter((l) => l.type === 'added').length
    const removedCount = diffLines.filter((l) => l.type === 'removed').length

    return (
      <div ref={ref} className={cn('rounded-lg border bg-muted/30', className)}>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600" aria-label={`${addedCount} lines added`}>
              +{addedCount} added
            </span>
            <span className="text-red-600" aria-label={`${removedCount} lines removed`}>
              -{removedCount} removed
            </span>
          </div>
        </div>

        <div
          role="region"
          aria-label={`${title}: ${addedCount} additions, ${removedCount} deletions`}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm" aria-describedby="diff-description">
            <caption id="diff-description" className="sr-only">
              Diff comparison showing {addedCount} added lines and {removedCount} removed lines
            </caption>
            <thead className="sr-only">
              <tr>
                {showLineNumbers && <th scope="col">Line number</th>}
                <th scope="col">Change type</th>
                <th scope="col">Content</th>
              </tr>
            </thead>
            <tbody>
              {diffLines.map((line, index) => (
                <tr
                  key={index}
                  className={cn(
                    'border-b border-muted last:border-b-0',
                    line.type === 'added' && 'bg-green-50 dark:bg-green-950/30',
                    line.type === 'removed' && 'bg-red-50 dark:bg-red-950/30'
                  )}
                >
                  {showLineNumbers && (
                    <td className="w-12 select-none px-3 py-1 text-right text-xs text-muted-foreground">
                      {line.lineNumber}
                    </td>
                  )}
                  <td className="w-8 select-none px-2 py-1 text-center font-mono">
                    <span
                      aria-label={
                        line.type === 'added'
                          ? 'Added'
                          : line.type === 'removed'
                            ? 'Removed'
                            : 'Unchanged'
                      }
                      className={cn(
                        line.type === 'added' && 'text-green-600',
                        line.type === 'removed' && 'text-red-600',
                        line.type === 'unchanged' && 'text-muted-foreground'
                      )}
                    >
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                  </td>
                  <td className="px-3 py-1">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {line.content || '\u00A0'}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sr-only" aria-live="polite">
          Diff view updated: {addedCount} additions, {removedCount} deletions
        </div>
      </div>
    )
  }
)
AccessibleDiff.displayName = 'AccessibleDiff'

export { AccessibleDiff, computeDiff }
export type { DiffLine, AccessibleDiffProps }
