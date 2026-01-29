/**
 * CMS Export for GEO v2 Results
 * Supports WordPress, Contentful, and Generic JSON formats
 */

import type {
  GEOv2GenerateResponse,
  UniqueSellingPoint,
} from '@/types/geo-v2'

export type CMSFormat = 'wordpress' | 'contentful' | 'generic'

export interface CMSExportOptions {
  format: CMSFormat
  language: 'ko' | 'en'
  productName?: string
  productId?: string
  categoryId?: string
  includeMetadata: boolean
}

const DEFAULT_OPTIONS: CMSExportOptions = {
  format: 'generic',
  language: 'ko',
  includeMetadata: true,
}

// WordPress REST API compatible format
interface WordPressExport {
  title: {
    rendered: string
  }
  content: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  status: 'draft' | 'publish'
  meta: {
    geo_score?: number
    keywords?: string[]
    hashtags?: string[]
  }
  categories?: string[]
  tags?: string[]
}

// Contentful Entry format
interface ContentfulExport {
  sys: {
    contentType: {
      sys: {
        id: string
        type: 'Link'
        linkType: 'ContentType'
      }
    }
  }
  fields: {
    title: { [locale: string]: string }
    description: { [locale: string]: string }
    preview: { [locale: string]: string }
    keywords: { [locale: string]: string[] }
    hashtags: { [locale: string]: string[] }
    geoScore: { [locale: string]: number }
    usps: { [locale: string]: ContentfulUSP[] }
    faqs: { [locale: string]: ContentfulFAQ[] }
  }
}

interface ContentfulUSP {
  feature: string
  category: string
  differentiation: string
  userBenefit: string
  confidence: string
}

interface ContentfulFAQ {
  question: string
  answer: string
}

// Generic CMS format
interface GenericCMSExport {
  meta: {
    version: string
    generatedAt: string
    generator: string
    productName?: string
    productId?: string
    categoryId?: string
    language: string
    geoScore?: number
  }
  content: {
    title: string
    preview: string
    fullDescription: string
    vanityLinks: string[]
  }
  seo: {
    keywords: {
      product: string[]
      generic: string[]
    }
    hashtags: string[]
    chapters?: string
  }
  usps: Array<{
    feature: string
    category: string
    differentiation: string
    userBenefit: string
    confidence: string
    sources: string[]
  }>
  faqs: Array<{
    question: string
    answer: string
    linkedUSPs?: string[]
  }>
  caseStudies?: Array<{
    title: string
    scenario: string
    solution: string
    linkedUSPs?: string[]
    confidence: string
  }>
}

/**
 * Export results to CMS-compatible format
 */
export function exportToCMS(
  result: GEOv2GenerateResponse,
  options: Partial<CMSExportOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  switch (opts.format) {
    case 'wordpress':
      return JSON.stringify(formatForWordPress(result, opts), null, 2)
    case 'contentful':
      return JSON.stringify(formatForContentful(result, opts), null, 2)
    case 'generic':
    default:
      return JSON.stringify(formatForGeneric(result, opts), null, 2)
  }
}

/**
 * Format for WordPress REST API
 */
function formatForWordPress(
  result: GEOv2GenerateResponse,
  options: CMSExportOptions
): WordPressExport {
  const isKorean = options.language === 'ko'

  // Build HTML content
  const contentParts: string[] = []

  // Description
  if (result.description?.full) {
    contentParts.push(`<div class="geo-description">${result.description.full}</div>`)
  }

  // USPs
  if (result.uspResult?.usps?.length > 0) {
    contentParts.push(`<h2>${isKorean ? '주요 특징' : 'Key Features'}</h2>`)
    contentParts.push('<ul class="geo-usps">')
    result.uspResult.usps.forEach(usp => {
      contentParts.push(`<li><strong>${usp.feature}</strong>: ${usp.differentiation}</li>`)
    })
    contentParts.push('</ul>')
  }

  // FAQ
  if (result.faq?.faqs?.length > 0) {
    contentParts.push(`<h2>${isKorean ? '자주 묻는 질문' : 'FAQ'}</h2>`)
    contentParts.push('<div class="geo-faq">')
    result.faq.faqs.forEach(faq => {
      contentParts.push(`<h3>${faq.question}</h3>`)
      contentParts.push(`<p>${faq.answer}</p>`)
    })
    contentParts.push('</div>')
  }

  return {
    title: {
      rendered: options.productName || (isKorean ? 'GEO 최적화 콘텐츠' : 'GEO Optimized Content'),
    },
    content: {
      rendered: contentParts.join('\n'),
    },
    excerpt: {
      rendered: result.description?.preview || '',
    },
    status: 'draft',
    meta: options.includeMetadata ? {
      geo_score: result.finalScore?.total,
      keywords: [...(result.keywords?.product || []), ...(result.keywords?.generic || [])],
      hashtags: result.hashtags || [],
    } : {},
    tags: result.keywords?.product?.slice(0, 10) || [],
  }
}

/**
 * Format for Contentful
 */
function formatForContentful(
  result: GEOv2GenerateResponse,
  options: CMSExportOptions
): ContentfulExport {
  const locale = options.language === 'ko' ? 'ko-KR' : 'en-US'

  const usps: ContentfulUSP[] = (result.uspResult?.usps || []).map(usp => ({
    feature: usp.feature,
    category: usp.category,
    differentiation: usp.differentiation,
    userBenefit: usp.userBenefit,
    confidence: usp.confidence,
  }))

  const faqs: ContentfulFAQ[] = (result.faq?.faqs || []).map(faq => ({
    question: faq.question,
    answer: faq.answer,
  }))

  return {
    sys: {
      contentType: {
        sys: {
          id: 'geoContent',
          type: 'Link',
          linkType: 'ContentType',
        },
      },
    },
    fields: {
      title: {
        [locale]: options.productName || 'GEO Content',
      },
      description: {
        [locale]: result.description?.full || '',
      },
      preview: {
        [locale]: result.description?.preview || '',
      },
      keywords: {
        [locale]: [...(result.keywords?.product || []), ...(result.keywords?.generic || [])],
      },
      hashtags: {
        [locale]: result.hashtags || [],
      },
      geoScore: {
        [locale]: result.finalScore?.total || 0,
      },
      usps: {
        [locale]: usps,
      },
      faqs: {
        [locale]: faqs,
      },
    },
  }
}

/**
 * Format for Generic CMS
 */
function formatForGeneric(
  result: GEOv2GenerateResponse,
  options: CMSExportOptions
): GenericCMSExport {
  const usps = (result.uspResult?.usps || []).map((usp: UniqueSellingPoint) => ({
    feature: usp.feature,
    category: usp.category,
    differentiation: usp.differentiation,
    userBenefit: usp.userBenefit,
    confidence: usp.confidence,
    sources: usp.evidence?.sources || [],
  }))

  const faqs = (result.faq?.faqs || []).map(faq => ({
    question: faq.question,
    answer: faq.answer,
    linkedUSPs: faq.linkedUSPs,
  }))

  const caseStudies = result.caseStudies?.caseStudies?.map(study => ({
    title: study.title,
    scenario: study.scenario,
    solution: study.solution,
    linkedUSPs: study.linkedUSPs,
    confidence: study.evidence.confidence,
  }))

  const exportData: GenericCMSExport = {
    meta: {
      version: '2.0',
      generatedAt: new Date().toISOString(),
      generator: 'Samsung GEO Tool v2.0',
      language: options.language,
    },
    content: {
      title: options.productName || '',
      preview: result.description?.preview || '',
      fullDescription: result.description?.full || '',
      vanityLinks: result.description?.vanityLinks || [],
    },
    seo: {
      keywords: {
        product: result.keywords?.product || [],
        generic: result.keywords?.generic || [],
      },
      hashtags: result.hashtags || [],
    },
    usps,
    faqs,
  }

  if (options.includeMetadata) {
    exportData.meta.productName = options.productName
    exportData.meta.productId = options.productId
    exportData.meta.categoryId = options.categoryId
    exportData.meta.geoScore = result.finalScore?.total
  }

  if (result.chapters?.timestamps) {
    exportData.seo.chapters = result.chapters.timestamps
  }

  if (caseStudies && caseStudies.length > 0) {
    exportData.caseStudies = caseStudies
  }

  return exportData
}

/**
 * Get CMS format label
 */
export function getCMSFormatLabel(format: CMSFormat, language: 'ko' | 'en' = 'ko'): string {
  const labels: Record<CMSFormat, { ko: string; en: string }> = {
    wordpress: { ko: 'WordPress REST API', en: 'WordPress REST API' },
    contentful: { ko: 'Contentful', en: 'Contentful' },
    generic: { ko: '범용 JSON', en: 'Generic JSON' },
  }
  return labels[format][language]
}

/**
 * Generate CMS export filename
 */
export function generateCMSFilename(
  productName: string,
  format: CMSFormat
): string {
  const date = new Date().toISOString().split('T')[0]
  const cleanName = productName
    .replace(/[^a-zA-Z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30)

  return `GEO_v2_${cleanName}_${format}_${date}.json`
}
