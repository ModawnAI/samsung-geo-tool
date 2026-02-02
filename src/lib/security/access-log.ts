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
  details?: Record<string, unknown>
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

    // Cast to any since access_logs table is not in generated types
    await (supabase as any).from('access_logs').insert({
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
  details?: Record<string, unknown>
): Promise<void> {
  await logAccess({
    user_id: adminId,
    action: 'admin_action',
    resource: action,
    resource_id: targetUserId,
    details,
  })
}

export async function logLogin(userId: string, success: boolean, ipAddress?: string): Promise<void> {
  await logAccess({
    user_id: userId,
    action: success ? 'login' : 'login_failed',
    resource: '/login',
    ip_address: ipAddress,
  })
}

export async function logLogout(userId: string): Promise<void> {
  await logAccess({
    user_id: userId,
    action: 'logout',
    resource: '/logout',
  })
}
