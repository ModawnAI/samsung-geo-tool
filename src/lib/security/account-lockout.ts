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

  // Cast to any since login_attempts table is not in generated types
  await (supabase as any).from('login_attempts').insert({
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

  // Cast to any since login_attempts table is not in generated types
  const sb = supabase as any

  // Count failed attempts in the lockout window
  const { count, error } = await sb
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
    const { data: lastAttempt } = await sb
      .from('login_attempts')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as { data: { created_at: string } | null }

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
  // On successful login, we don't delete old attempts (for audit)
  // The lockout check uses a time window, so old attempts become irrelevant
  console.log(`[Security] Login successful for ${email}, lockout window will reset naturally`)
}
