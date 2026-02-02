# Samsung GEO Tool - Security Implementation Plan (Internal Employee Tool)

**Date:** 2026-02-02
**Scope:** Internal Samsung employee tool - streamlined requirements
**Based on:** Samsung SSC-E2-05/E2-07 Security Standards

---

## Executive Summary

This implementation plan covers all security requirements for an internal Samsung employee web application. Age verification and public privacy requirements are excluded as all users are Samsung employees.

### Current State
- ✅ Basic auth protection via Supabase
- ✅ HTTPS via Vercel
- ❌ No security headers
- ❌ No session timeout
- ❌ No account lockout
- ❌ No custom error pages
- ❌ No access logging
- ❌ No admin protection (MFA/IP)
- ❌ No input validation utilities
- ❌ No rate limiting

---

## Implementation Phases

### Phase 1: Critical Security (Immediate)
1. Security Headers Configuration
2. Enhanced Middleware (Session Timeout, Admin Protection)
3. Custom Error Pages
4. Input Validation Utilities
5. Rate Limiting

### Phase 2: Access Control & Logging
6. Account Lockout Mechanism
7. Access Logging System
8. Concurrent Login Prevention (Optional)
9. API Route Security Wrapper

### Phase 3: Database & Compliance
10. Database Schema for Security Tables
11. RLS Policies
12. Password Policy Enforcement
13. Data Retention Policies

---

## Phase 1: Critical Security

### 1.1 Security Headers Configuration

**File: `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent DNS prefetch leaks
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  // Force HTTPS for 2 years
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  // XSS Protection (legacy browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // Prevent MIME sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Referrer policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Permissions Policy - disable unused browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.cohere.ai https://api.perplexity.ai",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Stricter cache control for authenticated pages
        source: '/(dashboard|generate|history|admin|settings|tuning|briefs|analytics|reports|content|tools)/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ],
      }
    ];
  },
  // Disable x-powered-by header (hides Next.js version)
  poweredByHeader: false,
};

export default nextConfig;
```

---

### 1.2 Enhanced Middleware

**File: `middleware.ts`**

```typescript
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
  '/tuning', // Prompt tuning is admin-level
]

// Allowed IPs for admin access (comma-separated in env)
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || []

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

  const { data: { user }, error } = await supabase.auth.getUser()
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
```

---

### 1.3 Custom Error Pages

**File: `src/app/error.tsx`**

```typescript
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service (not exposed to user)
    console.error('[App Error]', error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">오류가 발생했습니다</h1>
        <p className="text-muted-foreground">
          요청을 처리하는 중 문제가 발생했습니다.
        </p>
        <p className="text-sm text-muted-foreground">
          문제가 지속되면 관리자에게 문의하세요.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            참조 코드: {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
```

**File: `src/app/not-found.tsx`**

```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  )
}
```

**File: `src/app/global-error.tsx`**

```typescript
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            시스템 오류가 발생했습니다
          </h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            잠시 후 다시 시도해주세요.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#999' }}>
              참조 코드: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
```

---

### 1.4 Input Validation Utilities

**File: `src/lib/security/validation.ts`**

```typescript
import { z } from 'zod'

// ========================================
// SQL Injection Detection
// ========================================
const SQL_INJECTION_PATTERNS = [
  /(\b(select|insert|update|delete|drop|create|alter|truncate|exec|execute|union)\b)/i,
  /(--|;|'|"|\\)/,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
  /(\bor\b\s+'[^']*'\s*=\s*'[^']*')/i,
  /(\/\*[\s\S]*?\*\/)/,
  /(\bwaitfor\b\s+\bdelay\b)/i,
  /(\bsleep\b\s*\(\s*\d+\s*\))/i,
]

export function hasSQLInjection(input: string): boolean {
  if (typeof input !== 'string') return false
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

// ========================================
// XSS Detection & Sanitization
// ========================================
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /<input[^>]+type\s*=\s*["']?hidden/gi,
]

export function hasXSS(input: string): boolean {
  if (typeof input !== 'string') return false
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return input

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// ========================================
// Path Traversal Detection
// ========================================
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%2e%2e%5c/gi,
  /%00/g, // Null byte
  /\0/g,
]

export function hasPathTraversal(input: string): boolean {
  if (typeof input !== 'string') return false
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input))
}

// ========================================
// Comprehensive Input Validation
// ========================================
export interface ValidationResult {
  valid: boolean
  errors: string[]
  sanitized?: string
}

export function validateInput(input: string, options?: {
  maxLength?: number
  allowHTML?: boolean
  checkSQL?: boolean
  checkXSS?: boolean
  checkPath?: boolean
}): ValidationResult {
  const {
    maxLength = 10000,
    allowHTML = false,
    checkSQL = true,
    checkXSS = true,
    checkPath = true,
  } = options || {}

  const errors: string[] = []

  if (typeof input !== 'string') {
    return { valid: false, errors: ['Input must be a string'] }
  }

  if (input.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength}`)
  }

  if (checkSQL && hasSQLInjection(input)) {
    errors.push('Potential SQL injection detected')
  }

  if (checkXSS && hasXSS(input)) {
    errors.push('Potential XSS attack detected')
  }

  if (checkPath && hasPathTraversal(input)) {
    errors.push('Path traversal attempt detected')
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: allowHTML ? input : sanitizeHTML(input),
  }
}

// ========================================
// Zod Schemas for Common Validations
// ========================================
export const emailSchema = z.string()
  .email('올바른 이메일 형식이 아닙니다')
  .max(255)
  .refine(val => !hasSQLInjection(val), 'Invalid input')
  .refine(val => !hasXSS(val), 'Invalid input')

export const passwordSchema = z.string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(128, '비밀번호가 너무 깁니다')
  .regex(/[A-Za-z]/, '비밀번호에 영문자가 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다')
  .regex(/[^A-Za-z0-9]/, '비밀번호에 특수문자가 포함되어야 합니다')

export const usernameSchema = z.string()
  .min(2, '이름은 최소 2자 이상이어야 합니다')
  .max(50)
  .regex(/^[a-zA-Z0-9가-힣_-]+$/, '이름에 허용되지 않는 문자가 포함되어 있습니다')

// ========================================
// File Upload Validation
// ========================================
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  srt: ['text/plain', 'application/x-subrip', 'text/srt'],
} as const

export function validateFileUpload(
  file: { name: string; type: string; size: number },
  options: {
    allowedTypes: string[]
    maxSizeMB?: number
  }
): ValidationResult {
  const { allowedTypes, maxSizeMB = 50 } = options
  const errors: string[] = []

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`파일 형식 ${file.type}은(는) 허용되지 않습니다`)
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    errors.push(`파일 크기가 ${maxSizeMB}MB를 초과합니다`)
  }

  // Check for null bytes in filename (path traversal attempt)
  if (file.name.includes('\0') || file.name.includes('%00')) {
    errors.push('잘못된 파일명입니다')
  }

  // Check for path traversal in filename
  if (hasPathTraversal(file.name)) {
    errors.push('잘못된 파일명입니다')
  }

  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const expectedExts: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt', 'srt'],
  }

  if (ext && expectedExts[file.type] && !expectedExts[file.type].includes(ext)) {
    errors.push('파일 확장자가 파일 형식과 일치하지 않습니다')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ========================================
// URL Validation (Open Redirect Prevention)
// ========================================
const ALLOWED_REDIRECT_HOSTS = [
  // Add allowed external hosts here
]

export function isValidRedirectUrl(url: string, currentHost: string): boolean {
  try {
    const parsed = new URL(url, `https://${currentHost}`)

    // Allow same-origin redirects
    if (parsed.host === currentHost) {
      return true
    }

    // Allow whitelisted external hosts
    if (ALLOWED_REDIRECT_HOSTS.includes(parsed.host)) {
      return true
    }

    // Block javascript: and data: URLs
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return false
    }

    return false
  } catch {
    // Relative URLs are okay
    return url.startsWith('/') && !url.startsWith('//')
  }
}
```

---

### 1.5 Rate Limiting

**File: `src/lib/security/rate-limit.ts`**

```typescript
// Simple in-memory rate limiting
// For production, use Redis or Upstash

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

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
```

---

## Phase 2: Access Control & Logging

### 2.1 Account Lockout Mechanism

**File: `src/lib/security/account-lockout.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export interface LoginAttemptResult {
  allowed: boolean
  remainingAttempts: number
  lockedUntil?: Date
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress: string
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('login_attempts').insert({
    email: email.toLowerCase(),
    ip_address: ipAddress,
    success,
    created_at: new Date().toISOString(),
  })
}

export async function checkAccountLockout(email: string): Promise<LoginAttemptResult> {
  const supabase = await createClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - LOCKOUT_DURATION_MS)

  // Count failed attempts in the lockout window
  const { count, error } = await supabase
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.toLowerCase())
    .eq('success', false)
    .gte('created_at', windowStart.toISOString())

  if (error) {
    console.error('[Security] Failed to check login attempts:', error)
    // Fail open - allow login but log the error
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS }
  }

  const failedCount = count || 0

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    // Get the most recent failed attempt to calculate lockout end time
    const { data: lastAttempt } = await supabase
      .from('login_attempts')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lockedUntil = lastAttempt
      ? new Date(new Date(lastAttempt.created_at).getTime() + LOCKOUT_DURATION_MS)
      : new Date(now.getTime() + LOCKOUT_DURATION_MS)

    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - failedCount,
  }
}

export async function clearLoginAttempts(email: string): Promise<void> {
  const supabase = await createClient()

  // On successful login, we don't delete old attempts (for audit)
  // but the lockout check uses a time window, so old attempts become irrelevant
}
```

---

### 2.2 Access Logging System

**File: `src/lib/security/access-log.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type AccessAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'page_view'
  | 'api_call'
  | 'data_access'
  | 'data_create'
  | 'data_update'
  | 'data_delete'
  | 'file_upload'
  | 'file_download'
  | 'settings_change'
  | 'admin_action'

export interface AccessLogEntry {
  user_id: string | null
  action: AccessAction
  resource: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, any>
}

export async function logAccess(entry: AccessLogEntry): Promise<void> {
  try {
    const supabase = await createClient()
    const headersList = await headers()

    const ipAddress = entry.ip_address
      || headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || 'unknown'

    const userAgent = entry.user_agent
      || headersList.get('user-agent')
      || 'unknown'

    await supabase.from('access_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id,
      ip_address: ipAddress,
      user_agent: userAgent.substring(0, 500), // Truncate long user agents
      details: entry.details,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    // Log to console as fallback - never fail the main request
    console.error('[Access Log Error]', error)
    console.log('[Access Log Fallback]', JSON.stringify(entry))
  }
}

// Convenience functions for common log types
export async function logPageView(userId: string, path: string): Promise<void> {
  await logAccess({
    user_id: userId,
    action: 'page_view',
    resource: path,
  })
}

export async function logApiCall(userId: string | null, endpoint: string, method: string): Promise<void> {
  await logAccess({
    user_id: userId,
    action: 'api_call',
    resource: endpoint,
    details: { method },
  })
}

export async function logDataAccess(
  userId: string,
  table: string,
  recordId: string,
  action: 'data_access' | 'data_create' | 'data_update' | 'data_delete'
): Promise<void> {
  await logAccess({
    user_id: userId,
    action,
    resource: table,
    resource_id: recordId,
  })
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAccess({
    user_id: adminId,
    action: 'admin_action',
    resource: action,
    resource_id: targetUserId,
    details,
  })
}
```

---

### 2.3 API Route Security Wrapper

**File: `src/lib/security/api-guard.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, type RateLimitOptions } from './rate-limit'
import { logApiCall } from './access-log'
import { validateInput } from './validation'

export interface ApiGuardOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  rateLimit?: RateLimitOptions
  logAccess?: boolean
}

export type ApiHandler = (
  request: NextRequest,
  context: {
    user: any | null
    supabase: any
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
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

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
      await logApiCall(user?.id || null, request.nextUrl.pathname, request.method)
    }

    // ========================================
    // 5. Call Handler
    // ========================================
    try {
      const response = await handler(request, { user, supabase })

      // Add rate limit headers to response
      const headers = new Headers(response.headers)
      headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
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

// Helper to validate request body
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid request body', details: error.errors || error.message },
        { status: 400 }
      ),
    }
  }
}
```

---

## Phase 3: Database & Compliance

### 3.1 Database Schema for Security Tables

**Run via Supabase MCP or SQL Editor:**

```sql
-- =============================================
-- 1. LOGIN ATTEMPTS (Account Lockout)
-- =============================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_success ON login_attempts(email, success);

-- =============================================
-- 2. ACCESS LOGS (1+ year retention)
-- =============================================
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_resource ON access_logs(resource);

-- =============================================
-- 3. ACCOUNT AUDIT LOG (3+ years - Korean law)
-- =============================================
CREATE TABLE IF NOT EXISTS account_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- 'created', 'deleted', 'modified', 'suspended', 'password_changed', 'role_changed'
  user_id UUID,
  admin_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_audit_user ON account_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_account_audit_created ON account_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_account_audit_action ON account_audit_log(action);

-- =============================================
-- 4. ACTIVE SESSIONS (Optional - Concurrent Login Prevention)
-- =============================================
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- Only one active session per user
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);

-- =============================================
-- 5. EXTEND USER PROFILES (if exists)
-- =============================================
-- Check if user_profiles exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Add security-related columns
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- 6. CLEANUP FUNCTIONS (Data Retention)
-- =============================================

-- Delete login attempts older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete access logs older than 1 year
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete account audit logs older than 3 years
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM account_audit_log WHERE created_at < NOW() - INTERVAL '3 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. ACCOUNT LOCKOUT HELPER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION is_account_locked(check_email TEXT)
RETURNS TABLE (
  locked BOOLEAN,
  failed_count INTEGER,
  locked_until TIMESTAMPTZ
) AS $$
DECLARE
  v_failed_count INTEGER;
  v_last_failed TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MAX(created_at)
  INTO v_failed_count, v_last_failed
  FROM login_attempts
  WHERE email = LOWER(check_email)
    AND success = FALSE
    AND created_at > NOW() - INTERVAL '30 minutes';

  IF v_failed_count >= 5 THEN
    RETURN QUERY SELECT
      TRUE,
      v_failed_count,
      v_last_failed + INTERVAL '30 minutes';
  ELSE
    RETURN QUERY SELECT
      FALSE,
      v_failed_count,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3.2 RLS Policies

```sql
-- =============================================
-- Enable RLS on Security Tables
-- =============================================
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- LOGIN ATTEMPTS - Service role only
-- =============================================
CREATE POLICY "Service role can manage login_attempts" ON login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- ACCESS LOGS - Users see own, admins see all
-- =============================================
CREATE POLICY "Users can view own access logs" ON access_logs
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all access logs" ON access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert access logs" ON access_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- ACCOUNT AUDIT LOG - Admins only
-- =============================================
CREATE POLICY "Admins can view audit logs" ON account_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage audit logs" ON account_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- ACTIVE SESSIONS - Users see own
-- =============================================
CREATE POLICY "Users can view own sessions" ON active_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage sessions" ON active_sessions
  FOR ALL USING (auth.role() = 'service_role');
```

---

### 3.3 Environment Variables Required

Add to `.env.local` and Vercel:

```env
# Existing Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bizvgdpbuhvvgfihmlgj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security - Admin IP Restriction (comma-separated)
ADMIN_ALLOWED_IPS=

# Security - Session Timeout (optional, defaults to 30 min)
SESSION_TIMEOUT_SECONDS=1800

# Rate Limiting (optional, for Redis in production)
# REDIS_URL=redis://...
```

---

## Implementation Checklist

### Phase 1: Critical Security ✅
- [ ] Update `next.config.ts` with security headers
- [ ] Update `middleware.ts` with session timeout & admin protection
- [ ] Create `src/app/error.tsx`
- [ ] Create `src/app/not-found.tsx`
- [ ] Create `src/app/global-error.tsx`
- [ ] Create `src/lib/security/validation.ts`
- [ ] Create `src/lib/security/rate-limit.ts`

### Phase 2: Access Control & Logging
- [ ] Create `src/lib/security/account-lockout.ts`
- [ ] Create `src/lib/security/access-log.ts`
- [ ] Create `src/lib/security/api-guard.ts`
- [ ] Run database migrations for security tables
- [ ] Apply RLS policies

### Phase 3: Integration
- [ ] Update login flow to use account lockout
- [ ] Wrap API routes with `withApiGuard`
- [ ] Add access logging to key user actions
- [ ] Set up scheduled cleanup functions in Supabase
- [ ] Test all security features

### Verification
- [ ] Security headers visible in browser DevTools
- [ ] Session expires after 30 min inactivity
- [ ] Account locks after 5 failed logins
- [ ] Custom error pages show (no stack traces)
- [ ] Rate limiting works on API routes
- [ ] Access logs being recorded
- [ ] Admin pages require allowed IP (if configured)

---

*Document Version: 1.0*
*Created: 2026-02-02*
*Target: Internal Samsung Employee Tool*
*Based on Samsung SSC-E2-05/E2-07 Security Standards*
