import type { APIErrorDetails, ErrorCategory, ErrorSeverity } from '@/types/errors'

export class APIError extends Error {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly retryable: boolean
  public readonly retryAfterMs?: number
  public readonly context?: Record<string, unknown>
  public readonly statusCode: number

  constructor(details: APIErrorDetails & { statusCode?: number }) {
    super(details.message)
    this.name = 'APIError'
    this.code = details.code
    this.category = details.category
    this.severity = details.severity
    this.retryable = details.retryable
    this.retryAfterMs = details.retryAfterMs
    this.context = details.context
    this.statusCode = details.statusCode || 500

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }
  }

  toJSON(): APIErrorDetails {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      context: this.context,
    }
  }
}

// Pre-defined error factories
export const Errors = {
  // Validation errors
  validation: (message: string, context?: Record<string, unknown>) =>
    new APIError({
      code: 'VALIDATION_ERROR',
      message,
      category: 'validation',
      severity: 'low',
      retryable: false,
      statusCode: 400,
      context,
    }),

  // Authentication errors
  unauthorized: (message = 'Authentication required') =>
    new APIError({
      code: 'UNAUTHORIZED',
      message,
      category: 'authentication',
      severity: 'medium',
      retryable: false,
      statusCode: 401,
    }),

  // Authorization errors
  forbidden: (message = 'Access denied') =>
    new APIError({
      code: 'FORBIDDEN',
      message,
      category: 'authorization',
      severity: 'medium',
      retryable: false,
      statusCode: 403,
    }),

  // Not found
  notFound: (resource: string) =>
    new APIError({
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      category: 'validation',
      severity: 'low',
      retryable: false,
      statusCode: 404,
    }),

  // Rate limiting
  rateLimit: (retryAfterMs: number) =>
    new APIError({
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      category: 'rate_limit',
      severity: 'medium',
      retryable: true,
      retryAfterMs,
      statusCode: 429,
    }),

  // Database errors
  database: (message: string, context?: Record<string, unknown>) =>
    new APIError({
      code: 'DATABASE_ERROR',
      message,
      category: 'database',
      severity: 'high',
      retryable: true,
      retryAfterMs: 1000,
      statusCode: 500,
      context,
    }),

  // External API errors
  externalAPI: (
    service: string,
    message: string,
    retryable = true
  ) =>
    new APIError({
      code: 'EXTERNAL_API_ERROR',
      message: `${service}: ${message}`,
      category: 'external_api',
      severity: 'high',
      retryable,
      retryAfterMs: retryable ? 2000 : undefined,
      statusCode: 502,
      context: { service },
    }),

  // Network errors
  network: (message: string) =>
    new APIError({
      code: 'NETWORK_ERROR',
      message,
      category: 'network',
      severity: 'high',
      retryable: true,
      retryAfterMs: 1000,
      statusCode: 503,
    }),

  // Generic internal error
  internal: (message = 'An unexpected error occurred') =>
    new APIError({
      code: 'INTERNAL_ERROR',
      message,
      category: 'unknown',
      severity: 'critical',
      retryable: false,
      statusCode: 500,
    }),
}

// Error response helper for API routes
export function errorResponse(error: unknown) {
  if (error instanceof APIError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        category: error.category,
        retryable: error.retryable,
        retryAfterMs: error.retryAfterMs,
      },
      { status: error.statusCode }
    )
  }

  // Handle unknown errors
  console.error('Unhandled error:', error)
  const internalError = Errors.internal()
  return Response.json(
    {
      error: internalError.message,
      code: internalError.code,
    },
    { status: 500 }
  )
}

// Parse error from API response
export async function parseAPIError(response: Response): Promise<APIError> {
  try {
    const data = await response.json()
    return new APIError({
      code: data.code || 'UNKNOWN_ERROR',
      message: data.error || 'An error occurred',
      category: data.category || 'unknown',
      severity: response.status >= 500 ? 'high' : 'medium',
      retryable: data.retryable || false,
      retryAfterMs: data.retryAfterMs,
      statusCode: response.status,
    })
  } catch {
    return Errors.internal(`HTTP ${response.status}: ${response.statusText}`)
  }
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    return error.retryable
  }
  // Network errors are typically retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  return false
}

// Get retry delay from error
export function getRetryDelay(error: unknown, attempt: number): number {
  const baseDelay = 1000
  const maxDelay = 30000

  if (error instanceof APIError && error.retryAfterMs) {
    return Math.min(error.retryAfterMs, maxDelay)
  }

  // Exponential backoff with jitter
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  const jitter = Math.random() * 0.3 * exponentialDelay
  return exponentialDelay + jitter
}
