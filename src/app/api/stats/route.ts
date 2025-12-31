import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface WeeklyTrendItem {
  created_at: string
  status: 'draft' | 'confirmed'
}

interface TopProductItem {
  product_id: string
  products: { name: string } | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current date info
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Parallel queries for stats
    const [
      totalGenerations,
      todayGenerations,
      weekGenerations,
      confirmedGenerations,
      draftGenerations,
      totalBriefs,
      activeBriefs,
      totalProducts,
      recentActivity,
      weeklyTrend,
      topProducts,
    ] = await Promise.all([
      // Total generations
      supabase.from('generations').select('id', { count: 'exact', head: true }),

      // Today's generations
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString()),

      // This week's generations
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString()),

      // Confirmed generations
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'confirmed'),

      // Draft generations
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),

      // Total briefs
      supabase.from('briefs').select('id', { count: 'exact', head: true }),

      // Active briefs
      supabase
        .from('briefs')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Total products
      supabase.from('products').select('id', { count: 'exact', head: true }),

      // Recent activity (last 10)
      supabase
        .from('generations')
        .select(`
          id,
          status,
          campaign_tag,
          created_at,
          products (name),
          users (email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(10),

      // Weekly trend (last 7 days)
      supabase
        .from('generations')
        .select('created_at, status')
        .gte('created_at', startOfWeek.toISOString())
        .order('created_at', { ascending: true }),

      // Top products by generation count
      supabase
        .from('generations')
        .select('product_id, products (name)')
        .gte('created_at', startOfMonth.toISOString()),
    ])

    // Process weekly trend data
    const trendByDay: Record<string, { date: string; total: number; confirmed: number; draft: number }> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().split('T')[0]
      trendByDay[key] = {
        date: days[d.getDay()],
        total: 0,
        confirmed: 0,
        draft: 0,
      }
    }

    // Fill in actual data
    if (weeklyTrend.data) {
      (weeklyTrend.data as WeeklyTrendItem[]).forEach((gen) => {
        const key = new Date(gen.created_at).toISOString().split('T')[0]
        if (trendByDay[key]) {
          trendByDay[key].total++
          if (gen.status === 'confirmed') {
            trendByDay[key].confirmed++
          } else {
            trendByDay[key].draft++
          }
        }
      })
    }

    // Process top products
    const productCounts: Record<string, { name: string; count: number }> = {}
    if (topProducts.data) {
      (topProducts.data as TopProductItem[]).forEach((gen) => {
        const productName = gen.products?.name || 'Unknown'
        if (!productCounts[gen.product_id]) {
          productCounts[gen.product_id] = { name: productName, count: 0 }
        }
        productCounts[gen.product_id].count++
      })
    }
    const sortedProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate confirmation rate
    const total = totalGenerations.count || 0
    const confirmed = confirmedGenerations.count || 0
    const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0

    return NextResponse.json({
      overview: {
        totalGenerations: totalGenerations.count || 0,
        todayGenerations: todayGenerations.count || 0,
        weekGenerations: weekGenerations.count || 0,
        confirmedGenerations: confirmedGenerations.count || 0,
        draftGenerations: draftGenerations.count || 0,
        totalBriefs: totalBriefs.count || 0,
        activeBriefs: activeBriefs.count || 0,
        totalProducts: totalProducts.count || 0,
        confirmationRate,
      },
      weeklyTrend: Object.values(trendByDay),
      topProducts: sortedProducts,
      recentActivity: recentActivity.data || [],
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
