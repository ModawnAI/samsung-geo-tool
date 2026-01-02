/**
 * Delete All Vectors API
 * Deletes all vectors from the playbook namespace
 */

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

export async function DELETE(request: NextRequest) {
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
      }, { status: 500 })
    }

    console.log('[Delete All Vectors] Starting deletion...')

    const pc = getPineconeClient()
    const index = pc.index(PLAYBOOK_INDEX_NAME)
    const namespace = index.namespace(PLAYBOOK_NAMESPACE)

    // Delete all vectors in the namespace by deleting the entire namespace
    await namespace.deleteAll()

    console.log('[Delete All Vectors] Successfully deleted all vectors from namespace')

    // Also clear document records from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { error: deleteError } = await supabase
        .from('playbook_documents')
        .delete()
        .neq('id', '') // Delete all records

      if (deleteError) {
        console.warn('[Delete All Vectors] Warning: Could not clear Supabase records:', deleteError)
      } else {
        console.log('[Delete All Vectors] Cleared Supabase document records')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All vectors deleted from playbook namespace',
    })
  } catch (error) {
    console.error('[Delete All Vectors] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete vectors',
      },
      { status: 500 }
    )
  }
}
