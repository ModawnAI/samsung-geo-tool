import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPineconeClient, PLAYBOOK_INDEX_NAME, PLAYBOOK_NAMESPACE, isPineconeConfigured } from '@/lib/pinecone/client'

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

  return user.email === 'admin@admin.com' || user.role === 'admin'
}

export interface VectorRecord {
  id: string
  metadata: Record<string, unknown>
  values?: number[]
}

export interface VectorsResponse {
  vectors: VectorRecord[]
  pagination?: {
    next?: string
  }
  total?: number
}

export async function GET(request: NextRequest) {
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

    if (!isPineconeConfigured()) {
      return NextResponse.json({
        error: 'Pinecone is not configured.',
        vectors: [],
      })
    }

    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix') || ''
    const paginationToken = searchParams.get('paginationToken')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const includeValues = searchParams.get('includeValues') === 'true'

    const pc = getPineconeClient()
    const index = pc.index(PLAYBOOK_INDEX_NAME)
    const namespace = index.namespace(PLAYBOOK_NAMESPACE)

    // List vectors by prefix with pagination
    const listOptions: { prefix?: string; limit: number; paginationToken?: string } = {
      limit: Math.min(limit, 100), // Cap at 100
    }

    if (prefix) {
      listOptions.prefix = prefix
    }

    if (paginationToken) {
      listOptions.paginationToken = paginationToken
    }

    const listResult = await namespace.listPaginated(listOptions)

    if (!listResult.vectors || listResult.vectors.length === 0) {
      return NextResponse.json({
        vectors: [],
        pagination: listResult.pagination,
      })
    }

    // Get vector IDs from list result, filtering out any undefined values
    const vectorIds = listResult.vectors
      .map((v) => v.id)
      .filter((id): id is string => typeof id === 'string')

    // Fetch full vector data with metadata
    const fetchResult = await index.namespace(PLAYBOOK_NAMESPACE).fetch(vectorIds)

    // Transform records to response format
    const vectors: VectorRecord[] = Object.entries(fetchResult.records || {}).map(([id, record]) => ({
      id,
      metadata: record.metadata || {},
      values: includeValues ? record.values : undefined,
    }))

    return NextResponse.json({
      vectors,
      pagination: listResult.pagination,
      total: vectors.length,
    })
  } catch (error) {
    console.error('Vectors API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch vectors',
        vectors: [],
      },
      { status: 500 }
    )
  }
}
