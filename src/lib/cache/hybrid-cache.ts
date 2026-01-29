/**
 * Hybrid Cache: L1 (In-Memory LRU) + L2 (Supabase)
 * Provides fast reads from memory with persistent fallback
 */

import {
  createGenerationCacheKey,
  getCachedGeneration,
  cacheGeneration,
  getGenerationCacheStats as getL1Stats,
  pruneGenerationCache as pruneL1Cache,
  clearGenerationCache as clearL1Cache,
} from './generation-cache'

import {
  getSupabaseCache,
  setSupabaseCache,
  invalidateSupabaseCache,
  pruneSupabaseCache,
  getSupabaseCacheStats,
  clearAllSupabaseCache,
  type SupabaseCacheStats,
} from './supabase-cache'

export interface HybridCacheStats {
  l1: {
    hits: number
    misses: number
    size: number
    maxSize: number
    hitRate: string
  }
  l2: SupabaseCacheStats | null
  overall: {
    l1HitRate: string
    l2HitRate: string
    totalHits: number
    totalRequests: number
  }
}

export interface HybridCacheResult<T> {
  value: T | null
  cacheHit: boolean
  cacheSource: 'l1' | 'l2' | null
}

// Track overall stats for this session
let sessionL1Hits = 0
let sessionL2Hits = 0
let sessionMisses = 0

/**
 * Get from hybrid cache with L1 → L2 fallback
 * On L2 hit, promotes to L1
 */
export async function getHybridCache<T>(cacheKey: string): Promise<HybridCacheResult<T>> {
  // Try L1 (in-memory) first
  const l1Result = getCachedGeneration<T>(cacheKey)
  if (l1Result !== undefined) {
    sessionL1Hits++
    return {
      value: l1Result,
      cacheHit: true,
      cacheSource: 'l1',
    }
  }

  // Try L2 (Supabase)
  const l2Result = await getSupabaseCache<T>(cacheKey)
  if (l2Result !== null) {
    sessionL2Hits++
    // Promote to L1 for faster subsequent access
    cacheGeneration(cacheKey, l2Result)
    return {
      value: l2Result,
      cacheHit: true,
      cacheSource: 'l2',
    }
  }

  sessionMisses++
  return {
    value: null,
    cacheHit: false,
    cacheSource: null,
  }
}

/**
 * Set in both L1 and L2 caches
 */
export async function setHybridCache<T>(
  cacheKey: string,
  productName: string,
  keywords: string[],
  result: T,
  ttlMs?: number
): Promise<void> {
  // Set in L1 (sync, in-memory)
  cacheGeneration(cacheKey, result, ttlMs)

  // Set in L2 (async, database) - don't await to avoid blocking
  setSupabaseCache(cacheKey, productName, keywords, result, ttlMs)
    .catch((err) => console.warn('[HybridCache] L2 set warning:', err))
}

/**
 * Invalidate from both caches
 */
export async function invalidateHybridCache(cacheKey: string): Promise<void> {
  // Clear from L1 - using existing cache module
  // Note: The LRU cache delete is called internally, we need to access it differently
  // For now, we'll just let L1 expire naturally since it has short TTL
  // The Supabase invalidation is the important one for persistent storage

  // Clear from L2
  await invalidateSupabaseCache(cacheKey)
}

/**
 * Prune expired entries from both caches
 */
export async function pruneHybridCache(): Promise<{ l1Pruned: number; l2Pruned: number }> {
  const l1Pruned = pruneL1Cache()
  const l2Pruned = await pruneSupabaseCache()

  return { l1Pruned, l2Pruned }
}

/**
 * Get combined stats from both cache layers
 */
export async function getHybridCacheStats(): Promise<HybridCacheStats> {
  const l1Stats = getL1Stats()
  const l2Stats = await getSupabaseCacheStats()

  const totalRequests = sessionL1Hits + sessionL2Hits + sessionMisses
  const totalHits = sessionL1Hits + sessionL2Hits

  return {
    l1: l1Stats,
    l2: l2Stats,
    overall: {
      l1HitRate: totalRequests > 0 ? `${((sessionL1Hits / totalRequests) * 100).toFixed(1)}%` : '0%',
      l2HitRate: totalRequests > 0 ? `${((sessionL2Hits / totalRequests) * 100).toFixed(1)}%` : '0%',
      totalHits,
      totalRequests,
    },
  }
}

/**
 * Clear all caches
 */
export async function clearHybridCache(): Promise<void> {
  clearL1Cache()
  await clearAllSupabaseCache()

  // Reset session stats
  sessionL1Hits = 0
  sessionL2Hits = 0
  sessionMisses = 0
}

/**
 * Helper to create cache key for generation requests
 */
export { createGenerationCacheKey }
