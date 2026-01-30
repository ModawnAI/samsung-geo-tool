/**
 * Schema.org JSON-LD Generator
 * Generates structured data for improved SEO and AI discoverability
 * 
 * Based on GEO Strategy recommendations for:
 * - TechArticle: For how-to and informational content
 * - FAQPage: For FAQ structured data (Query Fan-Out optimization)
 * - VideoObject: For YouTube/video content
 * - Product: For product pages
 */

import type { Platform, ContentType, FAQItem } from '@/types/geo-v2'

// ==========================================
// Schema.org Types
// ==========================================

export interface TechArticleSchema {
  '@context': 'https://schema.org'
  '@type': 'TechArticle'
  headline: string
  description: string
  author: {
    '@type': 'Organization'
    name: string
    url: string
  }
  publisher: {
    '@type': 'Organization'
    name: string
    logo: {
      '@type': 'ImageObject'
      url: string
    }
  }
  datePublished?: string
  dateModified?: string
  mainEntityOfPage?: string
  keywords?: string[]
  articleBody?: string
}

export interface FAQPageSchema {
  '@context': 'https://schema.org'
  '@type': 'FAQPage'
  mainEntity: Array<{
    '@type': 'Question'
    name: string
    acceptedAnswer: {
      '@type': 'Answer'
      text: string
    }
  }>
}

export interface VideoObjectSchema {
  '@context': 'https://schema.org'
  '@type': 'VideoObject'
  name: string
  description: string
  thumbnailUrl?: string
  uploadDate?: string
  duration?: string // ISO 8601 duration format
  contentUrl?: string
  embedUrl?: string
  publisher: {
    '@type': 'Organization'
    name: string
    logo: {
      '@type': 'ImageObject'
      url: string
    }
  }
  interactionStatistic?: {
    '@type': 'InteractionCounter'
    interactionType: { '@type': 'WatchAction' }
    userInteractionCount: number
  }
}

export interface ProductSchema {
  '@context': 'https://schema.org'
  '@type': 'Product'
  name: string
  description: string
  brand: {
    '@type': 'Brand'
    name: string
  }
  manufacturer?: {
    '@type': 'Organization'
    name: string
  }
  image?: string[]
  sku?: string
  offers?: {
    '@type': 'Offer'
    priceCurrency: string
    price: number
    availability: string
    url: string
  }
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: number
    reviewCount: number
  }
}

export interface SchemaGeneratorResult {
  techArticle?: TechArticleSchema
  faqPage?: FAQPageSchema
  videoObject?: VideoObjectSchema
  product?: ProductSchema
  jsonLd: string // Combined JSON-LD script
  recommendations: string[]
}

// ==========================================
// Samsung Brand Constants
// ==========================================

const SAMSUNG_ORGANIZATION = {
  name: 'Samsung',
  url: 'https://www.samsung.com',
  logo: 'https://www.samsung.com/images/icons/social-share/twitter/logo.png',
}

// ==========================================
// Schema Generator Functions
// ==========================================

interface SchemaGeneratorInput {
  productName: string
  description: string
  platform: Platform
  contentType: ContentType
  faqs?: FAQItem[]
  keywords?: string[]
  videoUrl?: string
  thumbnailUrl?: string
  publishDate?: string
  productSku?: string
  productPrice?: number
}

/**
 * Generate Schema.org structured data for GEO optimization
 */
export function generateSchemaOrg(input: SchemaGeneratorInput): SchemaGeneratorResult {
  const {
    productName,
    description,
    platform,
    contentType,
    faqs,
    keywords,
    videoUrl,
    thumbnailUrl,
    publishDate,
    productSku,
    productPrice,
  } = input

  const schemas: Record<string, unknown> = {}
  const recommendations: string[] = []

  // 1. Generate TechArticle for how-to and informational content
  if (contentType === 'how_to' || contentType === 'intro' || contentType === 'documentary') {
    const techArticle = generateTechArticle({
      productName,
      description,
      keywords,
      publishDate,
    })
    schemas.techArticle = techArticle
    recommendations.push('TechArticle schema added for improved knowledge panel visibility')
  }

  // 2. Generate FAQPage for FAQ content (Query Fan-Out optimization)
  if (faqs && faqs.length > 0) {
    const faqPage = generateFAQPage(faqs)
    schemas.faqPage = faqPage
    recommendations.push(`FAQPage schema with ${faqs.length} Q&As for featured snippet optimization`)
  }

  // 3. Generate VideoObject for video platforms
  if (platform === 'youtube' || platform === 'tiktok') {
    const videoObject = generateVideoObject({
      productName,
      description,
      videoUrl,
      thumbnailUrl,
      publishDate,
    })
    schemas.videoObject = videoObject
    recommendations.push('VideoObject schema for video rich snippets in search results')
  }

  // 4. Generate Product schema if product details are available
  const product = generateProduct({
    productName,
    description,
    keywords,
    productSku,
    productPrice,
  })
  schemas.product = product
  recommendations.push('Product schema for product knowledge panel')

  // Combine all schemas into a single JSON-LD script
  const allSchemas = Object.values(schemas).filter(Boolean)
  const jsonLd = JSON.stringify(
    allSchemas.length === 1 ? allSchemas[0] : allSchemas,
    null,
    2
  )

  return {
    techArticle: schemas.techArticle as TechArticleSchema | undefined,
    faqPage: schemas.faqPage as FAQPageSchema | undefined,
    videoObject: schemas.videoObject as VideoObjectSchema | undefined,
    product: schemas.product as ProductSchema | undefined,
    jsonLd,
    recommendations,
  }
}

/**
 * Generate TechArticle schema
 */
function generateTechArticle({
  productName,
  description,
  keywords,
  publishDate,
}: {
  productName: string
  description: string
  keywords?: string[]
  publishDate?: string
}): TechArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${productName} - Samsung`,
    description: description.slice(0, 300),
    author: {
      '@type': 'Organization',
      name: SAMSUNG_ORGANIZATION.name,
      url: SAMSUNG_ORGANIZATION.url,
    },
    publisher: {
      '@type': 'Organization',
      name: SAMSUNG_ORGANIZATION.name,
      logo: {
        '@type': 'ImageObject',
        url: SAMSUNG_ORGANIZATION.logo,
      },
    },
    datePublished: publishDate || new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
    keywords: keywords?.slice(0, 10),
  }
}

/**
 * Generate FAQPage schema from FAQItems
 * Optimized for Query Fan-Out methodology
 */
function generateFAQPage(faqs: FAQItem[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.slice(0, 10).map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * Generate VideoObject schema
 */
function generateVideoObject({
  productName,
  description,
  videoUrl,
  thumbnailUrl,
  publishDate,
}: {
  productName: string
  description: string
  videoUrl?: string
  thumbnailUrl?: string
  publishDate?: string
}): VideoObjectSchema {
  const schema: VideoObjectSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: productName,
    description: description.slice(0, 300),
    publisher: {
      '@type': 'Organization',
      name: SAMSUNG_ORGANIZATION.name,
      logo: {
        '@type': 'ImageObject',
        url: SAMSUNG_ORGANIZATION.logo,
      },
    },
  }

  if (videoUrl) {
    // Extract video ID and create embed URL
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (youtubeMatch) {
      const videoId = youtubeMatch[1]
      schema.contentUrl = videoUrl
      schema.embedUrl = `https://www.youtube.com/embed/${videoId}`
    }
  }

  if (thumbnailUrl) {
    schema.thumbnailUrl = thumbnailUrl
  }

  if (publishDate) {
    schema.uploadDate = publishDate
  }

  return schema
}

/**
 * Generate Product schema
 */
function generateProduct({
  productName,
  description,
  keywords,
  productSku,
  productPrice,
}: {
  productName: string
  description: string
  keywords?: string[]
  productSku?: string
  productPrice?: number
}): ProductSchema {
  const schema: ProductSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: description.slice(0, 500),
    brand: {
      '@type': 'Brand',
      name: 'Samsung',
    },
    manufacturer: {
      '@type': 'Organization',
      name: 'Samsung Electronics',
    },
  }

  if (productSku) {
    schema.sku = productSku
  }

  if (productPrice) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: productPrice,
      availability: 'https://schema.org/InStock',
      url: `https://www.samsung.com/search/?searchvalue=${encodeURIComponent(productName)}`,
    }
  }

  return schema
}

/**
 * Generate HTML script tag for JSON-LD
 */
export function generateJsonLdScript(schemaResult: SchemaGeneratorResult): string {
  return `<script type="application/ld+json">
${schemaResult.jsonLd}
</script>`
}

/**
 * Validate schema against Schema.org guidelines
 */
export function validateSchema(schema: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be a valid object')
    return { valid: false, errors }
  }

  const schemaObj = schema as Record<string, unknown>

  // Check required @context
  if (schemaObj['@context'] !== 'https://schema.org') {
    errors.push('@context must be "https://schema.org"')
  }

  // Check required @type
  if (!schemaObj['@type']) {
    errors.push('@type is required')
  }

  return { valid: errors.length === 0, errors }
}
