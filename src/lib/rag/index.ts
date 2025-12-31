/**
 * Samsung Marketing Playbook RAG System
 *
 * This module provides RAG (Retrieval-Augmented Generation) capabilities
 * for the Samsung GEO Tool, enabling content generation aligned with
 * the Samsung Marketing Playbook.
 */

// Chunking utilities
export {
  chunkText,
  preprocessMarkdown,
  detectLanguage,
  detectSection,
  type TextChunk,
} from './chunking'

// Embedding generation
export {
  generateEmbedding,
  generateEmbeddings,
  isOpenAIConfigured,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from './embeddings'

// Document ingestion
export {
  parseDocument,
  ingestDocument,
  deleteDocument,
  getIngestionStatus,
  listDocuments,
} from './ingestion'

// Samsung Playbook specialized ingestion
export { ingestSamsungPlaybook } from './playbook-ingestion'

// Vector search with reranking
export {
  searchPlaybook,
  multiQuerySearch,
  expandedSearch,
  getSectionContext,
  isCohereConfigured,
} from './search'
