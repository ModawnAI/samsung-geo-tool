import { getPineconeClient, getPlaybookIndex, PLAYBOOK_NAMESPACE } from '@/lib/pinecone/client'
import { chunkText, preprocessMarkdown, detectLanguage, detectSection } from './chunking'
import type {
  PlaybookMetadata,
  PlaybookSection,
  ProductCategory,
  ContentType,
  DocumentChunk,
  IngestRequest,
  IngestionStatus,
  ChunkingConfig,
} from '@/types/playbook'
import { createClient } from '@supabase/supabase-js'

// PDF parsing (dynamic import for server-side only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null

async function getPdfParser(): Promise<(buffer: Buffer) => Promise<{ text: string }>> {
  if (!pdfParse) {
    // Dynamic import with explicit type handling
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfModule = require('pdf-parse')
    pdfParse = pdfModule
  }
  return pdfParse as (buffer: Buffer) => Promise<{ text: string }>
}

// DOCX parsing
let mammoth: typeof import('mammoth') | null = null

async function getMammoth() {
  if (!mammoth) {
    mammoth = await import('mammoth')
  }
  return mammoth
}

/**
 * Parse document content based on file type
 */
export async function parseDocument(
  fileBuffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt' | 'md'
): Promise<string> {
  switch (fileType) {
    case 'pdf': {
      const parser = await getPdfParser()
      const pdfData = await parser(fileBuffer)
      return pdfData.text
    }

    case 'docx': {
      const mammothLib = await getMammoth()
      const result = await mammothLib.extractRawText({ buffer: fileBuffer })
      return result.value
    }

    case 'txt':
    case 'md':
      return fileBuffer.toString('utf-8')

    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Ingest a document into the Samsung Marketing Playbook vector database
 */
export async function ingestDocument(
  request: IngestRequest,
  chunkingConfig: ChunkingConfig = {
    maxChunkSize: 1000,
    chunkOverlap: 200,
    minChunkSize: 100,
    preserveParagraphs: true,
  }
): Promise<IngestionStatus> {
  const documentId = generateDocumentId()
  const startTime = Date.now()

  try {
    // Preprocess content based on file type
    let processedContent = request.content
    if (request.fileType === 'md') {
      processedContent = preprocessMarkdown(request.content)
    }

    // Detect language if not specified
    const language = request.language || detectLanguage(processedContent)

    // Chunk the document
    const textChunks = chunkText(processedContent, chunkingConfig)

    if (textChunks.length === 0) {
      throw new Error('No content to ingest after processing')
    }

    // Prepare chunks with metadata
    const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => {
      const section = request.section || detectSection(chunk.content) as PlaybookSection

      return {
        id: `${documentId}_chunk_${index}`,
        content: chunk.content,
        metadata: {
          documentId,
          chunkIndex: index,
          totalChunks: textChunks.length,
          section,
          subsection: extractSubsection(chunk.content),
          pageNumber: estimatePageNumber(chunk.startOffset, processedContent.length),
          productCategory: request.productCategory || 'all',
          contentType: detectContentType(chunk.content),
          language,
          version: request.version || '1.0',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'system',
        },
      }
    })

    // Prepare records for Pinecone integrated inference (multilingual-e5-large)
    const records = documentChunks.map((chunk) => ({
      _id: chunk.id,
      content: chunk.content, // Required for integrated inference (fieldMap.text)
      documentId: chunk.metadata.documentId || '',
      chunkIndex: chunk.metadata.chunkIndex || 0,
      totalChunks: chunk.metadata.totalChunks || 0,
      section: chunk.metadata.section || 'other',
      subsection: chunk.metadata.subsection || '',
      productCategory: chunk.metadata.productCategory || 'all',
      contentType: chunk.metadata.contentType || 'general',
      language: chunk.metadata.language || 'ko',
      version: chunk.metadata.version || '1.0',
      uploadedAt: chunk.metadata.uploadedAt || new Date().toISOString(),
      uploadedBy: chunk.metadata.uploadedBy || 'system',
    }))

    // Upsert to Pinecone using integrated inference in batches
    const pinecone = getPineconeClient()
    const index = pinecone.index('samsung-marketing-playbook')

    const batchSize = 50
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      await index.namespace(PLAYBOOK_NAMESPACE).upsertRecords(batch)
    }

    // Store document record in Supabase
    await storeDocumentRecord({
      id: documentId,
      name: request.documentName,
      fileName: request.documentName,
      fileType: request.fileType,
      section: request.section || 'other',
      productCategory: request.productCategory || 'all',
      language,
      version: request.version || '1.0',
      totalChunks: textChunks.length,
      status: 'indexed',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'system',
      indexedAt: new Date().toISOString(),
    })

    return {
      documentId,
      status: 'indexed',
      chunksProcessed: textChunks.length,
      totalChunks: textChunks.length,
    }
  } catch (error) {
    console.error('Ingestion error:', error)

    // Store failed document record
    await storeDocumentRecord({
      id: documentId,
      name: request.documentName,
      fileName: request.documentName,
      fileType: request.fileType,
      section: request.section || 'other',
      productCategory: request.productCategory || 'all',
      language: request.language || 'en',
      version: request.version || '1.0',
      totalChunks: 0,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'system',
    })

    return {
      documentId,
      status: 'failed',
      chunksProcessed: 0,
      totalChunks: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete a document and all its chunks from the vector database
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const index = getPlaybookIndex()
  const namespace = index.namespace(PLAYBOOK_NAMESPACE)

  // Delete vectors by documentId metadata filter
  await namespace.deleteMany({ documentId: { $eq: documentId } })

  // Update document status in Supabase
  const supabase = getSupabaseClient()
  if (supabase) {
    await supabase
      .from('playbook_documents')
      .delete()
      .eq('id', documentId)
  }
}

/**
 * Get ingestion status for a document
 */
export async function getIngestionStatus(documentId: string): Promise<IngestionStatus | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('playbook_documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !data) return null

  return {
    documentId: data.id,
    status: data.status,
    chunksProcessed: data.status === 'indexed' ? data.total_chunks : 0,
    totalChunks: data.total_chunks,
    errorMessage: data.error_message,
  }
}

/**
 * List all ingested documents
 */
export async function listDocuments(): Promise<{
  id: string
  name: string
  section: PlaybookSection
  productCategory: ProductCategory | 'all'
  status: string
  totalChunks: number
  uploadedAt: string
}[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('playbook_documents')
    .select('id, name, section, product_category, status, total_chunks, uploaded_at')
    .order('uploaded_at', { ascending: false })

  if (error || !data) return []

  return data.map((doc) => ({
    id: doc.id,
    name: doc.name,
    section: doc.section as PlaybookSection,
    productCategory: doc.product_category as ProductCategory | 'all',
    status: doc.status,
    totalChunks: doc.total_chunks,
    uploadedAt: doc.uploaded_at,
  }))
}

// Helper functions

function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function extractSubsection(content: string): string {
  // Try to extract subsection from headers
  const headerMatch = content.match(/^#+\s+(.+)$/m)
  if (headerMatch) {
    return headerMatch[1].slice(0, 100)
  }

  // Fall back to first line
  const firstLine = content.split('\n')[0].trim()
  return firstLine.slice(0, 100) || 'General'
}

function estimatePageNumber(offset: number, totalLength: number): number {
  // Estimate page number based on position (assuming ~3000 chars per page)
  const charsPerPage = 3000
  return Math.floor(offset / charsPerPage) + 1
}

function detectContentType(content: string): ContentType {
  // Detect bullet points
  if (/^[\s]*[-•*]\s/m.test(content)) {
    return 'bullet_points'
  }

  // Detect tables (simple heuristic)
  if (/\|.*\|/.test(content) || /\t.*\t/.test(content)) {
    return 'table'
  }

  // Detect headings
  if (/^#+\s/.test(content)) {
    return 'heading'
  }

  // Detect quotes
  if (/^[""]/.test(content) || /^>/.test(content)) {
    return 'quote'
  }

  // Detect examples (common patterns)
  if (/example|e\.g\.|for instance|such as/i.test(content)) {
    return 'example'
  }

  return 'text'
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

async function storeDocumentRecord(record: {
  id: string
  name: string
  fileName: string
  fileType: string
  section: PlaybookSection | 'other'
  productCategory: ProductCategory | 'all'
  language: 'en' | 'ko'
  version: string
  totalChunks: number
  status: 'processing' | 'indexed' | 'failed'
  errorMessage?: string
  uploadedAt: string
  uploadedBy: string
  indexedAt?: string
}): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase not configured, skipping document record storage')
    return
  }

  const { error } = await supabase.from('playbook_documents').upsert({
    id: record.id,
    name: record.name,
    file_name: record.fileName,
    file_type: record.fileType,
    section: record.section,
    product_category: record.productCategory,
    language: record.language,
    version: record.version,
    total_chunks: record.totalChunks,
    status: record.status,
    error_message: record.errorMessage,
    uploaded_at: record.uploadedAt,
    uploaded_by: record.uploadedBy,
    indexed_at: record.indexedAt,
  })

  if (error) {
    console.error('Error storing document record:', error)
  }
}
