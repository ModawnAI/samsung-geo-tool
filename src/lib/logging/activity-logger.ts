/**
 * Activity Logging Utility
 * Comprehensive server-side logging for user activities, API calls, and generation events
 */

import { createClient } from '@/lib/supabase/server'
import type {
  ActivityCategory,
  GenerationEventType,
  Database,
  Json,
} from '@/types/database'

// Type aliases for convenience
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert']
type ApiCallLogInsert = Database['public']['Tables']['api_call_logs']['Insert']
type GenerationEventLogInsert = Database['public']['Tables']['generation_event_logs']['Insert']

// ============================================
// Activity Logging
// ============================================

export interface LogActivityParams {
  userId?: string
  userEmail?: string
  sessionId?: string
  actionType: string
  actionCategory: ActivityCategory
  actionDescription?: string
  resourceType?: string
  resourceId?: string
  resourceName?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
  metadata?: Record<string, unknown>
  status?: 'success' | 'failure' | 'pending'
  errorMessage?: string
  durationMs?: number
}

/**
 * Log a user activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<string | null> {
  try {
    const supabase = await createClient()

    const insertData: ActivityLogInsert = {
      user_id: params.userId,
      user_email: params.userEmail,
      session_id: params.sessionId,
      action_type: params.actionType,
      action_category: params.actionCategory,
      action_description: params.actionDescription,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      resource_name: params.resourceName,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      request_path: params.requestPath,
      request_method: params.requestMethod,
      metadata: (params.metadata || {}) as Json,
      status: params.status || 'success',
      error_message: params.errorMessage,
      duration_ms: params.durationMs,
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert(insertData as never)
      .select('id')
      .single()

    if (error) {
      console.error('[ActivityLogger] Failed to log activity:', error)
      return null
    }

    return (data as { id: string } | null)?.id ?? null
  } catch (error) {
    console.error('[ActivityLogger] Exception logging activity:', error)
    return null
  }
}

// ============================================
// API Call Logging
// ============================================

export interface LogApiCallParams {
  userId?: string
  userEmail?: string
  endpoint: string
  method: string
  requestBody?: Record<string, unknown>
  requestHeaders?: Record<string, string>
  queryParams?: Record<string, string>
  responseStatus?: number
  responseBody?: Record<string, unknown>
  responseSizeBytes?: number
  durationMs?: number
  externalApisCalled?: Array<{
    name: string
    durationMs: number
    status: number | string
  }>
  errorType?: string
  errorMessage?: string
  errorStack?: string
  traceId?: string
  parentTraceId?: string
  estimatedCost?: number
  tokensUsed?: {
    input?: number
    output?: number
    total?: number
  }
}

/**
 * Log an API call with full request/response details
 */
export async function logApiCall(params: LogApiCallParams): Promise<string | null> {
  try {
    const supabase = await createClient()

    const insertData: ApiCallLogInsert = {
      user_id: params.userId,
      user_email: params.userEmail,
      endpoint: params.endpoint,
      method: params.method,
      request_body: params.requestBody as Json,
      request_headers: params.requestHeaders as Json,
      query_params: params.queryParams as Json,
      response_status: params.responseStatus,
      response_body: params.responseBody as Json,
      response_size_bytes: params.responseSizeBytes,
      duration_ms: params.durationMs,
      external_apis_called: (params.externalApisCalled || []) as Json,
      error_type: params.errorType,
      error_message: params.errorMessage,
      error_stack: params.errorStack,
      trace_id: params.traceId,
      parent_trace_id: params.parentTraceId,
      estimated_cost: params.estimatedCost,
      tokens_used: params.tokensUsed as Json,
    }

    const { data, error } = await supabase
      .from('api_call_logs')
      .insert(insertData as never)
      .select('id')
      .single()

    if (error) {
      console.error('[ActivityLogger] Failed to log API call:', error)
      return null
    }

    return (data as { id: string } | null)?.id ?? null
  } catch (error) {
    console.error('[ActivityLogger] Exception logging API call:', error)
    return null
  }
}

// ============================================
// Generation Event Logging
// ============================================

export interface LogGenerationEventParams {
  activityLogId?: string
  apiCallLogId?: string
  generationId?: string
  userId?: string
  eventType: GenerationEventType
  productId?: string
  productName?: string
  keywordsUsed?: string[]
  srtLength?: number
  videoUrl?: string
  pipelineConfig?: Record<string, unknown>
  promptVersionId?: string
  weightsVersionId?: string
  descriptionLength?: number
  timestampsCount?: number
  hashtagsCount?: number
  faqCount?: number
  qualityScores?: Record<string, number>
  finalScore?: number
  groundingSourcesCount?: number
  groundingCitationsCount?: number
  totalDurationMs?: number
  stageDurations?: Record<string, number>
  isRefined?: boolean
  refinementFocus?: string
  refinementIteration?: number
}

/**
 * Log a generation-specific event with full context
 */
export async function logGenerationEvent(
  params: LogGenerationEventParams
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const insertData: GenerationEventLogInsert = {
      activity_log_id: params.activityLogId,
      api_call_log_id: params.apiCallLogId,
      generation_id: params.generationId,
      user_id: params.userId,
      event_type: params.eventType,
      product_id: params.productId,
      product_name: params.productName,
      keywords_used: params.keywordsUsed,
      srt_length: params.srtLength,
      video_url: params.videoUrl,
      pipeline_config: params.pipelineConfig as Json,
      prompt_version_id: params.promptVersionId,
      weights_version_id: params.weightsVersionId,
      description_length: params.descriptionLength,
      timestamps_count: params.timestampsCount,
      hashtags_count: params.hashtagsCount,
      faq_count: params.faqCount,
      quality_scores: params.qualityScores as Json,
      final_score: params.finalScore,
      grounding_sources_count: params.groundingSourcesCount,
      grounding_citations_count: params.groundingCitationsCount,
      total_duration_ms: params.totalDurationMs,
      stage_durations: params.stageDurations as Json,
      is_refined: params.isRefined,
      refinement_focus: params.refinementFocus,
      refinement_iteration: params.refinementIteration,
    }

    const { data, error } = await supabase
      .from('generation_event_logs')
      .insert(insertData as never)
      .select('id')
      .single()

    if (error) {
      console.error('[ActivityLogger] Failed to log generation event:', error)
      return null
    }

    return (data as { id: string } | null)?.id ?? null
  } catch (error) {
    console.error('[ActivityLogger] Exception logging generation event:', error)
    return null
  }
}

// ============================================
// High-Level Logging Helpers
// ============================================

/**
 * Log a complete generation flow (activity + API + generation event)
 */
export async function logGenerationFlow(params: {
  userId?: string
  userEmail?: string
  productId?: string
  productName?: string
  keywordsUsed?: string[]
  srtLength?: number
  videoUrl?: string
  pipelineConfig?: Record<string, unknown>
  promptVersionId?: string
  weightsVersionId?: string
  eventType: GenerationEventType
  output?: {
    descriptionLength?: number
    timestampsCount?: number
    hashtagsCount?: number
    faqCount?: number
    qualityScores?: Record<string, number>
    finalScore?: number
    groundingSourcesCount?: number
    groundingCitationsCount?: number
  }
  performance?: {
    totalDurationMs?: number
    stageDurations?: Record<string, number>
    tokensUsed?: { input?: number; output?: number; total?: number }
    estimatedCost?: number
    externalApisCalled?: Array<{ name: string; durationMs: number; status: number | string }>
  }
  error?: {
    type?: string
    message?: string
    stack?: string
  }
  requestContext?: {
    endpoint: string
    method: string
    ipAddress?: string
    userAgent?: string
    traceId?: string
  }
}): Promise<{
  activityLogId: string | null
  apiCallLogId: string | null
  generationEventLogId: string | null
}> {
  const results = {
    activityLogId: null as string | null,
    apiCallLogId: null as string | null,
    generationEventLogId: null as string | null,
  }

  // 1. Log the activity
  results.activityLogId = await logActivity({
    userId: params.userId,
    userEmail: params.userEmail,
    actionType: params.eventType,
    actionCategory: 'generation',
    actionDescription: `Generation ${params.eventType} for ${params.productName || 'unknown product'}`,
    resourceType: 'generation',
    resourceId: params.productId,
    resourceName: params.productName,
    ipAddress: params.requestContext?.ipAddress,
    userAgent: params.requestContext?.userAgent,
    requestPath: params.requestContext?.endpoint,
    requestMethod: params.requestContext?.method,
    metadata: {
      keywordsUsed: params.keywordsUsed,
      srtLength: params.srtLength,
      pipelineConfig: params.pipelineConfig,
    },
    status: params.error ? 'failure' : 'success',
    errorMessage: params.error?.message,
    durationMs: params.performance?.totalDurationMs,
  })

  // 2. Log the API call
  if (params.requestContext) {
    results.apiCallLogId = await logApiCall({
      userId: params.userId,
      userEmail: params.userEmail,
      endpoint: params.requestContext.endpoint,
      method: params.requestContext.method,
      durationMs: params.performance?.totalDurationMs,
      externalApisCalled: params.performance?.externalApisCalled,
      errorType: params.error?.type,
      errorMessage: params.error?.message,
      errorStack: params.error?.stack,
      traceId: params.requestContext.traceId,
      estimatedCost: params.performance?.estimatedCost,
      tokensUsed: params.performance?.tokensUsed,
    })
  }

  // 3. Log the generation event
  results.generationEventLogId = await logGenerationEvent({
    activityLogId: results.activityLogId || undefined,
    apiCallLogId: results.apiCallLogId || undefined,
    userId: params.userId,
    eventType: params.eventType,
    productId: params.productId,
    productName: params.productName,
    keywordsUsed: params.keywordsUsed,
    srtLength: params.srtLength,
    videoUrl: params.videoUrl,
    pipelineConfig: params.pipelineConfig,
    promptVersionId: params.promptVersionId,
    weightsVersionId: params.weightsVersionId,
    descriptionLength: params.output?.descriptionLength,
    timestampsCount: params.output?.timestampsCount,
    hashtagsCount: params.output?.hashtagsCount,
    faqCount: params.output?.faqCount,
    qualityScores: params.output?.qualityScores,
    finalScore: params.output?.finalScore,
    groundingSourcesCount: params.output?.groundingSourcesCount,
    groundingCitationsCount: params.output?.groundingCitationsCount,
    totalDurationMs: params.performance?.totalDurationMs,
    stageDurations: params.performance?.stageDurations,
  })

  return results
}

// ============================================
// API Route Wrapper
// ============================================

export interface ApiLoggerContext {
  userId?: string
  userEmail?: string
  traceId?: string
  startTime: number
}

/**
 * Create a logging context for API routes
 */
export function createApiLoggerContext(request: Request): ApiLoggerContext {
  return {
    traceId: crypto.randomUUID(),
    startTime: performance.now(),
  }
}

/**
 * Finalize API logging with response details
 */
export async function finalizeApiLog(
  context: ApiLoggerContext,
  request: Request,
  response: Response,
  options?: {
    externalApisCalled?: Array<{ name: string; durationMs: number; status: number | string }>
    tokensUsed?: { input?: number; output?: number; total?: number }
    estimatedCost?: number
    errorType?: string
    errorMessage?: string
    errorStack?: string
  }
): Promise<string | null> {
  const durationMs = Math.round(performance.now() - context.startTime)
  const url = new URL(request.url)

  let responseBody: Record<string, unknown> | undefined
  try {
    const clonedResponse = response.clone()
    responseBody = await clonedResponse.json()
  } catch {
    // Response is not JSON, skip body logging
  }

  return logApiCall({
    userId: context.userId,
    userEmail: context.userEmail,
    endpoint: url.pathname,
    method: request.method,
    queryParams: Object.fromEntries(url.searchParams.entries()),
    responseStatus: response.status,
    responseBody,
    durationMs,
    traceId: context.traceId,
    externalApisCalled: options?.externalApisCalled,
    tokensUsed: options?.tokensUsed,
    estimatedCost: options?.estimatedCost,
    errorType: options?.errorType,
    errorMessage: options?.errorMessage,
    errorStack: options?.errorStack,
  })
}

// ============================================
// Query Helpers
// ============================================

export interface ActivityLogQuery {
  userId?: string
  actionCategory?: ActivityCategory
  actionType?: string
  resourceType?: string
  status?: 'success' | 'failure' | 'pending'
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}

/**
 * Query activity logs with filters
 */
export async function queryActivityLogs(params: ActivityLogQuery) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (params.userId) {
      query = query.eq('user_id', params.userId)
    }
    if (params.actionCategory) {
      query = query.eq('action_category', params.actionCategory)
    }
    if (params.actionType) {
      query = query.eq('action_type', params.actionType)
    }
    if (params.resourceType) {
      query = query.eq('resource_type', params.resourceType)
    }
    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.fromDate) {
      query = query.gte('created_at', params.fromDate.toISOString())
    }
    if (params.toDate) {
      query = query.lte('created_at', params.toDate.toISOString())
    }
    if (params.limit) {
      query = query.limit(params.limit)
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[ActivityLogger] Failed to query activity logs:', error)
      return { data: [], count: 0, error }
    }

    return { data: data || [], count: count || 0, error: null }
  } catch (error) {
    console.error('[ActivityLogger] Exception querying activity logs:', error)
    return { data: [], count: 0, error }
  }
}

/**
 * Get activity summary for a user
 */
export async function getActivitySummary(userId: string, days: number = 30) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_user_activity_summary' as never, {
      p_user_id: userId,
      p_days: days,
    } as never)

    if (error) {
      console.error('[ActivityLogger] Failed to get activity summary:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('[ActivityLogger] Exception getting activity summary:', error)
    return { data: [], error }
  }
}

/**
 * Get recent API errors
 */
export async function getRecentApiErrors(userId?: string, limit: number = 50) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_recent_api_errors' as never, {
      p_user_id: userId || null,
      p_limit: limit,
    } as never)

    if (error) {
      console.error('[ActivityLogger] Failed to get recent API errors:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('[ActivityLogger] Exception getting recent API errors:', error)
    return { data: [], error }
  }
}
