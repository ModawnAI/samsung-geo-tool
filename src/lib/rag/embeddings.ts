import OpenAI from 'openai'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// OpenAI client singleton for embeddings
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// Supabase client for embedding cache
let supabaseClient: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      supabaseClient = createClient<Database>(url, key)
    }
  }
  return supabaseClient
}

// Embedding model configuration
// Using text-embedding-3-large with reduced dimensions to match Pinecone index (1024)
export const EMBEDDING_MODEL = 'text-embedding-3-large'
export const EMBEDDING_DIMENSIONS = 1024

// Cache configuration
const CACHE_ENABLED = process.env.EMBEDDING_CACHE_ENABLED !== 'false'
const CACHE_TTL_DAYS = 7

/**
 * Generate a cache key from text and model
 */
function generateCacheKey(text: string, model: string): string {
  // Simple hash using substring of normalized text
  const normalized = text.toLowerCase().trim().slice(0, 500)
  const hash = Array.from(normalized)
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(36)
  return `${model}:${hash}:${normalized.length}`
}

/**
 * Try to get embedding from cache
 */
async function getCachedEmbedding(cacheKey: string): Promise<number[] | null> {
  if (!CACHE_ENABLED) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('embedding_cache')
      .select('embedding, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null

    // Update access stats (fire and forget) - increment hit_count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('embedding_cache') as any)
      .update({ hit_count: ((data as { hit_count?: number }).hit_count || 0) + 1 })
      .eq('cache_key', cacheKey)
      .then(() => {})

    console.log(`[Embedding Cache] HIT for key: ${cacheKey.slice(0, 30)}...`)
    return (data as { embedding: number[] }).embedding
  } catch {
    return null
  }
}

/**
 * Store embedding in cache
 */
async function cacheEmbedding(
  cacheKey: string,
  text: string,
  embedding: number[],
  model: string
): Promise<void> {
  if (!CACHE_ENABLED) return

  const supabase = getSupabaseClient()
  if (!supabase) return

  try {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('embedding_cache') as any).upsert({
      cache_key: cacheKey,
      query_text: text.slice(0, 1000), // Limit stored text
      embedding,
      model,
      dimensions: embedding.length,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'cache_key'
    })

    console.log(`[Embedding Cache] STORED key: ${cacheKey.slice(0, 30)}...`)
  } catch (error) {
    console.warn('[Embedding Cache] Failed to store:', error)
  }
}

/**
 * Generate embedding for a single text with caching
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = generateCacheKey(text, EMBEDDING_MODEL)

  // Try cache first
  const cached = await getCachedEmbedding(cacheKey)
  if (cached) {
    return cached
  }

  // Generate new embedding
  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
    encoding_format: 'float',
  })

  const embedding = response.data[0].embedding

  // Cache the result (fire and forget)
  cacheEmbedding(cacheKey, text, embedding, EMBEDDING_MODEL).catch(() => {})

  return embedding
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const client = getOpenAIClient()

  // OpenAI has a limit of 2048 inputs per request
  const batchSize = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    })

    const batchEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding)

    allEmbeddings.push(...batchEmbeddings)
  }

  return allEmbeddings
}

/**
 * Check if OpenAI is configured for embeddings
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}
