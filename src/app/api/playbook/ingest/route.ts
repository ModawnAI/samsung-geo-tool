import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseDocument, ingestDocument } from '@/lib/rag/ingestion'
import type { PlaybookSection, ProductCategory } from '@/types/playbook'

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

  // Check if user is admin (you can customize this check)
  return user.email === 'admin@admin.com' || user.role === 'admin'
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentName = formData.get('documentName') as string
    const section = formData.get('section') as PlaybookSection | undefined
    const productCategory = formData.get('productCategory') as ProductCategory | 'all' | undefined
    const language = formData.get('language') as 'en' | 'ko' | undefined
    const version = formData.get('version') as string | undefined

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    let fileType: 'pdf' | 'docx' | 'txt' | 'md'

    if (fileName.endsWith('.pdf')) {
      fileType = 'pdf'
    } else if (fileName.endsWith('.docx')) {
      fileType = 'docx'
    } else if (fileName.endsWith('.txt')) {
      fileType = 'txt'
    } else if (fileName.endsWith('.md')) {
      fileType = 'md'
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported: pdf, docx, txt, md' },
        { status: 400 }
      )
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse document
    const content = await parseDocument(buffer, fileType)

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document appears to be empty or could not be parsed' },
        { status: 400 }
      )
    }

    // Ingest document
    const result = await ingestDocument({
      documentName: documentName || file.name,
      content,
      fileType,
      section,
      productCategory,
      language,
      version,
    })

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: result.errorMessage, documentId: result.documentId },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunksProcessed: result.chunksProcessed,
      totalChunks: result.totalChunks,
      status: result.status,
    })
  } catch (error) {
    console.error('Ingestion API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get ingestion status
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (documentId) {
      // Get specific document status
      const { getIngestionStatus } = await import('@/lib/rag/ingestion')
      const status = await getIngestionStatus(documentId)

      if (!status) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(status)
    } else {
      // List all documents
      const { listDocuments } = await import('@/lib/rag/ingestion')
      const documents = await listDocuments()

      return NextResponse.json({ documents })
    }
  } catch (error) {
    console.error('Ingestion status API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }

    const { deleteDocument } = await import('@/lib/rag/ingestion')
    await deleteDocument(documentId)

    return NextResponse.json({ success: true, documentId })
  } catch (error) {
    console.error('Document deletion API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
