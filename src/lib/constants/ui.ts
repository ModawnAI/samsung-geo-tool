/**
 * Centralized UI constants for consistency across the application
 */

// Icon sizes - use consistently across all components
export const ICON_SIZES = {
  xs: 'h-3 w-3',  // Small inline icons
  sm: 'h-4 w-4',  // Default inline icons
  md: 'h-5 w-5',  // Standalone icons, mobile nav
  lg: 'h-6 w-6',  // Large feature icons
  xl: 'h-8 w-8',  // Hero icons
} as const

// Animation timing - centralized for consistency
export const ANIMATION = {
  // Durations
  duration: {
    fast: 0.15,
    normal: 0.2,
    slow: 0.3,
  },
  // Stagger delays
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
  // Spring configs
  spring: {
    snappy: { type: 'spring', stiffness: 500, damping: 30 },
    smooth: { type: 'spring', stiffness: 300, damping: 25 },
    gentle: { type: 'spring', stiffness: 200, damping: 20 },
  },
} as const

// Motion variants for framer-motion - reusable across components
export const MOTION_VARIANTS = {
  // Fade in/out
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  // Slide from left
  slideLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  // Slide from right
  slideRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  // Slide from bottom
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  // Scale in
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  // Container with staggered children
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: ANIMATION.stagger.normal,
        delayChildren: ANIMATION.duration.fast,
      },
    },
  },
  // Stagger item
  staggerItem: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  },
} as const

// API polling intervals
export const POLLING = {
  stats: 30000,      // 30 seconds for dashboard stats
  status: 5000,      // 5 seconds for status checks
  realtime: 1000,    // 1 second for real-time updates
} as const

// Toast durations
export const TOAST_DURATION = {
  short: 2000,
  normal: 4000,
  long: 6000,
} as const

// Quality score thresholds
export const QUALITY_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
} as const

// Get color class based on score
export function getScoreColor(score: number): string {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'text-green-600'
  if (score >= QUALITY_THRESHOLDS.good) return 'text-yellow-600'
  return 'text-red-500'
}

// Badge variants for different statuses
export const STATUS_BADGE_VARIANTS = {
  confirmed: 'default',
  draft: 'secondary',
  error: 'destructive',
  pending: 'outline',
} as const
