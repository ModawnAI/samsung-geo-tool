export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'database'
  | 'external_api'
  | 'rate_limit'
  | 'unknown'

export interface APIErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface APIErrorDetails {
  code: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  retryAfterMs?: number
  context?: Record<string, unknown>
}

export interface BatchErrorItem {
  itemId: string
  error: string
  errorDetails?: APIErrorDetails
  retryable: boolean
  retryCount: number
  lastAttempt: string
}

export interface BatchErrorSummary {
  totalItems: number
  successCount: number
  failureCount: number
  retryableCount: number
  errors: BatchErrorItem[]
}

export interface BatchRecoveryState {
  jobId: string
  totalItems: number
  failedItems: BatchErrorItem[]
  recoveredItems: string[]
  status: 'pending' | 'recovering' | 'completed' | 'failed'
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}
