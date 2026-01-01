// Web Worker for heavy diff computations
// This worker handles diff calculations off the main thread to prevent UI blocking

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
  oldLineNumber?: number
  newLineNumber?: number
}

interface DiffRequest {
  type: 'compute-diff'
  id: string
  oldText: string
  newText: string
  options?: {
    ignoreWhitespace?: boolean
    contextLines?: number
  }
}

interface DiffResponse {
  type: 'diff-result'
  id: string
  lines: DiffLine[]
  stats: {
    added: number
    removed: number
    unchanged: number
    totalOld: number
    totalNew: number
  }
  timing: number
}

interface ErrorResponse {
  type: 'error'
  id: string
  error: string
}

type WorkerMessage = DiffRequest
type WorkerResponse = DiffResponse | ErrorResponse

// LCS-based diff algorithm for accurate line-by-line comparison
function computeLCS(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

function backtrackLCS(
  dp: number[][],
  oldLines: string[],
  newLines: string[]
): { oldIndex: number; newIndex: number }[] {
  const result: { oldIndex: number; newIndex: number }[] = []
  let i = oldLines.length
  let j = newLines.length

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ oldIndex: i - 1, newIndex: j - 1 })
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

function computeDiff(
  oldText: string,
  newText: string,
  options: { ignoreWhitespace?: boolean } = {}
): DiffLine[] {
  const normalizeContent = (text: string): string => {
    if (options.ignoreWhitespace) {
      return text.replace(/\s+/g, ' ').trim()
    }
    return text
  }

  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  // Create normalized versions for comparison
  const normalizedOld = oldLines.map(normalizeContent)
  const normalizedNew = newLines.map(normalizeContent)

  // Compute LCS
  const dp = computeLCS(normalizedOld, normalizedNew)
  const lcs = backtrackLCS(dp, normalizedOld, normalizedNew)

  const result: DiffLine[] = []
  let oldIdx = 0
  let newIdx = 0
  let lineNumber = 1

  for (const match of lcs) {
    // Add removed lines before match
    while (oldIdx < match.oldIndex) {
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        lineNumber: lineNumber++,
        oldLineNumber: oldIdx + 1,
      })
      oldIdx++
    }

    // Add added lines before match
    while (newIdx < match.newIndex) {
      result.push({
        type: 'added',
        content: newLines[newIdx],
        lineNumber: lineNumber++,
        newLineNumber: newIdx + 1,
      })
      newIdx++
    }

    // Add unchanged line
    result.push({
      type: 'unchanged',
      content: oldLines[oldIdx],
      lineNumber: lineNumber++,
      oldLineNumber: oldIdx + 1,
      newLineNumber: newIdx + 1,
    })
    oldIdx++
    newIdx++
  }

  // Add remaining removed lines
  while (oldIdx < oldLines.length) {
    result.push({
      type: 'removed',
      content: oldLines[oldIdx],
      lineNumber: lineNumber++,
      oldLineNumber: oldIdx + 1,
    })
    oldIdx++
  }

  // Add remaining added lines
  while (newIdx < newLines.length) {
    result.push({
      type: 'added',
      content: newLines[newIdx],
      lineNumber: lineNumber++,
      newLineNumber: newIdx + 1,
    })
    newIdx++
  }

  return result
}

function calculateStats(lines: DiffLine[]) {
  return {
    added: lines.filter((l) => l.type === 'added').length,
    removed: lines.filter((l) => l.type === 'removed').length,
    unchanged: lines.filter((l) => l.type === 'unchanged').length,
    totalOld: lines.filter((l) => l.type !== 'added').length,
    totalNew: lines.filter((l) => l.type !== 'removed').length,
  }
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  if (message.type === 'compute-diff') {
    const startTime = performance.now()

    try {
      const lines = computeDiff(message.oldText, message.newText, message.options)
      const stats = calculateStats(lines)
      const timing = performance.now() - startTime

      const response: DiffResponse = {
        type: 'diff-result',
        id: message.id,
        lines,
        stats,
        timing,
      }

      self.postMessage(response)
    } catch (error) {
      const response: ErrorResponse = {
        type: 'error',
        id: message.id,
        error: error instanceof Error ? error.message : 'Unknown error during diff computation',
      }

      self.postMessage(response)
    }
  }
}

export type { DiffLine, DiffRequest, DiffResponse, ErrorResponse, WorkerMessage, WorkerResponse }
