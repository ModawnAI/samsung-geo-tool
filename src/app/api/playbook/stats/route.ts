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

  // Check if user is admin (you can customize this check)
  return user.email === 'admin@admin.com' || user.role === 'admin'
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

    // Check if Pinecone is configured
    if (!isPineconeConfigured()) {
      return NextResponse.json({
        configured: false,
        error: 'Pinecone is not configured. Set PINECONE_API_KEY in environment variables.',
      })
    }

    // Get Pinecone client and index stats
    const pc = getPineconeClient()
    const index = pc.index(PLAYBOOK_INDEX_NAME)

    // Get index stats
    const stats = await index.describeIndexStats()

    // Get namespace-specific stats
    const namespaceStats = stats.namespaces?.[PLAYBOOK_NAMESPACE] || { recordCount: 0 }

    return NextResponse.json({
      configured: true,
      indexName: PLAYBOOK_INDEX_NAME,
      namespace: PLAYBOOK_NAMESPACE,
      totalRecords: stats.totalRecordCount || 0,
      namespaceRecords: namespaceStats.recordCount || 0,
      dimension: stats.dimension,
      indexFullness: stats.indexFullness || 0,
      namespaces: Object.keys(stats.namespaces || {}),
    })
  } catch (error) {
    console.error('Pinecone stats API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : 'Failed to get Pinecone stats'
      },
      { status: 500 }
    )
  }
}
