import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  searchPlaybook,
  multiQuerySearch,
  expandedSearch,
  getSectionContext,
} from '@/lib/rag/search'
import type { PlaybookSection, ProductCategory } from '@/types/playbook'

// Verify user authentication
async function verifyAuth(request: NextRequest): Promise<boolean> {
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

  return !error && !!user
}

export async function POST(request: NextRequest) {
  try {
    // Dev bypass for testing
    const devBypass = process.env.NODE_ENV === 'development' &&
                      request.headers.get('x-dev-bypass') === 'true'

    // Verify authentication (skip in dev bypass mode)
    if (!devBypass) {
      const isAuthenticated = await verifyAuth(request)
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: 'Unauthorized. Authentication required.' },
          { status: 401 }
        )
      }
    }

    const body = await request.json()
    const {
      query,
      queries, // For multi-query search
      mode = 'single', // 'single' | 'multi' | 'expanded' | 'section'
      productCategory,
      section,
      topK = 10,
      rerankTopN = 5,
      language,
      includeScores = true,
    } = body

    let result

    switch (mode) {
      case 'multi':
        // Multi-query search for comprehensive RAG context
        if (!queries || !Array.isArray(queries) || queries.length === 0) {
          return NextResponse.json(
            { error: 'queries array is required for multi mode' },
            { status: 400 }
          )
        }
        result = await multiQuerySearch(queries, {
          productCategory,
          section,
          topKPerQuery: Math.ceil(topK / queries.length) + 2,
          finalTopN: rerankTopN,
        })
        break

      case 'expanded':
        // Expanded search with query variations
        if (!query) {
          return NextResponse.json(
            { error: 'query is required for expanded mode' },
            { status: 400 }
          )
        }
        result = await expandedSearch(query, {
          productCategory,
          section,
          topK,
        })
        break

      case 'section':
        // Get section-specific context
        if (!section) {
          return NextResponse.json(
            { error: 'section is required for section mode' },
            { status: 400 }
          )
        }
        const sectionResults = await getSectionContext(section, {
          productCategory,
          topK,
        })
        result = {
          query: `Section: ${section}`,
          results: sectionResults,
          totalResults: sectionResults.length,
          processingTimeMs: 0,
        }
        break

      case 'single':
      default:
        // Standard single query search
        if (!query) {
          return NextResponse.json(
            { error: 'query is required' },
            { status: 400 }
          )
        }
        result = await searchPlaybook({
          query,
          productCategory,
          section,
          topK,
          rerankTopN,
          language,
          includeScores,
        })
        break
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifyAuth(request)
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const productCategory = searchParams.get('productCategory') as ProductCategory | 'all' | undefined
    const section = searchParams.get('section') as PlaybookSection | undefined
    const topK = parseInt(searchParams.get('topK') || '10', 10)
    const rerankTopN = parseInt(searchParams.get('rerankTopN') || '5', 10)

    if (!query) {
      return NextResponse.json(
        { error: 'query parameter (q or query) is required' },
        { status: 400 }
      )
    }

    const result = await searchPlaybook({
      query,
      productCategory,
      section,
      topK,
      rerankTopN,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
