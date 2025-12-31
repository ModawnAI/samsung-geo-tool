/**
 * Export Functionality for GEO v2 Results
 * Supports JSON and Text Report formats
 */

import type {
  GEOv2GenerateResponse,
  ExportOptions,
  TextExportSections,
  UniqueSellingPoint,
} from '@/types/geo-v2'
import { USP_CATEGORY_LABELS } from './usp-extraction'
import { formatGroundingScore, getGroundingQualityDescription } from './grounding-scorer'

/**
 * Export results to JSON format
 */
export function exportToJSON(
  result: GEOv2GenerateResponse,
  options: Partial<ExportOptions> = {}
): string {
  const { includeSources = true, includeScores = true, includeUSPs = true } = options

  const exportData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
  }

  // Description
  exportData.description = result.description

  // USPs
  if (includeUSPs) {
    exportData.uspResult = result.uspResult
  }

  // Chapters
  exportData.chapters = result.chapters

  // FAQ
  exportData.faq = result.faq

  // Step-by-step (if exists)
  if (result.stepByStep) {
    exportData.stepByStep = result.stepByStep
  }

  // Case studies (if exists)
  if (result.caseStudies) {
    exportData.caseStudies = result.caseStudies
  }

  // Keywords
  exportData.keywords = result.keywords
  exportData.hashtags = result.hashtags

  // Scores
  if (includeScores) {
    exportData.finalScore = result.finalScore
  }

  // Grounding sources
  if (includeSources && result.groundingMetadata) {
    exportData.groundingMetadata = result.groundingMetadata
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Export results to human-readable text report
 */
export function exportToTextReport(
  result: GEOv2GenerateResponse,
  sections: Partial<TextExportSections> = {},
  language: 'ko' | 'en' = 'ko'
): string {
  const {
    description = true,
    usps = true,
    faq = true,
    chapters = true,
    caseStudies = true,
    groundingSources = true,
    scores = true,
  } = sections

  const lines: string[] = []
  const isKorean = language === 'ko'

  // Header
  lines.push('═'.repeat(60))
  lines.push(isKorean ? '📊 Samsung GEO/AEO 최적화 분석 결과' : '📊 Samsung GEO/AEO Optimization Analysis Results')
  lines.push(`${isKorean ? '생성일시' : 'Generated'}: ${new Date().toLocaleString(isKorean ? 'ko-KR' : 'en-US')}`)
  lines.push('═'.repeat(60))
  lines.push('')

  // Description Section
  if (description && result.description) {
    lines.push(isKorean ? '📝 최적화된 설명문' : '📝 Optimized Description')
    lines.push('─'.repeat(40))
    lines.push('')
    lines.push(isKorean ? '▸ 미리보기 (첫 130자):' : '▸ Preview (First 130 characters):')
    lines.push(result.description.preview)
    lines.push('')
    lines.push(isKorean ? '▸ 전체 설명:' : '▸ Full Description:')
    lines.push(result.description.full)
    lines.push('')
    if (result.description.vanityLinks?.length > 0) {
      lines.push(isKorean ? '▸ 추천 바니티 링크:' : '▸ Suggested Vanity Links:')
      result.description.vanityLinks.forEach(link => {
        lines.push(`  • ${link}`)
      })
    }
    lines.push('')
  }

  // USP Section
  if (usps && result.uspResult?.usps?.length > 0) {
    lines.push(isKorean ? '🎯 Unique Selling Points (USP)' : '🎯 Unique Selling Points (USP)')
    lines.push('─'.repeat(40))
    lines.push('')
    lines.push(isKorean
      ? `추출 방법: ${result.uspResult.extractionMethod === 'grounded' ? 'Google Grounding 기반' : '생성 기반'}`
      : `Extraction Method: ${result.uspResult.extractionMethod === 'grounded' ? 'Google Grounding' : 'Generative'}`)
    lines.push(isKorean
      ? `그라운딩 품질: ${result.uspResult.groundingQuality}%`
      : `Grounding Quality: ${result.uspResult.groundingQuality}%`)
    lines.push('')

    result.uspResult.usps.forEach((usp, index) => {
      lines.push(formatUSPForExport(usp, index + 1, isKorean))
      lines.push('')
    })

    if (result.uspResult.competitiveContext) {
      lines.push(isKorean ? '▸ 경쟁 맥락:' : '▸ Competitive Context:')
      lines.push(result.uspResult.competitiveContext)
      lines.push('')
    }
  }

  // Chapters Section
  if (chapters && result.chapters?.timestamps) {
    lines.push(isKorean ? '📑 챕터' : '📑 Chapters')
    lines.push('─'.repeat(40))
    lines.push('')
    lines.push(result.chapters.timestamps)
    lines.push('')
  }

  // FAQ Section
  if (faq && result.faq?.faqs?.length > 0) {
    lines.push(isKorean ? '❓ FAQ' : '❓ FAQ')
    lines.push('─'.repeat(40))
    lines.push('')

    result.faq.faqs.forEach((item, index) => {
      lines.push(`Q${index + 1}: ${item.question}`)
      lines.push(`A${index + 1}: ${item.answer}`)
      if (item.linkedUSPs?.length > 0) {
        lines.push(`    ${isKorean ? '연결된 USP' : 'Linked USPs'}: ${item.linkedUSPs.join(', ')}`)
      }
      lines.push('')
    })
  }

  // Case Studies Section
  const caseStudyItems = result.caseStudies?.caseStudies
  if (caseStudies && caseStudyItems && caseStudyItems.length > 0) {
    lines.push(isKorean ? '📋 사례 연구' : '📋 Case Studies')
    lines.push('─'.repeat(40))
    lines.push('')

    caseStudyItems.forEach((study, index) => {
      lines.push(`${isKorean ? '사례' : 'Case'} ${index + 1}: ${study.title}`)
      lines.push(`  ${isKorean ? '시나리오' : 'Scenario'}: ${study.scenario}`)
      lines.push(`  ${isKorean ? '해결책' : 'Solution'}: ${study.solution}`)
      if (study.linkedUSPs?.length > 0) {
        lines.push(`  ${isKorean ? '연결된 USP' : 'Linked USPs'}: ${study.linkedUSPs.join(', ')}`)
      }
      lines.push(`  ${isKorean ? '신뢰도' : 'Confidence'}: ${study.evidence.confidence}`)
      lines.push('')
    })
  }

  // Grounding Sources Section
  const groundingSourceItems = result.groundingMetadata?.sources
  if (groundingSources && groundingSourceItems && groundingSourceItems.length > 0) {
    lines.push(isKorean ? '🔗 그라운딩 소스' : '🔗 Grounding Sources')
    lines.push('─'.repeat(40))
    lines.push('')

    const tierLabels = {
      1: isKorean ? '공식' : 'Official',
      2: isKorean ? '테크 미디어' : 'Tech Media',
      3: isKorean ? '커뮤니티' : 'Community',
      4: isKorean ? '기타' : 'Other',
    }

    groundingSourceItems.forEach(source => {
      const tierLabel = tierLabels[source.tier as keyof typeof tierLabels] || tierLabels[4]
      lines.push(`• [${tierLabel}] ${source.title}`)
      lines.push(`  ${source.uri}`)
      if (source.usedIn?.length > 0) {
        lines.push(`  ${isKorean ? '사용된 섹션' : 'Used in'}: ${source.usedIn.join(', ')}`)
      }
      lines.push('')
    })
  }

  // Scores Section
  if (scores && result.finalScore) {
    lines.push(isKorean ? '📊 GEO/AEO 점수 v2' : '📊 GEO/AEO Score v2')
    lines.push('─'.repeat(40))
    lines.push('')

    const scoreLabels = isKorean ? {
      keywordDensity: '키워드 밀도',
      aiExposure: 'AI 검색 노출',
      questionPatterns: '질문 패턴',
      sentenceStructure: '문장 구조',
      lengthCompliance: '길이 적합성',
      groundingQuality: '그라운딩 품질',
      total: '총점',
    } : {
      keywordDensity: 'Keyword Density',
      aiExposure: 'AI Search Exposure',
      questionPatterns: 'Question Patterns',
      sentenceStructure: 'Sentence Structure',
      lengthCompliance: 'Length Compliance',
      groundingQuality: 'Grounding Quality',
      total: 'Total',
    }

    lines.push(`${scoreLabels.keywordDensity}: ${result.finalScore.keywordDensity}/15`)
    lines.push(`${scoreLabels.aiExposure}: ${result.finalScore.aiExposure}/25`)
    lines.push(`${scoreLabels.questionPatterns}: ${result.finalScore.questionPatterns}/20`)
    lines.push(`${scoreLabels.sentenceStructure}: ${result.finalScore.sentenceStructure}/15`)
    lines.push(`${scoreLabels.lengthCompliance}: ${result.finalScore.lengthCompliance}/15`)

    if (result.finalScore.groundingQuality) {
      lines.push('')
      lines.push(`${scoreLabels.groundingQuality}:`)
      lines.push(formatGroundingScore(result.finalScore.groundingQuality))
    }

    lines.push('')
    lines.push('═'.repeat(40))
    lines.push(`🏆 ${scoreLabels.total}: ${result.finalScore.total}/100`)
    lines.push('═'.repeat(40))
  }

  // Footer
  lines.push('')
  lines.push('─'.repeat(60))
  lines.push(isKorean
    ? '🤖 Samsung GEO Tool v2.0으로 생성됨'
    : '🤖 Generated by Samsung GEO Tool v2.0')
  lines.push('─'.repeat(60))

  return lines.join('\n')
}

/**
 * Format a single USP for export
 */
function formatUSPForExport(
  usp: UniqueSellingPoint,
  index: number,
  isKorean: boolean
): string {
  const categoryLabel = isKorean
    ? USP_CATEGORY_LABELS[usp.category]?.ko || usp.category
    : USP_CATEGORY_LABELS[usp.category]?.en || usp.category

  const confidenceLabel = {
    high: isKorean ? '높음 ✓' : 'High ✓',
    medium: isKorean ? '중간 ~' : 'Medium ~',
    low: isKorean ? '낮음 !' : 'Low !',
  }[usp.confidence]

  const lines = [
    `${index}. [${categoryLabel}] ${usp.feature}`,
    `   ${isKorean ? '차별화' : 'Differentiation'}: ${usp.differentiation}`,
    `   ${isKorean ? '사용자 혜택' : 'User Benefit'}: ${usp.userBenefit}`,
    `   ${isKorean ? '신뢰도' : 'Confidence'}: ${confidenceLabel}`,
  ]

  if (usp.evidence.sources?.length > 0) {
    lines.push(`   ${isKorean ? '출처' : 'Sources'}: ${usp.evidence.sources.slice(0, 2).join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Generate download filename
 */
export function generateExportFilename(
  productName: string,
  format: 'json' | 'text'
): string {
  const date = new Date().toISOString().split('T')[0]
  const cleanName = productName
    .replace(/[^a-zA-Z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30)

  const extension = format === 'json' ? 'json' : 'txt'
  return `GEO_v2_${cleanName}_${date}.${extension}`
}

/**
 * Create downloadable blob
 */
export function createExportBlob(
  content: string,
  format: 'json' | 'text'
): Blob {
  const mimeType = format === 'json' ? 'application/json' : 'text/plain'
  return new Blob([content], { type: `${mimeType};charset=utf-8` })
}
