/**
 * Samsung Marketing Strategy Playbook Specialized Ingestion API
 * Uses the intelligent playbook-specific ingestion with extensive metadata extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ingestSamsungPlaybook } from '@/lib/rag/playbook-ingestion'

// Verify admin authentication
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.split(' ')[1]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return false
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return false
  }

  // Check if user is admin
  return user.email === 'admin@admin.com' || user.role === 'admin'
}

export async function POST(request: NextRequest) {
  try {
    // Allow bypass in development with special header
    const devBypass = process.env.NODE_ENV === 'development' &&
                      request.headers.get('x-dev-bypass') === 'true'

    if (!devBypass) {
      const isAdmin = await verifyAdmin(request)
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 401 }
        )
      }
    }

    const contentType = request.headers.get('content-type') || ''
    let markdownContent: string
    let version: string | undefined
    let uploadedBy: string | undefined

    if (contentType.includes('application/json')) {
      // JSON body with markdown content
      const body = await request.json()
      markdownContent = body.content
      version = body.version
      uploadedBy = body.uploadedBy
    } else if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      version = formData.get('version') as string | undefined
      uploadedBy = formData.get('uploadedBy') as string | undefined

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      // Only accept markdown files
      if (!file.name.toLowerCase().endsWith('.md')) {
        return NextResponse.json(
          { error: 'Only .md (Markdown) files are supported for Samsung Playbook ingestion' },
          { status: 400 }
        )
      }

      markdownContent = await file.text()
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be application/json or multipart/form-data' },
        { status: 400 }
      )
    }

    if (!markdownContent || markdownContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Playbook content is empty' },
        { status: 400 }
      )
    }

    // Log ingestion start
    console.log('[Samsung Playbook Ingestion] Starting...')
    console.log(`[Samsung Playbook Ingestion] Content length: ${markdownContent.length} characters`)
    console.log(`[Samsung Playbook Ingestion] Version: ${version || '2025.1'}`)

    // Run the specialized ingestion
    const startTime = Date.now()
    const result = await ingestSamsungPlaybook(markdownContent, {
      version: version || '2025.1',
      uploadedBy: uploadedBy || 'admin',
    })
    const processingTime = Date.now() - startTime

    console.log(`[Samsung Playbook Ingestion] Completed in ${processingTime}ms`)
    console.log(`[Samsung Playbook Ingestion] Status: ${result.status}`)
    console.log(`[Samsung Playbook Ingestion] Total chunks: ${result.totalChunks}`)

    if (result.status === 'failed') {
      return NextResponse.json(
        {
          error: result.errorMessage,
          documentId: result.documentId,
          status: 'failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      totalChunks: result.totalChunks,
      status: result.status,
      processingTimeMs: processingTime,
      message: `Samsung Marketing Playbook successfully ingested with ${result.totalChunks} enriched chunks`,
    })
  } catch (error) {
    console.error('[Samsung Playbook Ingestion] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check configuration status
export async function GET() {
  const pineconeConfigured = !!process.env.PINECONE_API_KEY
  const openaiConfigured = !!process.env.OPENAI_API_KEY
  const cohereConfigured = !!process.env.COHERE_API_KEY

  return NextResponse.json({
    status: 'ready',
    configuration: {
      pinecone: pineconeConfigured,
      openai: openaiConfigured,
      cohere: cohereConfigured,
      allRequired: pineconeConfigured && openaiConfigured,
    },
    endpoints: {
      ingest: 'POST /api/playbook/ingest-samsung',
      search: 'POST /api/playbook/search',
    },
    metadata: {
      indexName: 'samsung-marketing-playbook',
      namespace: 'playbook-v1',
      embeddingModel: 'text-embedding-3-large',
      dimensions: 1024,
    },
  })
}
