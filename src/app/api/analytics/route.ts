/**
 * Analytics API Route
 * Provides comprehensive analytics data for the analytics dashboard
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GenerationWithScore {
  id: string
  geo_score_v2: { total: number } | null
  created_at: string
  status: string
  selected_keywords: string[] | null
  products: {
    name: string
    categories: { name: string } | null
  } | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    // Parallel queries for analytics data
    const [
      allGenerations,
      thisMonthGenerations,
      lastMonthGenerations,
      categoryStats,
    ] = await Promise.all([
      // All generations with scores (for distribution)
      supabase
        .from('generations')
        .select(`
          id,
          geo_score_v2,
          created_at,
          status,
          selected_keywords,
          products (
            name,
            categories (name)
          )
        `)
        .order('created_at', { ascending: false }),

      // This month's generations
      supabase
        .from('generations')
        .select('id, geo_score_v2, created_at')
        .gte('created_at', startOfMonth.toISOString()),

      // Last month's generations
      supabase
        .from('generations')
        .select('id, geo_score_v2')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString()),

      // Category counts
      supabase
        .from('generations')
        .select(`
          products!inner (
            categories!inner (name)
          )
        `)
        .gte('created_at', thirtyDaysAgo.toISOString()),
    ])

    // Process score distribution
    const scoreRanges = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    }

    const scores: number[] = []
    const generations = (allGenerations.data || []) as GenerationWithScore[]

    generations.forEach((gen) => {
      const score = gen.geo_score_v2?.total
      if (typeof score === 'number') {
        scores.push(score)
        if (score <= 20) scoreRanges['0-20']++
        else if (score <= 40) scoreRanges['21-40']++
        else if (score <= 60) scoreRanges['41-60']++
        else if (score <= 80) scoreRanges['61-80']++
        else scoreRanges['81-100']++
      }
    })

    // Calculate average score
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    // Process daily score trend (last 30 days)
    const dailyScores: Record<string, { total: number; count: number }> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyScores[key] = { total: 0, count: 0 }
    }

    generations.forEach((gen) => {
      const date = new Date(gen.created_at).toISOString().split('T')[0]
      const score = gen.geo_score_v2?.total
      if (dailyScores[date] && typeof score === 'number') {
        dailyScores[date].total += score
        dailyScores[date].count++
      }
    })

    const scoreTrend = Object.entries(dailyScores).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: data.count > 0 ? Math.round(data.total / data.count) : null,
      count: data.count,
    }))

    // Process keyword frequency
    const keywordCounts: Record<string, number> = {}
    generations.forEach((gen) => {
      (gen.selected_keywords || []).forEach((kw: string) => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1
      })
    })
    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }))

    // Process category breakdown
    const categoryCounts: Record<string, number> = {}
    interface CategoryData {
      products: { categories: { name: string } | null } | null
    }
    (categoryStats.data as CategoryData[] || []).forEach((gen) => {
      const categoryName = gen.products?.categories?.name || 'Uncategorized'
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1
    })
    const categoryBreakdown = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ category, count }))

    // Calculate month-over-month comparison
    interface MonthGeneration {
      geo_score_v2: { total: number } | null
    }
    const thisMonthCount = thisMonthGenerations.count || 0
    const lastMonthCount = lastMonthGenerations.count || 0
    const momChange = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : thisMonthCount > 0 ? 100 : 0

    const thisMonthScores = (thisMonthGenerations.data as MonthGeneration[] || [])
      .map(g => g.geo_score_v2?.total)
      .filter((s): s is number => typeof s === 'number')
    const lastMonthScores = (lastMonthGenerations.data as MonthGeneration[] || [])
      .map(g => g.geo_score_v2?.total)
      .filter((s): s is number => typeof s === 'number')

    const thisMonthAvg = thisMonthScores.length > 0
      ? Math.round(thisMonthScores.reduce((a, b) => a + b, 0) / thisMonthScores.length)
      : 0
    const lastMonthAvg = lastMonthScores.length > 0
      ? Math.round(lastMonthScores.reduce((a, b) => a + b, 0) / lastMonthScores.length)
      : 0

    // Calculate high-quality generation rate (score >= 70)
    const highQualityCount = scores.filter(s => s >= 70).length
    const highQualityRate = scores.length > 0
      ? Math.round((highQualityCount / scores.length) * 100)
      : 0

    return NextResponse.json({
      summary: {
        totalGenerations: generations.length,
        avgScore,
        highQualityRate,
        thisMonthCount,
        lastMonthCount,
        momChange,
        thisMonthAvg,
        lastMonthAvg,
        scoreImprovement: thisMonthAvg - lastMonthAvg,
      },
      scoreDistribution: Object.entries(scoreRanges).map(([range, count]) => ({
        range,
        count,
      })),
      scoreTrend,
      topKeywords,
      categoryBreakdown,
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
