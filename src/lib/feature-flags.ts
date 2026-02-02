/**
 * Feature flags for premium features
 * These control visibility of features that require client payment
 */
export const featureFlags = {
  /** Video upload and AI analysis features (includes YouTube tab) */
  videoAnalysis: process.env.NEXT_PUBLIC_VIDEO_ANALYSIS_ENABLED === 'true',
  /** TikTok platform option in generation */
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_ENABLED === 'true',
} as const

/**
 * Type-safe helper to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature]
}
