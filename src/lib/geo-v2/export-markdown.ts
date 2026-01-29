/**
 * Markdown Export for GEO v2 Results
 * Supports frontmatter and section toggles
 */

import type {
  GEOv2GenerateResponse,
  UniqueSellingPoint,
} from '@/types/geo-v2'
import { USP_CATEGORY_LABELS } from './usp-extraction'

export interface MarkdownExportOptions {
  includeFrontmatter: boolean
  sections: {
    description: boolean
    usps: boolean
    faq: boolean
    chapters: boolean
    caseStudies: boolean
    keywords: boolean
    hashtags: boolean
    scores: boolean
    sources: boolean
  }
  language: 'ko' | 'en'
  productName?: string
}

const DEFAULT_OPTIONS: MarkdownExportOptions = {
  includeFrontmatter: true,
  sections: {
    description: true,
    usps: true,
    faq: true,
    chapters: true,
    caseStudies: true,
    keywords: true,
    hashtags: true,
    scores: true,
    sources: true,
  },
  language: 'ko',
}

/**
 * Export results to Markdown format
 */
export function exportToMarkdown(
  result: GEOv2GenerateResponse,
  options: Partial<MarkdownExportOptions> = {}
): string {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    sections: { ...DEFAULT_OPTIONS.sections, ...options.sections },
  }
  const { language, includeFrontmatter, sections, productName } = opts
  const isKorean = language === 'ko'

  const lines: string[] = []

  // Frontmatter
  if (includeFrontmatter) {
    lines.push('---')
    lines.push(`title: "${productName || (isKorean ? 'GEO 최적화 결과' : 'GEO Optimization Results')}"`)
    lines.push(`date: "${new Date().toISOString()}"`)
    lines.push(`generator: "Samsung GEO Tool v2.0"`)
    lines.push(`language: "${language}"`)
    if (result.finalScore) {
      lines.push(`geo_score: ${result.finalScore.total}`)
    }
    if (result.keywords?.product) {
      lines.push(`keywords:`)
      result.keywords.product.slice(0, 5).forEach(kw => {
        lines.push(`  - "${kw}"`)
      })
    }
    lines.push('---')
    lines.push('')
  }

  // Title
  lines.push(`# ${productName || (isKorean ? 'GEO/AEO 최적화 분석 결과' : 'GEO/AEO Optimization Analysis Results')}`)
  lines.push('')

  // Description Section
  if (sections.description && result.description) {
    lines.push(`## ${isKorean ? '📝 최적화된 설명문' : '📝 Optimized Description'}`)
    lines.push('')
    lines.push(`### ${isKorean ? '미리보기 (첫 130자)' : 'Preview (First 130 characters)'}`)
    lines.push('')
    lines.push(`> ${result.description.preview}`)
    lines.push('')
    lines.push(`### ${isKorean ? '전체 설명' : 'Full Description'}`)
    lines.push('')
    lines.push(result.description.full)
    lines.push('')
    if (result.description.vanityLinks?.length > 0) {
      lines.push(`### ${isKorean ? '추천 바니티 링크' : 'Suggested Vanity Links'}`)
      lines.push('')
      result.description.vanityLinks.forEach(link => {
        lines.push(`- \`${link}\``)
      })
      lines.push('')
    }
  }

  // USP Section
  if (sections.usps && result.uspResult?.usps?.length > 0) {
    lines.push(`## ${isKorean ? '🎯 Unique Selling Points (USP)' : '🎯 Unique Selling Points (USP)'}`)
    lines.push('')
    lines.push(`| ${isKorean ? '항목' : 'Item'} | ${isKorean ? '값' : 'Value'} |`)
    lines.push('|---|---|')
    lines.push(`| ${isKorean ? '추출 방법' : 'Extraction Method'} | ${result.uspResult.extractionMethod === 'grounded' ? (isKorean ? 'Google Grounding 기반' : 'Google Grounding') : (isKorean ? '생성 기반' : 'Generative')} |`)
    lines.push(`| ${isKorean ? '그라운딩 품질' : 'Grounding Quality'} | ${result.uspResult.groundingQuality}% |`)
    lines.push('')

    result.uspResult.usps.forEach((usp, index) => {
      lines.push(formatUSPMarkdown(usp, index + 1, isKorean))
      lines.push('')
    })

    if (result.uspResult.competitiveContext) {
      lines.push(`### ${isKorean ? '경쟁 맥락' : 'Competitive Context'}`)
      lines.push('')
      lines.push(result.uspResult.competitiveContext)
      lines.push('')
    }
  }

  // Chapters Section
  if (sections.chapters && result.chapters?.timestamps) {
    lines.push(`## ${isKorean ? '📑 챕터' : '📑 Chapters'}`)
    lines.push('')
    lines.push('```')
    lines.push(result.chapters.timestamps)
    lines.push('```')
    lines.push('')
  }

  // FAQ Section
  if (sections.faq && result.faq?.faqs?.length > 0) {
    lines.push(`## ${isKorean ? '❓ FAQ' : '❓ FAQ'}`)
    lines.push('')
    result.faq.faqs.forEach((item, index) => {
      lines.push(`### Q${index + 1}: ${item.question}`)
      lines.push('')
      lines.push(`**A:** ${item.answer}`)
      if (item.linkedUSPs?.length > 0) {
        lines.push('')
        lines.push(`*${isKorean ? '연결된 USP' : 'Linked USPs'}: ${item.linkedUSPs.join(', ')}*`)
      }
      lines.push('')
    })
  }

  // Case Studies Section
  const caseStudyItems = result.caseStudies?.caseStudies
  if (sections.caseStudies && caseStudyItems && caseStudyItems.length > 0) {
    lines.push(`## ${isKorean ? '📋 사례 연구' : '📋 Case Studies'}`)
    lines.push('')
    caseStudyItems.forEach((study, index) => {
      lines.push(`### ${isKorean ? '사례' : 'Case'} ${index + 1}: ${study.title}`)
      lines.push('')
      lines.push(`**${isKorean ? '시나리오' : 'Scenario'}:** ${study.scenario}`)
      lines.push('')
      lines.push(`**${isKorean ? '해결책' : 'Solution'}:** ${study.solution}`)
      lines.push('')
      if (study.linkedUSPs?.length > 0) {
        lines.push(`*${isKorean ? '연결된 USP' : 'Linked USPs'}: ${study.linkedUSPs.join(', ')}*`)
        lines.push('')
      }
      lines.push(`> ${isKorean ? '신뢰도' : 'Confidence'}: ${study.evidence.confidence}`)
      lines.push('')
    })
  }

  // Keywords Section
  if (sections.keywords && result.keywords) {
    lines.push(`## ${isKorean ? '🏷️ 키워드' : '🏷️ Keywords'}`)
    lines.push('')
    if (result.keywords.product?.length > 0) {
      lines.push(`### ${isKorean ? '제품 키워드' : 'Product Keywords'}`)
      lines.push('')
      lines.push(result.keywords.product.map(kw => `\`${kw}\``).join(', '))
      lines.push('')
    }
    if (result.keywords.generic?.length > 0) {
      lines.push(`### ${isKorean ? '일반 키워드' : 'Generic Keywords'}`)
      lines.push('')
      lines.push(result.keywords.generic.map(kw => `\`${kw}\``).join(', '))
      lines.push('')
    }
  }

  // Hashtags Section
  if (sections.hashtags && result.hashtags?.length > 0) {
    lines.push(`## ${isKorean ? '#️⃣ 해시태그' : '#️⃣ Hashtags'}`)
    lines.push('')
    lines.push(result.hashtags.join(' '))
    lines.push('')
  }

  // Sources Section
  const groundingSourceItems = result.groundingMetadata?.sources
  if (sections.sources && groundingSourceItems && groundingSourceItems.length > 0) {
    lines.push(`## ${isKorean ? '🔗 그라운딩 소스' : '🔗 Grounding Sources'}`)
    lines.push('')
    const tierLabels = {
      1: isKorean ? '공식' : 'Official',
      2: isKorean ? '테크 미디어' : 'Tech Media',
      3: isKorean ? '커뮤니티' : 'Community',
      4: isKorean ? '기타' : 'Other',
    }
    groundingSourceItems.forEach(source => {
      const tierLabel = tierLabels[source.tier as keyof typeof tierLabels] || tierLabels[4]
      lines.push(`- **[${tierLabel}]** [${source.title}](${source.uri})`)
      if (source.usedIn?.length > 0) {
        lines.push(`  - *${isKorean ? '사용된 섹션' : 'Used in'}*: ${source.usedIn.join(', ')}`)
      }
    })
    lines.push('')
  }

  // Scores Section
  if (sections.scores && result.finalScore) {
    lines.push(`## ${isKorean ? '📊 GEO/AEO 점수' : '📊 GEO/AEO Score'}`)
    lines.push('')
    lines.push(`| ${isKorean ? '항목' : 'Metric'} | ${isKorean ? '점수' : 'Score'} |`)
    lines.push('|---|---:|')
    lines.push(`| ${isKorean ? '키워드 밀도' : 'Keyword Density'} | ${result.finalScore.keywordDensity}/15 |`)
    lines.push(`| ${isKorean ? 'AI 검색 노출' : 'AI Search Exposure'} | ${result.finalScore.aiExposure}/25 |`)
    lines.push(`| ${isKorean ? '질문 패턴' : 'Question Patterns'} | ${result.finalScore.questionPatterns}/20 |`)
    lines.push(`| ${isKorean ? '문장 구조' : 'Sentence Structure'} | ${result.finalScore.sentenceStructure}/15 |`)
    lines.push(`| ${isKorean ? '길이 적합성' : 'Length Compliance'} | ${result.finalScore.lengthCompliance}/15 |`)
    lines.push(`| **${isKorean ? '총점' : 'Total'}** | **${result.finalScore.total}/100** |`)
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push(`*${isKorean ? 'Samsung GEO Tool v2.0으로 생성됨' : 'Generated by Samsung GEO Tool v2.0'} | ${new Date().toLocaleString(isKorean ? 'ko-KR' : 'en-US')}*`)

  return lines.join('\n')
}

/**
 * Format a single USP for markdown export
 */
function formatUSPMarkdown(
  usp: UniqueSellingPoint,
  index: number,
  isKorean: boolean
): string {
  const categoryLabel = isKorean
    ? USP_CATEGORY_LABELS[usp.category]?.ko || usp.category
    : USP_CATEGORY_LABELS[usp.category]?.en || usp.category

  const confidenceEmoji = {
    high: '🟢',
    medium: '🟡',
    low: '🔴',
  }[usp.confidence]

  const lines = [
    `### ${index}. ${usp.feature}`,
    '',
    `| ${isKorean ? '속성' : 'Attribute'} | ${isKorean ? '내용' : 'Content'} |`,
    '|---|---|',
    `| ${isKorean ? '카테고리' : 'Category'} | ${categoryLabel} |`,
    `| ${isKorean ? '차별화' : 'Differentiation'} | ${usp.differentiation} |`,
    `| ${isKorean ? '사용자 혜택' : 'User Benefit'} | ${usp.userBenefit} |`,
    `| ${isKorean ? '신뢰도' : 'Confidence'} | ${confidenceEmoji} ${usp.confidence} |`,
  ]

  if (usp.evidence.sources?.length > 0) {
    lines.push('')
    lines.push(`**${isKorean ? '출처' : 'Sources'}:** ${usp.evidence.sources.slice(0, 3).join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Generate markdown filename
 */
export function generateMarkdownFilename(
  productName: string
): string {
  const date = new Date().toISOString().split('T')[0]
  const cleanName = productName
    .replace(/[^a-zA-Z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30)

  return `GEO_v2_${cleanName}_${date}.md`
}
