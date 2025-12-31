import { Pinecone } from '@pinecone-database/pinecone'
import type { PlaybookMetadata } from '@/types/playbook'

// Pinecone client singleton
let pineconeClient: Pinecone | null = null

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set')
    }
    pineconeClient = new Pinecone({ apiKey })
  }
  return pineconeClient
}

// Index name for Samsung Marketing Playbook
export const PLAYBOOK_INDEX_NAME = 'samsung-marketing-playbook'
export const PLAYBOOK_NAMESPACE = 'playbook-v1'

// Get the playbook index with typed metadata
export function getPlaybookIndex() {
  const pc = getPineconeClient()
  return pc.index<PlaybookMetadata>(PLAYBOOK_INDEX_NAME)
}

// Check if Pinecone is configured
export function isPineconeConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY
}

// Reranking models available through Cohere API
export const RERANK_MODELS = {
  COHERE: 'rerank-multilingual-v3.0',
  COHERE_ENGLISH: 'rerank-english-v3.0',
  BGE: 'bge-reranker-v2-m3',
  PINECONE: 'pinecone-rerank-v0',
} as const

export type RerankModel = typeof RERANK_MODELS[keyof typeof RERANK_MODELS]
