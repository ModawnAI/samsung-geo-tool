# Samsung Geo Tool - Security Implementation Plan

## Current State Assessment

### ✅ Already Implemented
1. **Supabase Auth** - Basic authentication via Supabase
2. **Protected Routes** - Middleware protecting dashboard, generate, history, etc.
3. **HTTPS** - Vercel provides automatic HTTPS
4. **Session Management** - Supabase SSR session handling

### ❌ Missing (Critical)
1. Security headers not configured
2. No password complexity enforcement
3. No account lockout mechanism
4. No session timeout
5. No admin-specific protection (MFA/IP restriction)
6. No access logging
7. No input validation middleware
8. No rate limiting
9. No CSP headers
10. API routes not validating session server-side

---

## Phase 1: Critical Security (Immediate - Before Any Production Use)

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
  // Permissions Policy
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
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com",
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
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Stricter cache control for authenticated pages
        source: '/(dashboard|generate|history|admin|settings)/:path*',
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
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
```

### 1.2 Session Timeout & Enhanced Middleware

**File: `middleware.ts`**

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Session timeout in seconds (30 minutes = 1800 seconds)
const SESSION_TIMEOUT = 30 * 60

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

const ADMIN_PREFIXES = [
  '/admin',
]

// Allowed IPs for admin access (add your IPs here)
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',') || []

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

  // Check if route is protected
  const isProtectedPath = PROTECTED_PREFIXES.some((path) =>
    pathname.startsWith(path)
  )

  const isAdminPath = ADMIN_PREFIXES.some((path) =>
    pathname.startsWith(path)
  )

  // Handle protected routes
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Handle admin routes with IP restriction
  if (isAdminPath) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // IP restriction for admin
    if (ADMIN_ALLOWED_IPS.length > 0) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || request.headers.get('x-real-ip')
        || 'unknown'
      
      if (!ADMIN_ALLOWED_IPS.includes(clientIP) && clientIP !== 'unknown') {
        console.warn(`Admin access denied for IP: ${clientIP}`)
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // TODO: Add MFA check here when implemented
    // const hasMFA = await checkMFA(user.id)
    // if (!hasMFA) { redirect to MFA setup }
  }

  // Check session age for timeout
  if (user && (isProtectedPath || isAdminPath)) {
    const session = await supabase.auth.getSession()
    if (session.data.session) {
      const sessionAge = Date.now() / 1000 - (session.data.session.expires_at || 0) + (session.data.session.expires_in || 0)
      if (sessionAge > SESSION_TIMEOUT) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('timeout', 'true')
        return NextResponse.redirect(url)
      }
    }
  }

  // Login page redirect for authenticated users
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    url.pathname = redirectTo || '/dashboard'
    url.searchParams.delete('redirectTo')
    return NextResponse.redirect(url)
  }

  // Root redirect
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

### 1.3 API Route Security Wrapper

**File: `src/lib/api/auth-guard.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean }
) {
  return async (req: NextRequest) => {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (!user || error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Log the API access
    console.log(`[API Access] User: ${user.id}, Path: ${req.nextUrl.pathname}, Time: ${new Date().toISOString()}`)

    // Check for admin role if required
    if (options?.requireAdmin) {
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

    return handler(req, user)
  }
}

// Rate limiting helper (simple in-memory, use Redis for production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}
```

### 1.4 Input Validation Utilities

**File: `src/lib/security/validation.ts`**

```typescript
import { z } from 'zod'

// SQL Injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(select|insert|update|delete|drop|create|alter|truncate|exec|execute)\b)/i,
  /(--|;|'|"|\\)/,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
]

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=/gi,
  /javascript:/gi,
  /data:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
]

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input
  
  let sanitized = input
  
  // Remove potential XSS
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })
  
  // HTML encode special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  
  return sanitized
}

export function hasSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

export function hasXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

// Zod schemas for common validations
export const emailSchema = z.string().email().max(255)
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const usernameSchema = z.string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')

// File upload validation
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'text/csv'],
  videos: ['video/mp4', 'video/webm'],
}

export function validateFileUpload(file: File, allowedTypes: string[], maxSizeMB: number = 10): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` }
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }
  
  // Check for null bytes in filename
  if (file.name.includes('\0') || file.name.includes('%00')) {
    return { valid: false, error: 'Invalid filename' }
  }
  
  return { valid: true }
}
```

### 1.5 PII Masking Utilities

**File: `src/lib/security/pii-masking.ts`**

```typescript
/**
 * Mask email address for display
 * example@gmail.com → e*****@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  if (local.length <= 1) return `*@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`
}

/**
 * Mask phone number for display
 * 010-1234-5678 → 010-****-5678
 * 01012345678 → 010****5678
 */
export function maskPhone(phone: string): string {
  if (!phone) return phone
  // Handle various formats
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`
  }
  // Fallback: mask middle portion
  const mid = Math.floor(phone.length / 2)
  return phone.slice(0, 3) + '*'.repeat(4) + phone.slice(-4)
}

/**
 * Mask name for display
 * 홍길동 → 홍*동
 * John Doe → J*** D**
 */
export function maskName(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return `${name[0]}*`
  if (name.length === 3) return `${name[0]}*${name[2]}`
  // For longer names, show first and last char
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`
}
```

### 1.6 Concurrent Login Prevention

**File: `src/lib/security/session-control.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function enforcesSingleSession(userId: string, newSessionToken: string) {
  const supabase = await createClient()
  
  // Invalidate all other sessions for this user
  await supabase
    .from('active_sessions')
    .delete()
    .eq('user_id', userId)
    .neq('session_token', newSessionToken)
  
  // Record the new session
  await supabase
    .from('active_sessions')
    .upsert({
      user_id: userId,
      session_token: newSessionToken,
      last_active_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })
}

export async function isSessionValid(userId: string, sessionToken: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('active_sessions')
    .select('session_token')
    .eq('user_id', userId)
    .single()
  
  return data?.session_token === sessionToken
}
```

### 1.7 Password Expiry Check

**File: `src/lib/security/password-policy.ts`**

```typescript
const PASSWORD_MAX_AGE_DAYS = 90

export function isPasswordExpired(lastChanged: Date | string | null): boolean {
  if (!lastChanged) return true // Never changed = expired
  
  const lastChangedDate = new Date(lastChanged)
  const daysSinceChange = (Date.now() - lastChangedDate.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysSinceChange > PASSWORD_MAX_AGE_DAYS
}

export function daysUntilPasswordExpiry(lastChanged: Date | string | null): number {
  if (!lastChanged) return 0
  
  const lastChangedDate = new Date(lastChanged)
  const daysSinceChange = (Date.now() - lastChangedDate.getTime()) / (1000 * 60 * 60 * 24)
  
  return Math.max(0, PASSWORD_MAX_AGE_DAYS - Math.floor(daysSinceChange))
}

// Check password history to prevent reuse
export async function isPasswordReused(
  supabase: any, 
  userId: string, 
  newPasswordHash: string,
  historyCount: number = 3
): Promise<boolean> {
  const { data: history } = await supabase
    .from('password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(historyCount)
  
  return history?.some((h: any) => h.password_hash === newPasswordHash) ?? false
}
```

### 1.8 Age Verification (Korean Privacy Law)

**File: `src/lib/security/age-verification.ts`**

```typescript
import { z } from 'zod'

const MINIMUM_AGE = 14 // Korean PIPA requires parental consent under 14

export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

export function requiresParentalConsent(birthDate: Date): boolean {
  return calculateAge(birthDate) < MINIMUM_AGE
}

export const ageVerificationSchema = z.object({
  birthDate: z.coerce.date(),
  parentalConsentGiven: z.boolean().optional(),
  parentEmail: z.string().email().optional(),
}).refine((data) => {
  const age = calculateAge(data.birthDate)
  // Under 14 requires parental consent
  if (age < MINIMUM_AGE) {
    return data.parentalConsentGiven === true && !!data.parentEmail
  }
  return true
}, {
  message: "만 14세 미만은 법정대리인(부모)의 동의가 필요합니다.",
  path: ["parentalConsentGiven"]
})
```

### 1.9 Access Logging Service

**File: `src/lib/security/access-log.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

interface AccessLogEntry {
  user_id: string
  action: 'login' | 'logout' | 'api_call' | 'page_view' | 'data_access' | 'data_modify'
  resource: string
  ip_address: string
  user_agent: string
  details?: Record<string, any>
}

export async function logAccess(entry: AccessLogEntry) {
  try {
    const supabase = await createClient()
    
    await supabase.from('access_logs').insert({
      ...entry,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    // Log to console as fallback, don't fail the request
    console.error('[Access Log Error]', error)
    console.log('[Access Log Fallback]', JSON.stringify(entry))
  }
}

// SQL for creating the access_logs table:
/*
CREATE TABLE access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_access_logs_action ON access_logs(action);

-- Retain for 1 year, then auto-delete
CREATE OR REPLACE FUNCTION delete_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;
*/
```

---

## Phase 2: Enhanced Security (Before Samsung Production)

### 2.1 MFA Implementation
- Integrate TOTP-based MFA for admin users
- Use Supabase Auth MFA features or custom implementation

### 2.2 Password Policy Enforcement
- Create Supabase Edge Function for password validation
- Enforce on sign-up and password change

### 2.3 Account Lockout
- Track failed login attempts in Supabase
- Lock account after 5 failed attempts for 30 minutes

### 2.4 Privacy Compliance
- Add privacy policy page
- Implement consent collection flow
- Add data export/deletion features

---

## Phase 3: Audit & Monitoring

### 3.1 Security Monitoring Dashboard
- Real-time failed login monitoring
- Unusual access pattern detection
- API abuse detection

### 3.2 Automated Security Scanning
- Weekly vulnerability scans
- Dependency vulnerability checks (npm audit)

### 3.3 Incident Response
- Document incident response procedures
- Set up security alert channels

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Security
ADMIN_ALLOWED_IPS=192.168.1.1,10.0.0.1
SESSION_TIMEOUT_SECONDS=1800

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Database Schema Required

```sql
-- =============================================
-- 1. ACCESS LOGS (1+ year retention)
-- =============================================
CREATE TABLE access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_access_logs_action ON access_logs(action);

-- =============================================
-- 2. ACCOUNT AUDIT LOG (3+ year retention - Korean privacy law)
-- =============================================
CREATE TABLE account_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- 'created', 'deleted', 'modified', 'suspended', 'password_changed'
  user_id UUID,
  admin_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_account_audit_created ON account_audit_log(created_at);

-- =============================================
-- 3. ACTIVE SESSIONS (concurrent login prevention)
-- =============================================
CREATE TABLE active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- Only one active session per user
);

CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);

-- =============================================
-- 4. PASSWORD HISTORY (prevent reuse)
-- =============================================
CREATE TABLE password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_history_user ON password_history(user_id);

-- =============================================
-- 5. LOGIN ATTEMPTS (account lockout)
-- =============================================
CREATE TABLE login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(check_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INT;
  last_failed TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MAX(created_at)
  INTO failed_count, last_failed
  FROM login_attempts
  WHERE email = check_email
    AND success = FALSE
    AND created_at > NOW() - INTERVAL '30 minutes';
  
  -- Lock after 5 failed attempts within 30 minutes
  RETURN failed_count >= 5;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. USER PROFILES (extend with security fields)
-- =============================================
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

-- =============================================
-- 7. DATA RETENTION POLICIES (scheduled cleanup)
-- =============================================

-- Delete access logs older than 1 year
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Delete account audit logs older than 3 years
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM account_audit_log WHERE created_at < NOW() - INTERVAL '3 years';
END;
$$ LANGUAGE plpgsql;

-- Delete old login attempts (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule these with pg_cron or Supabase scheduled functions
```

---

## Supabase RLS Policies Required

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can access all
CREATE POLICY "Admins can view all" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Access logs: users can view own, admins can view all
CREATE POLICY "Users can view own access logs" ON access_logs
  FOR SELECT USING (user_id::uuid = auth.uid());

CREATE POLICY "Admins can view all access logs" ON access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## Checklist Summary

### Critical (Before any production use)
- [ ] Apply security headers in next.config.ts
- [ ] Update middleware with session timeout (30 min)
- [ ] Add API route authentication wrapper
- [ ] Implement input validation (SQL injection, XSS)
- [ ] Enable Supabase RLS on all tables
- [ ] Set up access logging table (1 year retention)
- [ ] Implement account lockout (5 attempts / 30 min)
- [ ] Custom error pages (no stack traces)
- [ ] **NEW:** Concurrent login prevention
- [ ] **NEW:** PII masking utilities

### Important (Before Samsung review)
- [ ] Implement MFA for admin
- [ ] Add password complexity validation (8+ chars, 2+ types)
- [ ] **NEW:** Password expiry enforcement (90 days)
- [ ] **NEW:** Password history check (no reuse of last 3)
- [ ] **NEW:** Age verification gate (under 14 requires parental consent)
- [ ] Implement account lockout
- [ ] Add privacy policy page
- [ ] Consent collection for personal data
- [ ] **NEW:** Account audit log table (3 year retention)
- [ ] Document security architecture

### Recommended (Ongoing)
- [ ] Set up security monitoring
- [ ] Configure automated scanning
- [ ] Create incident response plan
- [ ] Conduct penetration test
- [ ] **NEW:** Offboarding procedures documented
- [ ] **NEW:** Data retention/deletion policy implemented

---

*Document Version: 1.0*
*Created: 2026-02-02*
*Based on Samsung SSC-E2-05/E2-07 Security Standards*
