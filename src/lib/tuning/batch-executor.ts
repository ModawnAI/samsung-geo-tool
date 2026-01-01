/**
 * BatchExecutor Service
 * Server-side orchestration for batch job processing
 * Manages job lifecycle, item processing, and progress tracking
 */

import { createClient } from '@/lib/supabase/server'
import type { Tables, InsertTables, UpdateTables, Json } from '@/types/database'
import type { BatchJobStatus, BatchJobItemStatus } from '@/types/tuning'
import { loadTuningConfig, type TuningConfig } from './integration'

// ==========================================
// TYPES
// ==========================================

export type BatchJob = Tables<'batch_jobs'>
export type BatchJobItem = Tables<'batch_job_items'>

export interface BatchExecutorConfig {
  concurrency: number
  retryAttempts: number
  retryDelayMs: number
  delayBetweenItems: number
  stopOnError: boolean
  progressCallback?: (progress: BatchProgress) => void
}

export interface BatchProgress {
  jobId: string
  status: BatchJobStatus
  total: number
  processed: number
  failed: number
  currentItem?: string
  estimatedTimeRemaining?: number
  startedAt?: string
  lastUpdated: string
}

export interface BatchItemResult {
  itemId: string
  success: boolean
  output?: Json
  error?: string
  processingTimeMs: number
}

export interface BatchJobResult {
  job: BatchJob
  itemResults: BatchItemResult[]
  summary: {
    total: number
    completed: number
    failed: number
    skipped: number
    totalProcessingTimeMs: number
    averageProcessingTimeMs: number
  }
}

export interface CreateBatchJobParams {
  name: string
  type: string
  items: Array<{
    input_data: Json
  }>
  config?: BatchExecutorConfig
  estimatedCost?: number
}

type ProcessItemFunction = (
  item: BatchJobItem,
  tuningConfig: TuningConfig
) => Promise<{ success: boolean; output?: Json; error?: string }>

// Default configuration
const DEFAULT_CONFIG: BatchExecutorConfig = {
  concurrency: 3,
  retryAttempts: 2,
  retryDelayMs: 1000,
  delayBetweenItems: 100,
  stopOnError: false,
}

// ==========================================
// BATCH JOB CRUD OPERATIONS
// ==========================================

/**
 * Create a new batch job with its items
 */
export async function createBatchJob(
  params: CreateBatchJobParams,
  userId: string
): Promise<{ job: BatchJob | null; items: BatchJobItem[]; error?: string }> {
  try {
    const supabase = await createClient()

    // Create the batch job
    const jobData: InsertTables<'batch_jobs'> = {
      name: params.name,
      type: params.type,
      total_items: params.items.length,
      processed_items: 0,
      failed_items: 0,
      status: 'pending',
      config: (params.config || DEFAULT_CONFIG) as unknown as Json,
      estimated_cost: params.estimatedCost || null,
      created_by: userId,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job, error: jobError } = await (supabase as any)
      .from('batch_jobs')
      .insert(jobData)
      .select()
      .single()

    if (jobError) throw jobError
    if (!job) throw new Error('Failed to create batch job')

    // Create batch job items
    const itemsData: InsertTables<'batch_job_items'>[] = params.items.map(
      (item, index) => ({
        batch_job_id: job.id,
        sequence_number: index + 1,
        input_data: item.input_data,
        status: 'pending' as BatchJobItemStatus,
      })
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error: itemsError } = await (supabase as any)
      .from('batch_job_items')
      .insert(itemsData)
      .select()

    if (itemsError) throw itemsError

    console.log(`[BatchExecutor] Created job ${job.id} with ${items?.length || 0} items`)

    return { job, items: items || [] }
  } catch (error) {
    console.error('[BatchExecutor] Error creating batch job:', error)
    return {
      job: null,
      items: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a batch job by ID with its items
 */
export async function getBatchJob(jobId: string): Promise<{
  job: BatchJob | null
  items: BatchJobItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [jobResult, itemsResult] = await Promise.all([
      (supabase as any).from('batch_jobs').select('*').eq('id', jobId).single(),
      (supabase as any)
        .from('batch_job_items')
        .select('*')
        .eq('batch_job_id', jobId)
        .order('sequence_number', { ascending: true }),
    ])

    if (jobResult.error) throw jobResult.error

    return {
      job: jobResult.data,
      items: itemsResult.data || [],
    }
  } catch (error) {
    console.error(`[BatchExecutor] Error getting batch job ${jobId}:`, error)
    return {
      job: null,
      items: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update batch job status and progress
 */
export async function updateBatchJobProgress(
  jobId: string,
  updates: Partial<{
    status: BatchJobStatus
    processed_items: number
    failed_items: number
    results: Json
    error_log: string[]
    actual_cost: number
    started_at: string
    completed_at: string
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('batch_jobs')
      .update(updates as UpdateTables<'batch_jobs'>)
      .eq('id', jobId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error(`[BatchExecutor] Error updating job ${jobId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update a batch job item
 */
export async function updateBatchJobItem(
  itemId: string,
  updates: Partial<{
    status: BatchJobItemStatus
    output_data: Json
    error_message: string
    processing_time_ms: number
    processed_at: string
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('batch_job_items')
      .update(updates as UpdateTables<'batch_job_items'>)
      .eq('id', itemId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error(`[BatchExecutor] Error updating item ${itemId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==========================================
// BATCH EXECUTION ENGINE
// ==========================================

/**
 * Execute a batch job with the given processor function
 * This is the main entry point for running batch jobs
 */
export async function executeBatchJob(
  jobId: string,
  processItem: ProcessItemFunction,
  configOverrides?: Partial<BatchExecutorConfig>
): Promise<BatchJobResult> {
  const startTime = Date.now()

  // Get job and items
  const { job, items, error: fetchError } = await getBatchJob(jobId)

  if (fetchError || !job) {
    throw new Error(`Failed to fetch batch job: ${fetchError || 'Job not found'}`)
  }

  if (job.status === 'running') {
    throw new Error('Batch job is already running')
  }

  if (job.status === 'completed') {
    throw new Error('Batch job has already completed')
  }

  // Merge configuration
  const savedConfig = (job.config as unknown as BatchExecutorConfig) || {}
  const config: BatchExecutorConfig = {
    ...DEFAULT_CONFIG,
    ...savedConfig,
    ...configOverrides,
  }

  // Load tuning configuration for prompts and weights
  const tuningConfig = await loadTuningConfig()
  console.log(
    `[BatchExecutor] Loaded tuning config (source: ${tuningConfig.source})`
  )

  // Update job status to running
  await updateBatchJobProgress(jobId, {
    status: 'running',
    started_at: new Date().toISOString(),
  })

  // Get pending items only
  const pendingItems = items.filter((item) => item.status === 'pending')

  // Process items with concurrency control
  const itemResults: BatchItemResult[] = []
  const errorLog: string[] = []
  let processedCount = 0
  let failedCount = job.failed_items

  // Create item queue for concurrent processing
  const itemQueue = [...pendingItems]
  const activePromises: Promise<void>[] = []
  let shouldStop = false

  const processNextItem = async (): Promise<void> => {
    while (itemQueue.length > 0 && !shouldStop) {
      const item = itemQueue.shift()
      if (!item) continue

      const result = await processItemWithRetry(
        item,
        processItem,
        tuningConfig,
        config
      )

      itemResults.push(result)
      processedCount++

      // Update item in database
      await updateBatchJobItem(item.id, {
        status: result.success ? 'completed' : 'failed',
        output_data: result.output || null,
        error_message: result.error ?? undefined,
        processing_time_ms: result.processingTimeMs,
        processed_at: new Date().toISOString(),
      })

      if (!result.success) {
        failedCount++
        errorLog.push(`Item ${item.sequence_number}: ${result.error}`)

        if (config.stopOnError) {
          shouldStop = true
        }
      }

      // Update job progress
      await updateBatchJobProgress(jobId, {
        processed_items: processedCount + (job.processed_items || 0),
        failed_items: failedCount,
        error_log: errorLog.length > 0 ? errorLog : undefined,
      })

      // Notify progress if callback provided
      if (config.progressCallback) {
        config.progressCallback({
          jobId,
          status: 'running',
          total: job.total_items,
          processed: processedCount + (job.processed_items || 0),
          failed: failedCount,
          currentItem: `Item ${item.sequence_number}`,
          lastUpdated: new Date().toISOString(),
        })
      }

      // Delay between items
      if (config.delayBetweenItems > 0 && itemQueue.length > 0) {
        await delay(config.delayBetweenItems)
      }
    }
  }

  // Start concurrent workers
  const workerCount = Math.min(config.concurrency, pendingItems.length)
  for (let i = 0; i < workerCount; i++) {
    activePromises.push(processNextItem())
  }

  // Wait for all workers to complete
  await Promise.all(activePromises)

  // Calculate final statistics
  const totalProcessingTimeMs = Date.now() - startTime
  const completedCount = itemResults.filter((r) => r.success).length
  const skippedCount = items.length - pendingItems.length - processedCount

  // Update job as completed or failed
  const finalStatus: BatchJobStatus =
    shouldStop && config.stopOnError
      ? 'failed'
      : failedCount === pendingItems.length
        ? 'failed'
        : 'completed'

  const { job: updatedJob } = await getBatchJob(jobId)

  await updateBatchJobProgress(jobId, {
    status: finalStatus,
    completed_at: new Date().toISOString(),
    results: {
      summary: {
        total: job.total_items,
        completed: completedCount,
        failed: failedCount,
        skipped: skippedCount,
        totalProcessingTimeMs,
        averageProcessingTimeMs:
          processedCount > 0 ? Math.round(totalProcessingTimeMs / processedCount) : 0,
      },
    } as unknown as Json,
  })

  console.log(
    `[BatchExecutor] Job ${jobId} completed: ${completedCount}/${job.total_items} successful, ${failedCount} failed`
  )

  return {
    job: updatedJob || job,
    itemResults,
    summary: {
      total: job.total_items,
      completed: completedCount,
      failed: failedCount,
      skipped: skippedCount,
      totalProcessingTimeMs,
      averageProcessingTimeMs:
        processedCount > 0 ? Math.round(totalProcessingTimeMs / processedCount) : 0,
    },
  }
}

/**
 * Process a single item with retry logic
 */
async function processItemWithRetry(
  item: BatchJobItem,
  processItem: ProcessItemFunction,
  tuningConfig: TuningConfig,
  config: BatchExecutorConfig
): Promise<BatchItemResult> {
  const startTime = Date.now()
  let lastError: string | undefined

  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    try {
      // Update item status to processing
      await updateBatchJobItem(item.id, {
        status: 'processing',
      })

      // Process the item
      const result = await processItem(item, tuningConfig)

      return {
        itemId: item.id,
        success: result.success,
        output: result.output,
        error: result.error,
        processingTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      console.warn(
        `[BatchExecutor] Item ${item.id} attempt ${attempt + 1} failed: ${lastError}`
      )

      if (attempt < config.retryAttempts) {
        await delay(config.retryDelayMs * (attempt + 1))
      }
    }
  }

  return {
    itemId: item.id,
    success: false,
    error: lastError || 'Max retries exceeded',
    processingTimeMs: Date.now() - startTime,
  }
}

// ==========================================
// BATCH JOB CONTROL OPERATIONS
// ==========================================

/**
 * Pause a running batch job
 */
export async function pauseBatchJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  return updateBatchJobProgress(jobId, {
    status: 'paused',
  })
}

/**
 * Resume a paused batch job
 * Note: This only updates status - actual resumption requires re-calling executeBatchJob
 */
export async function resumeBatchJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  const { job, error } = await getBatchJob(jobId)

  if (error || !job) {
    return { success: false, error: error || 'Job not found' }
  }

  if (job.status !== 'paused') {
    return { success: false, error: 'Job is not paused' }
  }

  return updateBatchJobProgress(jobId, {
    status: 'pending', // Set to pending so it can be picked up by executeBatchJob
  })
}

/**
 * Cancel a batch job
 */
export async function cancelBatchJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  return updateBatchJobProgress(jobId, {
    status: 'failed',
    completed_at: new Date().toISOString(),
    error_log: ['Job cancelled by user'],
  })
}

// ==========================================
// BATCH JOB QUERIES
// ==========================================

/**
 * Get all batch jobs with optional filtering
 */
export async function listBatchJobs(options?: {
  status?: BatchJobStatus
  type?: string
  limit?: number
  offset?: number
}): Promise<{ jobs: BatchJob[]; total: number; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('batch_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.type) {
      query = query.eq('type', options.type)
    }

    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) throw error

    return { jobs: data || [], total: count || 0 }
  } catch (error) {
    console.error('[BatchExecutor] Error listing batch jobs:', error)
    return {
      jobs: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get batch job items with optional filtering
 */
export async function listBatchJobItems(
  jobId: string,
  options?: {
    status?: BatchJobItemStatus
    limit?: number
    offset?: number
  }
): Promise<{ items: BatchJobItem[]; total: number; error?: string }> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('batch_job_items')
      .select('*', { count: 'exact' })
      .eq('batch_job_id', jobId)
      .order('sequence_number', { ascending: true })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) throw error

    return { items: data || [], total: count || 0 }
  } catch (error) {
    console.error(`[BatchExecutor] Error listing items for job ${jobId}:`, error)
    return {
      items: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get running batch jobs count
 */
export async function getRunningJobsCount(): Promise<number> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('batch_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running')

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('[BatchExecutor] Error getting running jobs count:', error)
    return 0
  }
}

// ==========================================
// BATCH PROCESSOR FACTORIES
// ==========================================

/**
 * Create a processor for content generation batch jobs
 * This wraps the generate-v2 pipeline for batch processing
 */
export function createGenerationProcessor(): ProcessItemFunction {
  return async (item, tuningConfig) => {
    const inputData = item.input_data as Record<string, unknown>

    // Extract required fields from input
    const productName = inputData.productName as string
    const srtContent = inputData.srtContent as string
    const keywords = (inputData.keywords as string[]) || []
    const language = (inputData.language as 'ko' | 'en') || 'en'

    if (!productName || !srtContent) {
      return {
        success: false,
        error: 'Missing required fields: productName and srtContent',
      }
    }

    try {
      // Call the generate-v2 API internally
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName,
          srtContent,
          keywords,
          language,
          // Pass tuning config info for tracking
          _tuningMetadata: {
            batchProcessing: true,
            configSource: tuningConfig.source,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || `Generation failed with status ${response.status}`,
        }
      }

      const result = await response.json()

      return {
        success: true,
        output: result as Json,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      }
    }
  }
}

/**
 * Create a processor for validation batch jobs
 * Runs content through validation checks
 */
export function createValidationProcessor(): ProcessItemFunction {
  return async (item, _tuningConfig) => {
    const inputData = item.input_data as Record<string, unknown>

    const generationId = inputData.generationId as string

    if (!generationId) {
      return {
        success: false,
        error: 'Missing required field: generationId',
      }
    }

    try {
      // Validation logic would go here
      // For now, return success placeholder
      return {
        success: true,
        output: {
          generationId,
          validationStatus: 'pending',
          timestamp: new Date().toISOString(),
        } as Json,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Estimate batch job cost based on item count and type
 */
export function estimateBatchCost(
  type: string,
  itemCount: number
): { estimatedCost: number; costBreakdown: Record<string, number> } {
  // Cost estimates per item type (in API units/tokens)
  const costPerItem: Record<string, number> = {
    generation: 0.05, // ~50k tokens per generation
    validation: 0.01, // ~10k tokens per validation
    analysis: 0.02, // ~20k tokens per analysis
    default: 0.03,
  }

  const unitCost = costPerItem[type] || costPerItem.default
  const estimatedCost = itemCount * unitCost

  return {
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    costBreakdown: {
      itemCount,
      costPerItem: unitCost,
      total: estimatedCost,
    },
  }
}

/**
 * Get batch job statistics summary
 */
export async function getBatchJobStats(): Promise<{
  total: number
  byStatus: Record<BatchJobStatus, number>
  recentJobs: BatchJob[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get count by status
    const statusCounts: Record<BatchJobStatus, number> = {
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: countData, error: countError } = await (supabase as any)
      .from('batch_jobs')
      .select('status')

    if (countError) throw countError

    for (const row of countData || []) {
      const status = row.status as BatchJobStatus
      if (status in statusCounts) {
        statusCounts[status]++
      }
    }

    // Get recent jobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentData, error: recentError } = await (supabase as any)
      .from('batch_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return {
      total,
      byStatus: statusCounts,
      recentJobs: recentData || [],
    }
  } catch (error) {
    console.error('[BatchExecutor] Error getting batch job stats:', error)
    return {
      total: 0,
      byStatus: {
        pending: 0,
        running: 0,
        paused: 0,
        completed: 0,
        failed: 0,
      },
      recentJobs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
