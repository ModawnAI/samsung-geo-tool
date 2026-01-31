/**
 * Smart Defaults System
 * Remembers user preferences and provides intelligent defaults
 * Iteration 4: Flow Improvements
 */

import type { Platform, ContentType, VideoFormat } from '@/types/geo-v2'

// Key for localStorage
const STORAGE_KEY = 'samsung-geo-smart-defaults'

export interface SmartDefaults {
  // Last used settings
  lastPlatform?: Platform
  lastContentType?: ContentType
  lastVideoFormat?: VideoFormat
  lastCategoryId?: string
  lastProductId?: string
  
  // Platform-specific preferences
  platformPreferences: {
    [key in Platform]?: {
      contentType: ContentType
      videoFormat: VideoFormat
      useFixedHashtags: boolean
    }
  }
  
  // Category-specific preferences
  categoryPreferences: {
    [categoryId: string]: {
      defaultProductId?: string
      defaultContentType?: ContentType
    }
  }
  
  // User habits
  usageCount: number
  lastUsed: string
  preferredKeywords: string[]
}

const DEFAULT_SMART_DEFAULTS: SmartDefaults = {
  platformPreferences: {},
  categoryPreferences: {},
  usageCount: 0,
  lastUsed: new Date().toISOString(),
  preferredKeywords: [],
}

/**
 * Load smart defaults from localStorage
 */
export function loadSmartDefaults(): SmartDefaults {
  if (typeof window === 'undefined') {
    return DEFAULT_SMART_DEFAULTS
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SMART_DEFAULTS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load smart defaults:', e)
  }
  
  return DEFAULT_SMART_DEFAULTS
}

/**
 * Save smart defaults to localStorage
 */
export function saveSmartDefaults(defaults: Partial<SmartDefaults>): void {
  if (typeof window === 'undefined') return
  
  try {
    const current = loadSmartDefaults()
    const updated = { 
      ...current, 
      ...defaults,
      lastUsed: new Date().toISOString(),
      usageCount: current.usageCount + 1,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to save smart defaults:', e)
  }
}

/**
 * Record a platform usage to learn preferences
 */
export function recordPlatformUsage(
  platform: Platform,
  contentType: ContentType,
  videoFormat: VideoFormat,
  useFixedHashtags: boolean
): void {
  const current = loadSmartDefaults()
  
  saveSmartDefaults({
    lastPlatform: platform,
    lastContentType: contentType,
    lastVideoFormat: videoFormat,
    platformPreferences: {
      ...current.platformPreferences,
      [platform]: {
        contentType,
        videoFormat,
        useFixedHashtags,
      },
    },
  })
}

/**
 * Record category/product usage
 */
export function recordCategoryUsage(
  categoryId: string,
  productId: string,
  contentType: ContentType
): void {
  const current = loadSmartDefaults()
  
  saveSmartDefaults({
    lastCategoryId: categoryId,
    lastProductId: productId,
    categoryPreferences: {
      ...current.categoryPreferences,
      [categoryId]: {
        defaultProductId: productId,
        defaultContentType: contentType,
      },
    },
  })
}

/**
 * Record keyword usage for preferences
 */
export function recordKeywordUsage(keywords: string[]): void {
  const current = loadSmartDefaults()
  
  // Merge with existing preferred keywords, keeping most recent
  const merged = [...new Set([...keywords, ...current.preferredKeywords])].slice(0, 20)
  
  saveSmartDefaults({
    preferredKeywords: merged,
  })
}

/**
 * Get recommended settings for a platform
 */
export function getRecommendedSettings(platform: Platform): {
  contentType: ContentType
  videoFormat: VideoFormat
  useFixedHashtags: boolean
} {
  const defaults = loadSmartDefaults()
  const platformPref = defaults.platformPreferences[platform]
  
  // Platform-specific intelligent defaults
  const platformDefaults: Record<Platform, {
    contentType: ContentType
    videoFormat: VideoFormat
    useFixedHashtags: boolean
  }> = {
    youtube: {
      contentType: 'intro',
      videoFormat: 'feed_16x9',
      useFixedHashtags: true,
    },
    instagram: {
      contentType: 'how_to',
      videoFormat: 'feed_16x9',
      useFixedHashtags: true,
    },
    tiktok: {
      contentType: 'how_to',
      videoFormat: 'shorts_9x16',
      useFixedHashtags: false,
    },
  }
  
  return platformPref || platformDefaults[platform]
}

/**
 * Get preferred keywords with platform context
 */
export function getPreferredKeywords(platform: Platform): string[] {
  const defaults = loadSmartDefaults()
  
  // Filter keywords that might not be relevant for certain platforms
  return defaults.preferredKeywords.filter(keyword => {
    // TikTok prefers shorter, trendier keywords
    if (platform === 'tiktok' && keyword.length > 20) {
      return false
    }
    return true
  })
}

/**
 * Check if user is experienced (has used the tool multiple times)
 */
export function isExperiencedUser(): boolean {
  const defaults = loadSmartDefaults()
  return defaults.usageCount >= 3
}

/**
 * Get quick start suggestion based on usage patterns
 */
export function getQuickStartSuggestion(): {
  available: boolean
  platform?: Platform
  categoryId?: string
  productId?: string
  contentType?: ContentType
  message: string
} {
  const defaults = loadSmartDefaults()
  
  if (defaults.usageCount < 2) {
    return {
      available: false,
      message: '빠른 시작 기능은 2회 이상 사용 후 활성화됩니다.',
    }
  }
  
  if (defaults.lastPlatform && defaults.lastCategoryId && defaults.lastProductId) {
    return {
      available: true,
      platform: defaults.lastPlatform,
      categoryId: defaults.lastCategoryId,
      productId: defaults.lastProductId,
      contentType: defaults.lastContentType,
      message: `마지막 설정으로 빠르게 시작: ${defaults.lastPlatform.toUpperCase()}`,
    }
  }
  
  return {
    available: false,
    message: '충분한 사용 기록이 없습니다.',
  }
}

/**
 * Clear all smart defaults (for testing or user reset)
 */
export function clearSmartDefaults(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear smart defaults:', e)
  }
}
