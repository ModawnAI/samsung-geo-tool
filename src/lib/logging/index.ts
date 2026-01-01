/**
 * Logging Module
 * Centralized activity logging for the Samsung GEO Tool
 */

export {
  // Core logging functions
  logActivity,
  logApiCall,
  logGenerationEvent,

  // High-level helpers
  logGenerationFlow,

  // API route helpers
  createApiLoggerContext,
  finalizeApiLog,

  // Query functions
  queryActivityLogs,
  getActivitySummary,
  getRecentApiErrors,

  // Types
  type LogActivityParams,
  type LogApiCallParams,
  type LogGenerationEventParams,
  type ApiLoggerContext,
  type ActivityLogQuery,
} from './activity-logger'
