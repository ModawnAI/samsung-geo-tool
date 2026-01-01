/**
 * Generation Cache for repeated generation requests
 * Uses in-memory LRU cache with TTL to avoid redundant API calls
 */

import crypto from 'crypto'

interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  maxSize: number
}

/**
 * Simple LRU cache with TTL support
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number
  private defaultTTL: number
  private hits = 0
  private misses = 0

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize || 100
    this.defaultTTL = options.defaultTTL || 30 * 60 * 1000 // 30 minutes default
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    this.hits++

    return entry.value
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if at max size
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl || this.defaultTTL),
    })
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all expired entries
   */
  prune(): number {
    const now = Date.now()
    let pruned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        pruned++
      }
    }

    return pruned
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
    }
  }
}

// ==========================================
// GENERATION CACHE
// ==========================================

interface GenerationCacheKey {
  productName: string
  srtContent: string
  keywords: string[]
  language?: string
  pipelineConfig?: string
}

/**
 * Create a hash key for generation request
 */
export function createGenerationCacheKey(params: GenerationCacheKey): string {
  const normalized = {
    productName: params.productName.trim().toLowerCase(),
    // Use first 1000 chars of SRT for hash (avoid huge strings)
    srtContent: params.srtContent.slice(0, 1000).trim(),
    keywords: [...params.keywords].sort().map(k => k.toLowerCase()),
    language: params.language || 'ko',
    pipelineConfig: params.pipelineConfig || 'full',
  }

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .slice(0, 16)

  return `gen_${hash}`
}

// Singleton cache instance
const generationCache = new LRUCache<unknown>({
  maxSize: 50, // Store up to 50 generation results
  defaultTTL: 30 * 60 * 1000, // 30 minutes
})

/**
 * Get cached generation result
 */
export function getCachedGeneration<T>(key: string): T | undefined {
  return generationCache.get(key) as T | undefined
}

/**
 * Cache a generation result
 */
export function cacheGeneration<T>(key: string, result: T, ttlMs?: number): void {
  generationCache.set(key, result, ttlMs)
}

/**
 * Check if a generation is cached
 */
export function hasGenerationCache(key: string): boolean {
  return generationCache.has(key)
}

/**
 * Clear generation cache
 */
export function clearGenerationCache(): void {
  generationCache.clear()
}

/**
 * Get cache statistics for monitoring
 */
export function getGenerationCacheStats(): CacheStats & { hitRate: string } {
  const stats = generationCache.getStats()
  const total = stats.hits + stats.misses
  const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) + '%' : '0%'

  return {
    ...stats,
    hitRate,
  }
}

/**
 * Prune expired entries from cache
 */
export function pruneGenerationCache(): number {
  return generationCache.prune()
}

// ==========================================
// STAGE-LEVEL CACHING (for partial regeneration)
// ==========================================

interface StageCacheKey {
  generationKey: string
  stage: string
}

const stageCache = new LRUCache<unknown>({
  maxSize: 200, // More granular stage results
  defaultTTL: 15 * 60 * 1000, // 15 minutes for stages
})

/**
 * Create a key for stage-level caching
 */
export function createStageCacheKey(params: StageCacheKey): string {
  return `${params.generationKey}_${params.stage}`
}

/**
 * Get cached stage result
 */
export function getCachedStage<T>(key: string): T | undefined {
  return stageCache.get(key) as T | undefined
}

/**
 * Cache a stage result
 */
export function cacheStage<T>(key: string, result: T, ttlMs?: number): void {
  stageCache.set(key, result, ttlMs)
}

/**
 * Clear stage cache
 */
export function clearStageCache(): void {
  stageCache.clear()
}

// Auto-prune expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    generationCache.prune()
    stageCache.prune()
  }, 5 * 60 * 1000)
}
