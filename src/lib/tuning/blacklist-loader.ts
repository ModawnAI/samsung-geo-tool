/**
 * Blacklist Loader Service
 * Loads active domain blacklist from database and provides domain checking utilities
 * Integrates with grounding-scorer for filtering blocked domains
 */

import { createClient } from '@/lib/supabase/server'
import type {
  DomainBlacklistRow,
  LoadedBlacklist,
  BlacklistLoaderResult,
  BlacklistCheckResult,
  BlacklistDomain,
} from '@/types/tuning'

// Cache configuration
const CACHE_TTL_MS = 60 * 1000 // 60 seconds cache TTL

// In-memory cache
let cachedBlacklist: LoadedBlacklist | null = null
let cacheLoadedAt = 0

/**
 * Load active blacklist from database
 * Uses in-memory cache to reduce database calls
 */
export async function loadActiveBlacklist(): Promise<BlacklistLoaderResult> {
  // Check cache
  if (cachedBlacklist && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    console.log('[BlacklistLoader] 캐시에서 블랙리스트 로드')
    return {
      blacklist: cachedBlacklist,
      source: 'cache',
    }
  }

  try {
    const supabase = await createClient()

    // Fetch active blacklist config
    const { data, error } = await supabase
      .from('domain_blacklist')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (error) {
      // PGRST116 = no rows returned (not an error, just no active blacklist)
      if (error.code === 'PGRST116') {
        console.log('[BlacklistLoader] 활성화된 블랙리스트 없음')
        cachedBlacklist = null
        cacheLoadedAt = Date.now()
        return {
          blacklist: null,
          source: 'none',
        }
      }
      throw error
    }

    const row = data as DomainBlacklistRow

    // Parse domains into optimized Set structure
    const domains = new Set<string>()
    const domainDetails = new Map<string, BlacklistDomain>()

    const domainArray = row.domains as BlacklistDomain[]
    for (const entry of domainArray) {
      const normalizedDomain = normalizeDomain(entry.domain)
      domains.add(normalizedDomain)
      domainDetails.set(normalizedDomain, entry)
    }

    const loadedBlacklist: LoadedBlacklist = {
      id: row.id,
      name: row.name,
      version: row.version,
      domains,
      domainDetails,
      loadedAt: Date.now(),
    }

    // Update cache
    cachedBlacklist = loadedBlacklist
    cacheLoadedAt = Date.now()

    console.log(`[BlacklistLoader] 블랙리스트 로드: ${row.name} v${row.version} (${domains.size}개 도메인)`)

    return {
      blacklist: loadedBlacklist,
      source: 'database',
    }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 로드 실패:', error)
    return {
      blacklist: null,
      source: 'none',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a domain is blacklisted
 * Supports subdomain matching (e.g., sub.reddit.com matches reddit.com)
 */
export function isDomainBlacklisted(
  hostname: string,
  blacklist: LoadedBlacklist | null
): BlacklistCheckResult {
  if (!blacklist || blacklist.domains.size === 0) {
    return { isBlacklisted: false }
  }

  const normalizedHostname = normalizeDomain(hostname)

  // Direct match
  if (blacklist.domains.has(normalizedHostname)) {
    const details = blacklist.domainDetails.get(normalizedHostname)
    return {
      isBlacklisted: true,
      reason: details?.reason,
      matchedDomain: normalizedHostname,
    }
  }

  // Subdomain matching (check parent domains)
  const parts = normalizedHostname.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join('.')
    if (blacklist.domains.has(parentDomain)) {
      const details = blacklist.domainDetails.get(parentDomain)
      return {
        isBlacklisted: true,
        reason: details?.reason,
        matchedDomain: parentDomain,
      }
    }
  }

  return { isBlacklisted: false }
}

/**
 * Check if a URL is blacklisted
 * Extracts hostname from URL and checks against blacklist
 */
export function isUrlBlacklisted(
  url: string,
  blacklist: LoadedBlacklist | null
): BlacklistCheckResult {
  try {
    const hostname = new URL(url).hostname
    return isDomainBlacklisted(hostname, blacklist)
  } catch {
    // Invalid URL
    return { isBlacklisted: false }
  }
}

/**
 * Normalize domain for consistent matching
 * Removes www. prefix and converts to lowercase
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^www\./, '')
    .replace(/\/.*$/, '') // Remove path if accidentally included
}

/**
 * Clear blacklist cache
 * Call this when blacklist is updated in the UI
 */
export function clearBlacklistCache(): void {
  cachedBlacklist = null
  cacheLoadedAt = 0
  console.log('[BlacklistLoader] 캐시 초기화됨')
}

/**
 * Get all blacklist configurations (for management UI)
 */
export async function getAllBlacklistConfigs(): Promise<{
  configs: DomainBlacklistRow[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('domain_blacklist')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { configs: (data as DomainBlacklistRow[]) || [] }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 목록 로드 실패:', error)
    return {
      configs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a new blacklist configuration
 */
export async function createBlacklistConfig(
  name: string,
  version: string,
  domains: BlacklistDomain[],
  createdBy: string
): Promise<{ id: string | null; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('domain_blacklist')
      .insert({
        name,
        version,
        domains,
        is_active: false,
        created_by: createdBy,
      })
      .select('id')
      .single()

    if (error) throw error

    return { id: data?.id || null }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 생성 실패:', error)
    return {
      id: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Activate a blacklist config (deactivates all others)
 */
export async function activateBlacklistConfig(
  configId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Deactivate all existing configs
    await supabase
      .from('domain_blacklist')
      .update({ is_active: false })
      .neq('id', configId)

    // Activate the selected config
    const { error } = await supabase
      .from('domain_blacklist')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', configId)

    if (error) throw error

    // Clear cache to force reload
    clearBlacklistCache()

    return { success: true }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 활성화 실패:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Deactivate a blacklist config
 */
export async function deactivateBlacklistConfig(
  configId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('domain_blacklist')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', configId)

    if (error) throw error

    // Clear cache
    clearBlacklistCache()

    return { success: true }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 비활성화 실패:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete a blacklist config
 */
export async function deleteBlacklistConfig(
  configId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('domain_blacklist')
      .delete()
      .eq('id', configId)

    if (error) throw error

    // Clear cache
    clearBlacklistCache()

    return { success: true }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 삭제 실패:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update domains in a blacklist config
 */
export async function updateBlacklistDomains(
  configId: string,
  domains: BlacklistDomain[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('domain_blacklist')
      .update({ domains, updated_at: new Date().toISOString() })
      .eq('id', configId)

    if (error) throw error

    // Clear cache
    clearBlacklistCache()

    return { success: true }
  } catch (error) {
    console.error('[BlacklistLoader] 블랙리스트 도메인 업데이트 실패:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
