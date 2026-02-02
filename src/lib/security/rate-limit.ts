// Simple in-memory rate limiting
// For production, consider using Redis or Upstash

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries periodically (only in non-edge runtime)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000) // Clean every minute
}

export interface RateLimitOptions {
  limit: number      // Max requests
  windowMs: number   // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 100, windowMs: 60000 }
): RateLimitResult {
  const { limit, windowMs } = options
  const now = Date.now()
  const key = identifier

  let record = rateLimitStore.get(key)

  // Reset if window expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs }
    rateLimitStore.set(key, record)
  }

  record.count++

  return {
    allowed: record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime,
  }
}

// Preset rate limits for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints - strict
  login: { limit: 5, windowMs: 15 * 60 * 1000 },      // 5 per 15 min
  signup: { limit: 3, windowMs: 60 * 60 * 1000 },     // 3 per hour
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 },

  // API endpoints - moderate
  generate: { limit: 30, windowMs: 60 * 1000 },       // 30 per minute
  analyze: { limit: 10, windowMs: 60 * 1000 },        // 10 per minute

  // General API - lenient
  api: { limit: 100, windowMs: 60 * 1000 },           // 100 per minute

  // File uploads - strict
  upload: { limit: 10, windowMs: 60 * 1000 },         // 10 per minute
}

// Helper to get client identifier (IP + optional user ID)
export function getClientIdentifier(
  ip: string | null,
  userId?: string,
  endpoint?: string
): string {
  const parts = [ip || 'unknown']
  if (userId) parts.push(userId)
  if (endpoint) parts.push(endpoint)
  return parts.join(':')
}
