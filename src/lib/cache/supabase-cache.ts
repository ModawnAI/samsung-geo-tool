/**
 * Supabase-based persistent cache (L2)
 * Provides database-backed caching for generation results
 */

import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/types/database'

type GenerationCacheRow = Database['public']['Tables']['generation_cache']['Row']
type GenerationCacheInsert = Database['public']['Tables']['generation_cache']['Insert']

export interface CacheEntry<T> {
  id: string
  cacheKey: string
  productName: string
  keywords: string[]
  result: T
  hitCount: number
  lastAccessedAt: string
  createdAt: string
  expiresAt: string
}

export interface SupabaseCacheStats {
  totalEntries: number
  totalHits: number
  expiredEntries: number
  avgHitCount: number
  oldestEntry: string | null
  newestEntry: string | null
}

/**
 * Get a cached value from Supabase
 */
export async function getSupabaseCache<T>(cacheKey: string): Promise<T | null> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('generation_cache')
      .select('result')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single() as { data: Pick<GenerationCacheRow, 'result'> | null; error: Error | null }

    if (error || !data) {
      return null
    }

    // Increment hit count asynchronously (don't await)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.rpc as any)('increment_generation_cache_hit', { p_cache_key: cacheKey })
      .then(() => {})
      .catch((err: Error) => console.warn('Failed to increment cache hit:', err))

    return data.result as T
  } catch (error) {
    console.warn('[SupabaseCache] Get error:', error)
    return null
  }
}

/**
 * Set a value in Supabase cache
 */
export async function setSupabaseCache<T>(
  cacheKey: string,
  productName: string,
  keywords: string[],
  result: T,
  ttlMs: number = 30 * 60 * 1000 // 30 minutes default
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const expiresAt = new Date(Date.now() + ttlMs).toISOString()

    const insertData: GenerationCacheInsert = {
      cache_key: cacheKey,
      product_name: productName,
      keywords: keywords,
      result: result as Json,
      hit_count: 0,
      last_accessed_at: new Date().toISOString(),
      expires_at: expiresAt,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('generation_cache')
      .upsert(insertData, {
        onConflict: 'cache_key',
      })

    if (error) {
      console.warn('[SupabaseCache] Set error:', error)
      return false
    }

    return true
  } catch (error) {
    console.warn('[SupabaseCache] Set error:', error)
    return false
  }
}

/**
 * Invalidate (delete) a cached entry
 */
export async function invalidateSupabaseCache(cacheKey: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('generation_cache')
      .delete()
      .eq('cache_key', cacheKey)

    if (error) {
      console.warn('[SupabaseCache] Invalidate error:', error)
      return false
    }

    return true
  } catch (error) {
    console.warn('[SupabaseCache] Invalidate error:', error)
    return false
  }
}

/**
 * Prune expired cache entries
 */
export async function pruneSupabaseCache(): Promise<number> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('prune_expired_generation_cache')

    if (error) {
      console.warn('[SupabaseCache] Prune error:', error)
      return 0
    }

    return data as number
  } catch (error) {
    console.warn('[SupabaseCache] Prune error:', error)
    return 0
  }
}

/**
 * Get cache statistics from Supabase
 */
export async function getSupabaseCacheStats(): Promise<SupabaseCacheStats | null> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_generation_cache_stats') as {
      data: Array<{
        total_entries: number
        total_hits: number
        expired_entries: number
        avg_hit_count: number
        oldest_entry: string | null
        newest_entry: string | null
      }> | null
      error: Error | null
    }

    if (error || !data || data.length === 0) {
      console.warn('[SupabaseCache] Stats error:', error)
      return null
    }

    const stats = data[0]
    return {
      totalEntries: Number(stats.total_entries) || 0,
      totalHits: Number(stats.total_hits) || 0,
      expiredEntries: Number(stats.expired_entries) || 0,
      avgHitCount: Number(stats.avg_hit_count) || 0,
      oldestEntry: stats.oldest_entry || null,
      newestEntry: stats.newest_entry || null,
    }
  } catch (error) {
    console.warn('[SupabaseCache] Stats error:', error)
    return null
  }
}

/**
 * Clear all entries for a specific product
 */
export async function clearProductCache(productName: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('generation_cache')
      .delete()
      .eq('product_name', productName)

    if (error) {
      console.warn('[SupabaseCache] Clear product error:', error)
      return false
    }

    return true
  } catch (error) {
    console.warn('[SupabaseCache] Clear product error:', error)
    return false
  }
}

/**
 * Clear all cache entries
 */
export async function clearAllSupabaseCache(): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('generation_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) {
      console.warn('[SupabaseCache] Clear all error:', error)
      return false
    }

    return true
  } catch (error) {
    console.warn('[SupabaseCache] Clear all error:', error)
    return false
  }
}
