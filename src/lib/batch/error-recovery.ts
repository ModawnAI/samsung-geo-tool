import type { BatchErrorItem, BatchRecoveryState } from '@/types/errors'
import { isRetryableError, getRetryDelay } from '@/lib/api/error-handler'

const MAX_RETRY_ATTEMPTS = 3
const CONCURRENT_RECOVERIES = 3

export interface RecoveryOptions {
  maxRetries?: number
  concurrency?: number
  onProgress?: (recovered: number, total: number) => void
  onItemRecovered?: (itemId: string) => void
  onItemFailed?: (item: BatchErrorItem) => void
}

export type ProcessItemFn<T> = (itemId: string) => Promise<T>

export async function recoverBatchErrors<T>(
  failedItems: BatchErrorItem[],
  processItem: ProcessItemFn<T>,
  options: RecoveryOptions = {}
): Promise<BatchRecoveryState> {
  const {
    maxRetries = MAX_RETRY_ATTEMPTS,
    concurrency = CONCURRENT_RECOVERIES,
    onProgress,
    onItemRecovered,
    onItemFailed,
  } = options

  const state: BatchRecoveryState = {
    jobId: `recovery_${Date.now()}`,
    totalItems: failedItems.length,
    failedItems: [...failedItems],
    recoveredItems: [],
    status: 'recovering',
  }

  // Filter to only retryable items that haven't exceeded max attempts
  const retryableItems = failedItems.filter(
    (item) => item.retryable && item.retryCount < maxRetries
  )

  if (retryableItems.length === 0) {
    state.status = 'completed'
    return state
  }

  // Process items in batches with concurrency limit
  const queue = [...retryableItems]
  const processing = new Set<Promise<void>>()

  async function processNext(): Promise<void> {
    if (queue.length === 0) return

    const item = queue.shift()!
    const itemIndex = state.failedItems.findIndex((f) => f.itemId === item.itemId)

    try {
      // Calculate delay based on retry count
      const delay = getRetryDelay(
        { retryable: true, retryAfterMs: 1000 },
        item.retryCount
      )
      await sleep(delay)

      // Attempt recovery
      await processItem(item.itemId)

      // Success - remove from failed, add to recovered
      if (itemIndex !== -1) {
        state.failedItems.splice(itemIndex, 1)
      }
      state.recoveredItems.push(item.itemId)
      onItemRecovered?.(item.itemId)
    } catch (error) {
      // Update retry count
      if (itemIndex !== -1) {
        state.failedItems[itemIndex] = {
          ...item,
          retryCount: item.retryCount + 1,
          lastAttempt: new Date().toISOString(),
          retryable: isRetryableError(error) && item.retryCount + 1 < maxRetries,
        }
      }

      // If still retryable and under max attempts, re-queue
      if (isRetryableError(error) && item.retryCount + 1 < maxRetries) {
        queue.push({
          ...item,
          retryCount: item.retryCount + 1,
        })
      } else {
        onItemFailed?.(state.failedItems[itemIndex])
      }
    }

    onProgress?.(state.recoveredItems.length, state.totalItems)

    // Process next item
    await processNext()
  }

  // Start concurrent processing
  try {
    const workers = Array.from({ length: concurrency }, () => {
      const promise = processNext()
      processing.add(promise)
      return promise.finally(() => processing.delete(promise))
    })

    await Promise.all(workers)
    state.status = state.failedItems.length === 0 ? 'completed' : 'failed'
  } catch {
    state.status = 'failed'
  }

  return state
}

// Retry a single operation with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: unknown) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    initialDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options

  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isRetryableError(error) || attempt === maxAttempts - 1) {
        throw error
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)
      const jitter = Math.random() * 0.3 * delay

      onRetry?.(attempt + 1, error)
      await sleep(delay + jitter)
    }
  }

  throw lastError
}

// Create a retry queue for batch operations
export function createRetryQueue<T>(
  processItem: ProcessItemFn<T>,
  options: RecoveryOptions = {}
) {
  const failedItems: BatchErrorItem[] = []
  let isRecovering = false

  return {
    add(itemId: string, error: unknown): void {
      failedItems.push({
        itemId,
        error: error instanceof Error ? error.message : String(error),
        retryable: isRetryableError(error),
        retryCount: 0,
        lastAttempt: new Date().toISOString(),
      })
    },

    getFailedItems(): BatchErrorItem[] {
      return [...failedItems]
    },

    getRetryableCount(): number {
      return failedItems.filter((item) => item.retryable).length
    },

    async recover(): Promise<BatchRecoveryState> {
      if (isRecovering) {
        throw new Error('Recovery already in progress')
      }

      isRecovering = true
      try {
        const result = await recoverBatchErrors(failedItems, processItem, options)

        // Update failed items with recovery result
        failedItems.length = 0
        failedItems.push(...result.failedItems)

        return result
      } finally {
        isRecovering = false
      }
    },

    clear(): void {
      failedItems.length = 0
    },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
