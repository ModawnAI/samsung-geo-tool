import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Provide placeholder values for build time - actual values come from runtime env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// All protected route prefixes
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/generate',
  '/history',
  '/briefs',
  '/tuning',      // Phase 1
  '/analytics',   // Phase 3
  '/reports',     // Phase 3
  '/settings',
  '/content',
  '/tools',
]

// Phase-gated routes (require specific phase to be enabled)
const PHASE_PROTECTED_ROUTES: Record<string, 1 | 2 | 3> = {
  '/tuning': 1,
  '/analytics': 3,
  '/reports': 3,
}

function isPhaseEnabled(phase: 1 | 2 | 3): boolean {
  const envVar = `NEXT_PUBLIC_PHASE${phase}_ENABLED`
  return process.env[envVar] === 'true'
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route is protected
  const isProtectedPath = PROTECTED_PREFIXES.some((path) =>
    pathname.startsWith(path)
  )

  // Redirect to login if not authenticated on protected path
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Check phase-gated routes
  if (user) {
    for (const [route, requiredPhase] of Object.entries(PHASE_PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!isPhaseEnabled(requiredPhase)) {
          // Redirect to dashboard if phase not enabled
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
        break
      }
    }
  }

  // Redirect logged-in users from login page to dashboard (or redirect target)
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    url.pathname = redirectTo || '/dashboard'
    url.searchParams.delete('redirectTo')
    return NextResponse.redirect(url)
  }

  // Redirect root to dashboard if logged in, login if not
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
