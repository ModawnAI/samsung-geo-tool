import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Session timeout: 30 minutes (Samsung requirement)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

// Protected route prefixes
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/generate',
  '/history',
  '/briefs',
  '/tuning',
  '/analytics',
  '/reports',
  '/settings',
  '/content',
  '/tools',
]

// Admin route prefixes
const ADMIN_PREFIXES = [
  '/admin',
  '/tuning',
]

// Allowed IPs for admin access (comma-separated in env)
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',').map(ip => ip.trim()).filter(Boolean) || []

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Check route types
  const isProtectedPath = PROTECTED_PREFIXES.some((path) =>
    pathname.startsWith(path)
  )
  const isAdminPath = ADMIN_PREFIXES.some((path) =>
    pathname.startsWith(path)
  )

  // ========================================
  // 1. Authentication Check
  // ========================================
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // ========================================
  // 2. Admin IP Restriction
  // ========================================
  if (isAdminPath && user) {
    if (ADMIN_ALLOWED_IPS.length > 0) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown'

      if (!ADMIN_ALLOWED_IPS.includes(clientIP) && clientIP !== 'unknown') {
        console.warn(`[Security] Admin access denied for IP: ${clientIP}, User: ${user.id}`)
        return new NextResponse('Forbidden - IP not allowed for admin access', { status: 403 })
      }
    }
  }

  // ========================================
  // 3. Session Timeout Check
  // ========================================
  if (user && isProtectedPath) {
    const lastActivity = request.cookies.get('last_activity')?.value
    const now = Date.now()

    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10)
      if (now - lastActivityTime > SESSION_TIMEOUT_MS) {
        // Session expired - sign out and redirect
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('timeout', 'true')
        url.searchParams.set('redirectTo', pathname)

        const response = NextResponse.redirect(url)
        response.cookies.delete('last_activity')
        return response
      }
    }

    // Update last activity timestamp
    supabaseResponse.cookies.set('last_activity', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TIMEOUT_MS / 1000,
    })
  }

  // ========================================
  // 4. Login Page Redirect (already logged in)
  // ========================================
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    url.pathname = redirectTo || '/dashboard'
    url.searchParams.delete('redirectTo')
    return NextResponse.redirect(url)
  }

  // ========================================
  // 5. Root Redirect
  // ========================================
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
