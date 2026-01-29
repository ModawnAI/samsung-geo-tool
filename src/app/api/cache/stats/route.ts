/**
 * Cache Stats API Route
 * GET: Retrieve cache statistics from both L1 and L2
 * DELETE: Prune expired cache entries
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getHybridCacheStats,
  pruneHybridCache,
  clearHybridCache,
} from '@/lib/cache/hybrid-cache'

/**
 * GET /api/cache/stats
 * Returns statistics from both L1 (in-memory) and L2 (Supabase) caches
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getHybridCacheStats()

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cache stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/cache/stats
 * Prunes expired entries from both cache layers
 * Query params:
 *   - action=prune (default): Remove expired entries only
 *   - action=clear: Clear all cache entries
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'prune'

    if (action === 'clear') {
      await clearHybridCache()
      return NextResponse.json({
        success: true,
        message: 'All cache entries cleared',
        timestamp: new Date().toISOString(),
      })
    }

    // Default action: prune expired entries
    const { l1Pruned, l2Pruned } = await pruneHybridCache()

    return NextResponse.json({
      success: true,
      pruned: {
        l1: l1Pruned,
        l2: l2Pruned,
        total: l1Pruned + l2Pruned,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cache prune API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
