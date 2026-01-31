/**
 * Review API Endpoint
 * Based on GEO Solution Brief Task 1 (Slide 2)
 * 
 * Handles content review for GEO optimization checking
 * - Pre-review: WIP content analysis
 * - Post-review: Published content URL analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkTonality } from '@/lib/geo-v2/tonality-checker'
import type { Platform, ContentType, ReviewTiming, ReviewResult, ReviewCheckItem } from '@/types/geo-v2'

interface ReviewRequestBody {
  // Pre-review fields
  wipDescription?: string
  includeAsset?: boolean
  mediaFile?: string // Base64 or URL
  
  // Post-review fields
  publishedUrl?: string
  
  // Common fields
  platform: Platform
  productName: string
  reviewTiming: ReviewTiming
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ReviewRequestBody
    const { platform, productName, reviewTiming, wipDescription, publishedUrl } = body

    // Get content to review based on timing
    const contentToReview = reviewTiming === 'pre' 
      ? wipDescription 
      : await fetchContentFromUrl(publishedUrl)

    if (!contentToReview) {
      return NextResponse.json(
        { error: 'No content to review' },
        { status: 400 }
      )
    }

    // Run tonality check
    const tonalityResult = await checkTonality({
      content: contentToReview,
      platform,
      contentType: 'intro' as ContentType, // Default
      productName,
    })

    // Generate check items based on platform
    const checks = generatePlatformChecks(platform, contentToReview, productName, tonalityResult)

    // Calculate overall score and pass rate
    const passCount = checks.filter(c => c.passed).length
    const totalCount = checks.length
    const overallScore = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / totalCount)
    const passRate = Math.round((passCount / totalCount) * 100)

    const result: ReviewResult = {
      platform,
      reviewType: reviewTiming,
      checks,
      overallScore,
      passRate,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json(
      { error: 'Review failed' },
      { status: 500 }
    )
  }
}

/**
 * Fetch content from published URL
 * Currently a stub - would need actual scraping implementation
 */
async function fetchContentFromUrl(url?: string): Promise<string | null> {
  if (!url) return null
  
  // TODO: Implement URL content fetching
  // For now, return a placeholder message
  return `Content from URL: ${url}`
}

/**
 * Generate platform-specific check items
 */
function generatePlatformChecks(
  platform: Platform,
  content: string,
  productName: string,
  tonalityResult: { isOnBrand: boolean; overallScore: number; breakdown: { brandVoiceScore: number } }
): ReviewCheckItem[] {
  const checks: ReviewCheckItem[] = []
  const lowerContent = content.toLowerCase()
  const lowerProduct = productName.toLowerCase()

  // Common checks
  const hasProductName = lowerContent.includes(lowerProduct) || lowerContent.includes('galaxy')
  checks.push({
    name: 'Product Mention',
    nameKo: '제품명 포함',
    passed: hasProductName,
    score: hasProductName ? 100 : 0,
    issues: hasProductName ? [] : ['제품명이 콘텐츠에 포함되어 있지 않습니다'],
    suggestions: hasProductName ? [] : [`"${productName}" 또는 "Galaxy"를 콘텐츠에 포함해주세요`],
  })

  const hasBrand = lowerContent.includes('samsung') || lowerContent.includes('galaxy')
  checks.push({
    name: 'Brand Mention',
    nameKo: '브랜드 언급',
    passed: hasBrand,
    score: hasBrand ? 100 : 0,
    issues: hasBrand ? [] : ['Samsung 또는 Galaxy 브랜드가 언급되어 있지 않습니다'],
    suggestions: hasBrand ? [] : ['Samsung 또는 Galaxy 브랜드를 언급해주세요'],
  })

  checks.push({
    name: 'Tonality Check',
    nameKo: '토날리티 검수',
    passed: tonalityResult.isOnBrand,
    score: tonalityResult.overallScore,
    issues: tonalityResult.isOnBrand ? [] : ['브랜드 보이스 개선이 필요합니다'],
    suggestions: tonalityResult.isOnBrand ? [] : ['Samsung의 전문적이면서 친근한 톤을 유지해주세요'],
  })

  // Platform-specific checks
  if (platform === 'youtube') {
    // YouTube: 130 char first section
    const first130HasKeyword = content.length >= 130 && 
      (lowerContent.slice(0, 130).includes(lowerProduct) || lowerContent.slice(0, 130).includes('galaxy'))
    checks.push({
      name: 'First 130 Characters',
      nameKo: '첫 130자 최적화',
      passed: first130HasKeyword,
      score: first130HasKeyword ? 100 : content.length >= 130 ? 50 : 0,
      issues: content.length < 130 
        ? ['설명이 130자 미만입니다'] 
        : first130HasKeyword 
          ? [] 
          : ['첫 130자에 제품 키워드가 없습니다'],
      suggestions: first130HasKeyword ? [] : ['첫 130자에 제품명과 핵심 키워드를 배치해주세요'],
    })

    // FAQ check
    const hasFAQ = content.includes('Q:') && content.includes('A:')
    checks.push({
      name: 'FAQ Section',
      nameKo: 'FAQ 포함',
      passed: hasFAQ,
      score: hasFAQ ? 100 : 50,
      issues: hasFAQ ? [] : ['Q:/A: 형식의 FAQ가 없습니다'],
      suggestions: hasFAQ ? [] : ['Q:/A: 형식의 FAQ를 1-2개 추가해주세요'],
    })

    // Timestamp check
    const hasTimestamp = /\d{1,2}:\d{2}/.test(content)
    checks.push({
      name: 'Timestamps',
      nameKo: '타임스탬프',
      passed: hasTimestamp,
      score: hasTimestamp ? 100 : 50,
      issues: hasTimestamp ? [] : ['타임스탬프가 없습니다'],
      suggestions: hasTimestamp ? [] : ['1분 이상 영상에는 타임스탬프를 추가해주세요'],
    })

  } else if (platform === 'instagram') {
    // Instagram: 125 char first section
    const hasGoodLength = content.length >= 50
    checks.push({
      name: 'First 125 Characters',
      nameKo: '첫 125자 최적화',
      passed: hasGoodLength,
      score: hasGoodLength ? 80 : 40,
      issues: hasGoodLength ? [] : ['캡션이 너무 짧습니다'],
      suggestions: hasGoodLength ? ['첫 125자에 핵심메시지, 키워드, CTA를 포함했는지 확인하세요'] : ['캡션을 더 풍부하게 작성해주세요'],
    })

    // CTA check
    const ctaKeywords = ['link', 'bio', 'tap', 'click', 'discover', 'learn', '👆', '🔗']
    const hasCTA = ctaKeywords.some(kw => lowerContent.includes(kw))
    checks.push({
      name: 'Call to Action',
      nameKo: 'CTA 포함',
      passed: hasCTA,
      score: hasCTA ? 100 : 60,
      issues: hasCTA ? [] : ['CTA(Call to Action)가 없습니다'],
      suggestions: hasCTA ? [] : ['"Link in bio", "Discover more" 등의 CTA를 추가해주세요'],
    })

    // Hashtag check
    const hasHashtags = content.includes('#')
    checks.push({
      name: 'Hashtags',
      nameKo: '해시태그 포함',
      passed: hasHashtags,
      score: hasHashtags ? 100 : 30,
      issues: hasHashtags ? [] : ['해시태그가 없습니다'],
      suggestions: hasHashtags ? [] : ['#GalaxyAI, #Samsung 등 공식 해시태그를 추가해주세요'],
    })

  } else if (platform === 'tiktok') {
    // TikTok: 125 char optimization
    const goodLength = content.length <= 150 && content.length >= 20
    checks.push({
      name: 'Caption Length',
      nameKo: '캡션 길이 최적화',
      passed: goodLength,
      score: goodLength ? 100 : 50,
      issues: content.length > 150 
        ? ['캡션이 너무 깁니다'] 
        : content.length < 20 
          ? ['캡션이 너무 짧습니다'] 
          : [],
      suggestions: goodLength ? [] : ['TikTok 캡션은 20-150자가 적정합니다'],
    })

    // Hashtag check
    const hasHashtags = content.includes('#')
    checks.push({
      name: 'Hashtags',
      nameKo: '해시태그 포함',
      passed: hasHashtags,
      score: hasHashtags ? 100 : 60,
      issues: hasHashtags ? [] : ['해시태그가 없습니다'],
      suggestions: hasHashtags ? [] : ['트렌드 해시태그와 제품 해시태그를 추가해주세요'],
    })
  }

  return checks
}
