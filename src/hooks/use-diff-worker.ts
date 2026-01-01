'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
  oldLineNumber?: number
  newLineNumber?: number
}

interface DiffStats {
  added: number
  removed: number
  unchanged: number
  totalOld: number
  totalNew: number
}

interface DiffResult {
  lines: DiffLine[]
  stats: DiffStats
  timing: number
}

interface UseDiffWorkerOptions {
  ignoreWhitespace?: boolean
}

interface UseDiffWorkerReturn {
  computeDiff: (oldText: string, newText: string) => void
  result: DiffResult | null
  isComputing: boolean
  error: string | null
}

export function useDiffWorker(options: UseDiffWorkerOptions = {}): UseDiffWorkerReturn {
  const workerRef = useRef<Worker | null>(null)
  const [result, setResult] = useState<DiffResult | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../lib/workers/diff-worker.ts', import.meta.url),
      { type: 'module' }
    )

    // Set up message handler
    workerRef.current.onmessage = (event) => {
      const data = event.data

      if (data.type === 'diff-result') {
        setResult({
          lines: data.lines,
          stats: data.stats,
          timing: data.timing,
        })
        setIsComputing(false)
        setError(null)
      } else if (data.type === 'error') {
        setError(data.error)
        setIsComputing(false)
      }
    }

    workerRef.current.onerror = (event) => {
      setError(`Worker error: ${event.message}`)
      setIsComputing(false)
    }

    // Cleanup
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const computeDiff = useCallback(
    (oldText: string, newText: string) => {
      if (!workerRef.current) {
        setError('Worker not initialized')
        return
      }

      setIsComputing(true)
      setError(null)

      const id = `diff-${++requestIdRef.current}`

      workerRef.current.postMessage({
        type: 'compute-diff',
        id,
        oldText,
        newText,
        options: {
          ignoreWhitespace: options.ignoreWhitespace,
        },
      })
    },
    [options.ignoreWhitespace]
  )

  return {
    computeDiff,
    result,
    isComputing,
    error,
  }
}

// Fallback for non-worker environments (SSR)
export function computeDiffSync(
  oldText: string,
  newText: string,
  options: UseDiffWorkerOptions = {}
): DiffResult {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []
  let lineNumber = 1

  const normalizeContent = (text: string): string => {
    if (options.ignoreWhitespace) {
      return text.replace(/\s+/g, ' ').trim()
    }
    return text
  }

  // Simple line-by-line comparison for SSR
  const maxLength = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined && newLine !== undefined) {
      result.push({
        type: 'added',
        content: newLine,
        lineNumber: lineNumber++,
        newLineNumber: i + 1,
      })
    } else if (oldLine !== undefined && newLine === undefined) {
      result.push({
        type: 'removed',
        content: oldLine,
        lineNumber: lineNumber++,
        oldLineNumber: i + 1,
      })
    } else if (normalizeContent(oldLine || '') !== normalizeContent(newLine || '')) {
      result.push({
        type: 'removed',
        content: oldLine || '',
        lineNumber: lineNumber,
        oldLineNumber: i + 1,
      })
      result.push({
        type: 'added',
        content: newLine || '',
        lineNumber: lineNumber++,
        newLineNumber: i + 1,
      })
    } else {
      result.push({
        type: 'unchanged',
        content: oldLine || '',
        lineNumber: lineNumber++,
        oldLineNumber: i + 1,
        newLineNumber: i + 1,
      })
    }
  }

  return {
    lines: result,
    stats: {
      added: result.filter((l) => l.type === 'added').length,
      removed: result.filter((l) => l.type === 'removed').length,
      unchanged: result.filter((l) => l.type === 'unchanged').length,
      totalOld: oldLines.length,
      totalNew: newLines.length,
    },
    timing: 0,
  }
}

export type { DiffLine, DiffStats, DiffResult, UseDiffWorkerOptions, UseDiffWorkerReturn }
