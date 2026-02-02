import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, type RateLimitOptions } from './rate-limit'
import { logApiCall } from './access-log'

export interface ApiGuardOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  rateLimit?: RateLimitOptions
  logAccess?: boolean
}

export type ApiHandler = (
  request: NextRequest,
  context: {
    user: { id: string; email?: string } | null
    supabase: Awaited<ReturnType<typeof createClient>>
  }
) => Promise<NextResponse>

export function withApiGuard(
  handler: ApiHandler,
  options: ApiGuardOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  const {
    requireAuth = true,
    requireAdmin = false,
    rateLimit = RATE_LIMITS.api,
    logAccess = true,
  } = options

  return async (request: NextRequest) => {
    const supabase = await createClient()

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    // ========================================
    // 1. Rate Limiting
    // ========================================
    const { data: { user } } = await supabase.auth.getUser()
    const rateLimitKey = getClientIdentifier(clientIP, user?.id, request.nextUrl.pathname)
    const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          }
        }
      )
    }

    // ========================================
    // 2. Authentication Check
    // ========================================
    if (requireAuth && !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ========================================
    // 3. Admin Role Check
    // ========================================
    if (requireAdmin && user) {
      // Cast to any since user_profiles may not be in generated types
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single() as { data: { role: string } | null }

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }
    }

    // ========================================
    // 4. Log API Access
    // ========================================
    if (logAccess) {
      // Fire and forget - don't block the request
      logApiCall(user?.id || null, request.nextUrl.pathname, request.method).catch(() => {})
    }

    // ========================================
    // 5. Call Handler
    // ========================================
    try {
      const response = await handler(request, { user, supabase })

      // Add rate limit headers to response
      const newHeaders = new Headers(response.headers)
      newHeaders.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (error) {
      console.error(`[API Error] ${request.nextUrl.pathname}:`, error)

      // Don't expose internal error details
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Helper to validate request body with a Zod schema
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid request body'
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid request body', details: errorMessage },
        { status: 400 }
      ),
    }
  }
}
