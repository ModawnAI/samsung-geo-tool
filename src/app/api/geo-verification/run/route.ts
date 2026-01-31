/**
 * GEO Verification API Route
 * POST /api/geo-verification/run
 *
 * Runs search engine visibility verification for generated content
 */

import { NextRequest, NextResponse } from 'next/server'
import { runVerification } from '@/lib/geo-verification/verification-service'
import type { VerificationRequest, VerificationResponse } from '@/types/geo-verification'

/**
 * POST handler for running GEO verification
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerificationResponse>> {
  const startTime = Date.now()

  try {
    const body = (await request.json()) as VerificationRequest

    // Validate request
    if (!body.productName) {
      return NextResponse.json(
        {
          success: false,
          verificationId: '',
          error: 'Product name is required',
        },
        { status: 400 }
      )
    }

    if (!body.keywords || body.keywords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          verificationId: '',
          error: 'At least one keyword is required',
        },
        { status: 400 }
      )
    }

    if (!body.generatedContent?.description) {
      return NextResponse.json(
        {
          success: false,
          verificationId: '',
          error: 'Generated content description is required',
        },
        { status: 400 }
      )
    }

    console.log(`[API:GEO-Verification] Starting verification for ${body.productName}`)
    console.log(`[API:GEO-Verification] Keywords: ${body.keywords.length}`)

    // Run verification
    const result = await runVerification(body)

    console.log(`[API:GEO-Verification] Completed in ${Date.now() - startTime}ms`)
    console.log(`[API:GEO-Verification] Score: ${result.matchScore.total}/100`)

    return NextResponse.json({
      success: true,
      verificationId: result.verificationId,
      result,
    })
  } catch (error) {
    console.error('[API:GEO-Verification] Error:', error)

    return NextResponse.json(
      {
        success: false,
        verificationId: '',
        error:
          error instanceof Error ? error.message : 'Failed to run verification',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
