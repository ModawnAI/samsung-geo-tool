/**
 * Samsung GEO Data Ingestion Script
 *
 * Ingests Samsung content data into Pinecone with metadata aligned to
 * SAMSUNG_GEO_IMPLEMENTATION_PLAN.md for effective querying.
 *
 * Key Query Patterns Supported:
 * 1. By contentType: intro, how_to, unboxing, shorts, teaser, brand, esg, documentary, official_replay
 * 2. By videoFormat: feed_16x9, shorts_9x16
 * 3. By productCategory: mobile, laptop, tablet, watch, buds, ring, tv, appliance, all
 * 4. By descriptionSection: opening, body, timestamps, steps, qa, hashtags, full
 * 5. By styleElement: qa_format, hashtag_order, opener_pattern, emoji_usage, vanity_link
 *
 * Usage:
 *   npx tsx scripts/ingest-samsung-data.ts
 */

import { Pinecone } from '@pinecone-database/pinecone'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile)
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      envContent.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
        }
      })
    }
  }
}
loadEnv()

const PINECONE_INDEX_NAME = 'samsung-marketing-playbook'
const PINECONE_NAMESPACE = 'playbook-v1'
const DATA_DIR = path.join(process.cwd(), 'data')

// ============================================================================
// TYPE DEFINITIONS - Aligned with Implementation Plan
// ============================================================================

// Content types from implementation plan Section 5.1
type ContentType = 'intro' | 'unboxing' | 'how_to' | 'shorts' | 'teaser' | 'brand' | 'esg' | 'documentary' | 'official_replay'

// Video formats from implementation plan Section 1.3
type VideoFormat = 'feed_16x9' | 'shorts_9x16'

// Product categories from implementation plan Section 4.3
type ProductCategory = 'mobile' | 'laptop' | 'tablet' | 'watch' | 'buds' | 'ring' | 'tv' | 'appliance' | 'all'

// Description sections from implementation plan Section 1.1
type DescriptionSection = 'opening' | 'body' | 'timestamps' | 'steps' | 'qa' | 'hashtags' | 'disclaimer' | 'full'

// Style elements from implementation plan Section 1.4
type StyleElement = 'qa_format' | 'hashtag_order' | 'opener_pattern' | 'emoji_usage' | 'spacing' | 'capitalization' | 'vanity_link' | 'general'

interface ChunkRecord {
  _id: string
  content: string
  // Core identifiers
  dataSource: string // '2425_csv' | 'description_1031_csv' | 'srt_files'
  recordIndex: number
  // PRIMARY QUERY FIELDS (aligned with implementation plan)
  contentType: ContentType
  videoFormat: VideoFormat
  productCategory: ProductCategory
  descriptionSection: DescriptionSection
  styleElement: StyleElement
  // Content metadata
  videoTitle: string
  videoUrl: string
  year: string
  // Style/correction flags
  hasQASection: boolean
  hasTimestamps: boolean
  hasHashtags: boolean
  hasVanityLink: boolean
  hasSteps: boolean
  hasCorrections: boolean // Samsung style corrections applied
  // Extracted patterns
  hashtagList: string[] // Actual hashtags used
  openerPattern: string // Opening sentence pattern detected
  // Search optimization
  keywords: string[]
  productNames: string[] // Specific product names mentioned
  features: string[] // Galaxy AI features mentioned
}

// ============================================================================
// DETECTION FUNCTIONS - Based on Implementation Plan Definitions
// ============================================================================

function detectProductCategory(text: string): ProductCategory {
  const lower = text.toLowerCase()
  // Mobile: Galaxy S, Z, A series
  if (/galaxy\s*(s2[0-9]|s[0-9]{2}|z\s*f|flip|fold|a[0-9]{2})/i.test(text)) return 'mobile'
  // Laptop: Galaxy Book
  if (/galaxy\s*book|book\s*[0-9]/i.test(text)) return 'laptop'
  // Tablet: Galaxy Tab
  if (/galaxy\s*tab|tab\s*s/i.test(text)) return 'tablet'
  // Watch
  if (/galaxy\s*watch|watch\s*(ultra|[0-9])/i.test(text)) return 'watch'
  // Buds
  if (/galaxy\s*buds|buds\s*[0-9]/i.test(text)) return 'buds'
  // Ring
  if (/galaxy\s*ring/i.test(text)) return 'ring'
  // TV
  if (lower.includes('tv') || lower.includes('neo qled') || lower.includes('qled')) return 'tv'
  // Appliance
  if (lower.includes('bespoke') || lower.includes('refrigerator') || lower.includes('washer') || lower.includes('dryer')) return 'appliance'
  return 'all'
}

// Content type detection based on Implementation Plan Section 1.2
function detectContentType(title: string, explicitCategory?: string): ContentType {
  const lower = title.toLowerCase()

  // Check explicit category first
  if (explicitCategory) {
    const cat = explicitCategory.toLowerCase()
    if (cat.includes('intro')) return 'intro'
    if (cat.includes('how')) return 'how_to'
    if (cat.includes('unbox')) return 'unboxing'
    if (cat.includes('shorts')) return 'shorts'
    if (cat.includes('teaser') || cat.includes('invitation')) return 'teaser'
    if (cat.includes('replay')) return 'official_replay'
  }

  // Pattern matching from implementation plan
  if (lower.includes('introduction') || lower.includes('introducing') || lower.includes('official film')) return 'intro'
  if (lower.includes('how to') || lower.includes('how-to') || lower.includes('guide')) return 'how_to'
  if (lower.includes('unbox')) return 'unboxing'
  if (lower.includes('teaser') || lower.includes('invitation') || /coming\s*soon/i.test(lower)) return 'teaser'
  if (lower.includes('replay') || lower.includes('unpacked')) return 'official_replay'
  if (lower.includes('epic tips') || lower.includes('shorts')) return 'shorts'
  if (lower.includes('documentary') || lower.includes('concrete dreams') || lower.includes('breaking boundaries') || lower.includes('next wave')) return 'documentary'
  if (lower.includes('voices of galaxy') || lower.includes('sustainability') || lower.includes('generation17')) return 'esg'
  if (lower.includes('campaign') || lower.includes('open always wins')) return 'brand'

  return 'intro' // Default
}

function detectVideoFormat(url: string, placement?: string, videoType?: string): VideoFormat {
  if (placement?.toLowerCase() === 'shorts') return 'shorts_9x16'
  if (videoType?.toLowerCase() === 'shorts') return 'shorts_9x16'
  if (url.includes('/shorts/')) return 'shorts_9x16'
  return 'feed_16x9'
}

// Detect description sections present in content
function detectDescriptionSections(content: string): {
  hasQA: boolean
  hasTimestamps: boolean
  hasHashtags: boolean
  hasSteps: boolean
  hasVanityLink: boolean
  primarySection: DescriptionSection
} {
  const hasQA = /Q:\s*[^?]+\?[\s\S]*?A:/i.test(content)
  const hasTimestamps = /\d{2}:\d{2}\s+\w+/i.test(content)
  const hasHashtags = /#[A-Za-z]+/i.test(content)
  const hasSteps = /step\s*[0-9]|follow\s*these\s*steps/i.test(content)
  const hasVanityLink = /smsng\.co/i.test(content)

  // Determine primary section
  let primarySection: DescriptionSection = 'full'
  if (hasQA && !hasTimestamps && !hasSteps) primarySection = 'qa'
  else if (hasTimestamps && !hasQA) primarySection = 'timestamps'
  else if (hasSteps) primarySection = 'steps'
  else if (hasHashtags && content.length < 300) primarySection = 'hashtags'

  return { hasQA, hasTimestamps, hasHashtags, hasSteps, hasVanityLink, primarySection }
}

// Detect style elements present (from implementation plan Section 1.4)
function detectStyleElement(content: string, title: string): StyleElement {
  // Q&A format detection (CRITICAL - P0-1)
  if (/Q:\s*[^?]+\?[\s\S]*?A:/i.test(content)) return 'qa_format'

  // Hashtag patterns (CRITICAL - P0-2)
  if (/#GalaxyAI.*#Samsung|#\w+.*#\w+.*#\w+/i.test(content)) return 'hashtag_order'

  // Opener patterns (P1-3)
  if (/^(This is the official|Introducing the|Unbox the|Learn how)/i.test(content)) return 'opener_pattern'

  // Vanity link
  if (/smsng\.co/i.test(content)) return 'vanity_link'

  // Emoji usage
  if (/[📦🌟✨🔍⌨️🚀🎨🎬🤖🖊️]/u.test(content)) return 'emoji_usage'

  return 'general'
}

// Detect opener pattern type (from Appendix A)
function detectOpenerPattern(content: string): string {
  if (/This is the official introduction video/i.test(content)) return 'intro_official'
  if (/Introducing the/i.test(content)) return 'intro_introducing'
  if (/This is the official video guide/i.test(content)) return 'howto_official'
  if (/Learn how to/i.test(content)) return 'howto_learn'
  if (/Unbox the/i.test(content)) return 'unboxing_unbox'
  if (/Something .* is coming/i.test(content)) return 'teaser_mystery'
  if (/Get ready for/i.test(content)) return 'teaser_getready'
  return 'none'
}

// Extract hashtags in order
function extractHashtags(content: string): string[] {
  const matches = content.match(/#[A-Za-z0-9]+/g) || []
  return matches
}

// Extract product names
function extractProductNames(text: string): string[] {
  const products: string[] = []
  const patterns = [
    /Galaxy\s+S2[0-9]\s*(Ultra|Plus|\+)?/gi,
    /Galaxy\s+Z\s*(Flip|Fold)\s*[0-9]?/gi,
    /Galaxy\s+Book\s*[0-9]*\s*(Pro|Ultra|Edge)?(\s*360)?/gi,
    /Galaxy\s+Watch\s*[0-9]*\s*(Ultra)?/gi,
    /Galaxy\s+Buds\s*[0-9]*\s*(Pro|FE)?/gi,
    /Galaxy\s+Tab\s*S[0-9]+\s*(Ultra|\+)?/gi,
    /Galaxy\s+Ring/gi,
    /Galaxy\s+A[0-9]+/gi,
  ]

  for (const pattern of patterns) {
    const matches = text.match(pattern) || []
    products.push(...matches.map(m => m.trim()))
  }

  return [...new Set(products)]
}

// Extract Galaxy AI features (from implementation plan)
function extractFeatures(text: string): string[] {
  const features: string[] = []
  const featureList = [
    'Galaxy AI', 'Circle to Search', 'Live Translate', 'Chat Assist', 'Note Assist',
    'Photo Assist', 'Interpreter', 'Transcript Assist', 'AI Select', 'Writing Assist',
    'Browsing Assist', 'Quick Share', 'Nightography', 'Generative Edit', 'Instant Slow-mo',
    'Edit Suggestion', 'Game Booster', 'Knox', 'One UI', 'S Pen', 'Copilot',
    'NPU', 'on-device AI', 'Auto Blocker'
  ]

  for (const feature of featureList) {
    if (text.toLowerCase().includes(feature.toLowerCase())) {
      features.push(feature)
    }
  }

  return features
}

// Extract search keywords
function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`
  const keywords: string[] = []

  // Add product names
  keywords.push(...extractProductNames(text))

  // Add features
  keywords.push(...extractFeatures(text))

  // Add content type indicators
  if (/introduction|intro/i.test(text)) keywords.push('introduction')
  if (/how.to|guide|tutorial/i.test(text)) keywords.push('how-to', 'tutorial')
  if (/unbox/i.test(text)) keywords.push('unboxing')
  if (/shorts|tips/i.test(text)) keywords.push('shorts')

  return [...new Set(keywords)].slice(0, 20)
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSVSimple(content: string): Record<string, string>[] {
  const lines = content.split('\n')
  const results: Record<string, string>[] = []

  // Find header
  let headerIdx = 0
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].includes('Title') || lines[i].includes('Youtube Title') || lines[i].includes('URL')) {
      headerIdx = i
      break
    }
  }

  const headerLine = lines[headerIdx]
  const headers: string[] = []
  let inQuote = false
  let field = ''

  for (const char of headerLine) {
    if (char === '"') {
      inQuote = !inQuote
    } else if (char === ',' && !inQuote) {
      headers.push(field.trim())
      field = ''
    } else {
      field += char
    }
  }
  headers.push(field.trim())

  // Parse rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values: string[] = []
    inQuote = false
    field = ''

    for (const char of line) {
      if (char === '"') {
        inQuote = !inQuote
      } else if (char === ',' && !inQuote) {
        values.push(field.trim())
        field = ''
      } else {
        field += char
      }
    }
    values.push(field.trim())

    if (values.length >= 3) {
      const record: Record<string, string> = {}
      headers.forEach((h, idx) => {
        record[h] = values[idx] || ''
      })
      results.push(record)
    }
  }

  return results
}

// ============================================================================
// DATA PROCESSORS
// ============================================================================

async function process2425CSV(): Promise<ChunkRecord[]> {
  const records: ChunkRecord[] = []
  const filePath = path.join(DATA_DIR, '2425.csv')

  if (!fs.existsSync(filePath)) {
    console.log('   ⚠️ 2425.csv not found')
    return records
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSVSimple(content)

  console.log(`   Found ${rows.length} rows in 2425.csv`)

  let idx = 0
  for (const row of rows) {
    const title = row['Youtube Title'] || row['Title'] || ''
    const copy = row['Copy'] || ''
    const url = row['URL'] || ''
    const videoType = row['IG/YT/TW Type'] || 'Video'
    const year = row['Year'] || '2024'

    if (!title || !copy || copy.length < 30) continue

    const contentType = detectContentType(title)
    const videoFormat = detectVideoFormat(url, undefined, videoType)
    const productCategory = detectProductCategory(title + ' ' + copy)
    const sections = detectDescriptionSections(copy)
    const styleElement = detectStyleElement(copy, title)
    const openerPattern = detectOpenerPattern(copy)
    const hashtags = extractHashtags(copy)
    const productNames = extractProductNames(title + ' ' + copy)
    const features = extractFeatures(title + ' ' + copy)
    const keywords = extractKeywords(title, copy)

    const record: ChunkRecord = {
      _id: `yt_${idx}`,
      content: `[SAMSUNG YOUTUBE EXAMPLE - ${contentType.toUpperCase()}]

Title: ${title}
Format: ${videoFormat === 'shorts_9x16' ? 'Shorts (9:16)' : 'Feed (16:9)'}
Product: ${productCategory}

Description:
${copy}`,
      dataSource: '2425_csv',
      recordIndex: idx,
      contentType,
      videoFormat,
      productCategory,
      descriptionSection: sections.primarySection,
      styleElement,
      videoTitle: title,
      videoUrl: url,
      year,
      hasQASection: sections.hasQA,
      hasTimestamps: sections.hasTimestamps,
      hasHashtags: sections.hasHashtags,
      hasVanityLink: sections.hasVanityLink,
      hasSteps: sections.hasSteps,
      hasCorrections: false,
      hashtagList: hashtags,
      openerPattern,
      keywords,
      productNames,
      features,
    }

    records.push(record)
    idx++
  }

  return records
}

async function processDescription1031CSV(): Promise<ChunkRecord[]> {
  const records: ChunkRecord[] = []
  const filePath = path.join(DATA_DIR, 'description_1031.csv')

  if (!fs.existsSync(filePath)) {
    console.log('   ⚠️ description_1031.csv not found')
    return records
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // This CSV has complex structure, extract key patterns
  // Look for entries with Q: A: format (corrected Samsung style)
  const qaPattern = /Q:\s*([^?]+\?)[\s\S]*?A:\s*([^Q]+?)(?=Q:|#|$)/gi
  const urlPattern = /https:\/\/www\.youtube\.com\/[^\s,]+/g

  // Split by row numbers to find individual entries
  const rowMatches = content.match(/\n\d+,\d{4},\d{4}-\d{2}-\d{2},[^]*?(?=\n\d+,\d{4},|\n*$)/g) || []

  console.log(`   Found ${rowMatches.length} potential entries in description_1031.csv`)

  let idx = 0
  for (const rowContent of rowMatches) {
    // Extract URL
    const urlMatch = rowContent.match(urlPattern)
    const url = urlMatch ? urlMatch[0] : ''

    // Extract year
    const yearMatch = rowContent.match(/,(\d{4}),\d{4}-/)
    const year = yearMatch ? yearMatch[1] : '2024'

    // Find content category
    const categoryMatch = rowContent.match(/,(Intro|How to|How-to|Unboxing|Invitation|Guided Demo|Shorts|Teaser|Replay|CXP),/i)
    const explicitCategory = categoryMatch ? categoryMatch[1] : ''

    // Find placement (Feed/Shorts)
    const placementMatch = rowContent.match(/,(Feed|Shorts),/i)
    const placement = placementMatch ? placementMatch[1] : 'Feed'

    // Find title
    const titleMatch = rowContent.match(/,([^,]*(?:Samsung|Galaxy)[^,]*),https/i)
    const title = titleMatch ? titleMatch[1].trim() : ''

    // Check for Q&A content (the corrected format we want)
    const hasQA = qaPattern.test(rowContent)
    qaPattern.lastIndex = 0 // Reset regex

    // Check for style corrections
    const hasCorrections = /Rearranged hashtags|Changed .Q\.|Changed .A\.|Decapitalized|Added spacing|as per usual conventions/i.test(rowContent)

    if (!title || !url) continue

    // Extract the description portion (look for corrected content)
    let description = ''
    const qaMatches = [...rowContent.matchAll(/Q:\s*([^?]+\?)[\s\S]*?A:\s*([^Q#]+)/gi)]
    if (qaMatches.length > 0) {
      description = qaMatches.map(m => `Q: ${m[1].trim()}\nA: ${m[2].trim()}`).join('\n\n')
    }

    // Extract hashtags
    const hashtags = extractHashtags(rowContent)

    const contentType = detectContentType(title, explicitCategory)
    const videoFormat = detectVideoFormat(url, placement)
    const productCategory = detectProductCategory(title + ' ' + rowContent)
    const sections = detectDescriptionSections(rowContent)
    const styleElement = hasQA ? 'qa_format' : (hashtags.length > 2 ? 'hashtag_order' : 'general')
    const openerPattern = detectOpenerPattern(rowContent)
    const productNames = extractProductNames(title + ' ' + rowContent)
    const features = extractFeatures(title + ' ' + rowContent)
    const keywords = extractKeywords(title, rowContent)

    // Only include entries with meaningful corrected content
    if (description.length < 50 && !hasCorrections) continue

    const record: ChunkRecord = {
      _id: `desc_${idx}`,
      content: `[SAMSUNG CORRECTED EXAMPLE - ${contentType.toUpperCase()}]
${hasCorrections ? '⚠️ Contains Samsung style corrections (Q:/A: format, hashtag order)' : ''}

Title: ${title}
Format: ${videoFormat === 'shorts_9x16' ? 'Shorts (9:16)' : 'Feed (16:9)'}
Product: ${productCategory}
Content Type: ${explicitCategory || contentType}

${description ? `Q&A Section:\n${description}` : ''}

Hashtags: ${hashtags.join(' ')}`,
      dataSource: 'description_1031_csv',
      recordIndex: idx,
      contentType,
      videoFormat,
      productCategory,
      descriptionSection: hasQA ? 'qa' : sections.primarySection,
      styleElement,
      videoTitle: title,
      videoUrl: url,
      year,
      hasQASection: hasQA,
      hasTimestamps: sections.hasTimestamps,
      hasHashtags: hashtags.length > 0,
      hasVanityLink: sections.hasVanityLink,
      hasSteps: sections.hasSteps,
      hasCorrections,
      hashtagList: hashtags,
      openerPattern,
      keywords,
      productNames,
      features,
    }

    records.push(record)
    idx++
  }

  return records
}

async function processSRTFiles(): Promise<ChunkRecord[]> {
  const records: ChunkRecord[] = []
  const srtDir = path.join(DATA_DIR, 'GEO quick-fix SRT 파일')

  if (!fs.existsSync(srtDir)) {
    console.log('   ⚠️ SRT directory not found')
    return records
  }

  // Find all SRT files
  const srtFiles: string[] = []
  function findSRTs(dir: string) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      if (fs.statSync(fullPath).isDirectory()) {
        findSRTs(fullPath)
      } else if (item.endsWith('.srt')) {
        srtFiles.push(fullPath)
      }
    }
  }
  findSRTs(srtDir)

  console.log(`   Found ${srtFiles.length} SRT files`)

  let idx = 0
  for (const filePath of srtFiles) {
    const fileName = path.basename(filePath, '.srt')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Parse SRT to text
    const lines = content.replace(/^\uFEFF/, '').split('\n')
    const textLines: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^\d+$/.test(trimmed)) continue // Skip sequence numbers
      if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) continue // Skip timestamps
      if (!trimmed) continue
      textLines.push(trimmed)
    }
    const transcript = textLines.join(' ')

    if (transcript.length < 20) continue

    // Extract info from filename
    const contentType = detectContentType(fileName)
    const videoFormat = fileName.includes('9x16') ? 'shorts_9x16' as VideoFormat : 'feed_16x9' as VideoFormat
    const productCategory = detectProductCategory(fileName)
    const productNames = extractProductNames(fileName)
    const features = extractFeatures(fileName + ' ' + transcript)
    const keywords = extractKeywords(fileName, transcript)

    const record: ChunkRecord = {
      _id: `srt_${idx}`,
      content: `[SAMSUNG VIDEO TRANSCRIPT - ${contentType.toUpperCase()}]

File: ${fileName}
Format: ${videoFormat === 'shorts_9x16' ? 'Shorts (9:16)' : 'Feed (16:9)'}
Product: ${productCategory}

Transcript:
${transcript}`,
      dataSource: 'srt_files',
      recordIndex: idx,
      contentType,
      videoFormat,
      productCategory,
      descriptionSection: 'full',
      styleElement: 'general',
      videoTitle: fileName,
      videoUrl: '',
      year: '2025',
      hasQASection: false,
      hasTimestamps: false,
      hasHashtags: false,
      hasVanityLink: false,
      hasSteps: false,
      hasCorrections: false,
      hashtagList: [],
      openerPattern: 'none',
      keywords,
      productNames,
      features,
    }

    records.push(record)
    idx++
  }

  return records
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70))
  console.log('Samsung GEO Data Ingestion (Implementation Plan Aligned)')
  console.log('='.repeat(70))
  console.log()

  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not set')
    process.exit(1)
  }

  const pinecone = new Pinecone({ apiKey })
  const index = pinecone.index(PINECONE_INDEX_NAME)
  const namespace = index.namespace(PINECONE_NAMESPACE)

  // Step 1: Clear
  console.log('🗑️  Step 1: Clearing existing vectors...')
  try {
    await namespace.deleteAll()
    console.log('   ✅ Cleared namespace')
  } catch (e) {
    console.log('   ⚠️ Namespace may be empty')
  }
  await new Promise(r => setTimeout(r, 3000))

  // Step 2: Process files
  console.log()
  console.log('📂 Step 2: Processing data files...')
  console.log()

  console.log('   [2425.csv] YouTube content examples...')
  const records1 = await process2425CSV()
  console.log(`   ✅ ${records1.length} records`)

  console.log()
  console.log('   [description_1031.csv] Corrected descriptions with Q&A...')
  const records2 = await processDescription1031CSV()
  console.log(`   ✅ ${records2.length} records`)

  console.log()
  console.log('   [SRT files] Video transcripts...')
  const records3 = await processSRTFiles()
  console.log(`   ✅ ${records3.length} records`)

  const allRecords = [...records1, ...records2, ...records3]

  // Print metadata distribution
  console.log()
  console.log('📊 Metadata Distribution:')
  const contentTypes: Record<string, number> = {}
  const videoFormats: Record<string, number> = {}
  const productCategories: Record<string, number> = {}

  for (const r of allRecords) {
    contentTypes[r.contentType] = (contentTypes[r.contentType] || 0) + 1
    videoFormats[r.videoFormat] = (videoFormats[r.videoFormat] || 0) + 1
    productCategories[r.productCategory] = (productCategories[r.productCategory] || 0) + 1
  }

  console.log('   Content Types:', contentTypes)
  console.log('   Video Formats:', videoFormats)
  console.log('   Product Categories:', productCategories)

  // Step 3: Upsert
  console.log()
  console.log(`⬆️  Step 3: Upserting ${allRecords.length} records...`)

  const batchSize = 50
  let upserted = 0

  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize)
    try {
      await namespace.upsertRecords(batch)
      upserted += batch.length
      console.log(`   ✅ ${upserted}/${allRecords.length} (${((upserted/allRecords.length)*100).toFixed(0)}%)`)
    } catch (e) {
      console.error(`   ❌ Batch error:`, e)
    }
  }

  // Step 4: Verify
  console.log()
  console.log('🔍 Step 4: Verifying...')
  await new Promise(r => setTimeout(r, 2000))

  try {
    const stats = await index.describeIndexStats()
    console.log(`   Vectors in namespace: ${stats.namespaces?.[PINECONE_NAMESPACE]?.recordCount || 'N/A'}`)
  } catch (e) {
    console.log('   Could not get stats')
  }

  console.log()
  console.log('='.repeat(70))
  console.log('✅ INGESTION COMPLETE')
  console.log('='.repeat(70))
  console.log()
  console.log('Query Examples (aligned with implementation plan):')
  console.log('  • contentType = "intro" → Introduction films')
  console.log('  • contentType = "how_to" → How-to guides')
  console.log('  • contentType = "shorts" → Shorts content')
  console.log('  • videoFormat = "feed_16x9" → Full descriptions')
  console.log('  • videoFormat = "shorts_9x16" → Brief hooks')
  console.log('  • productCategory = "mobile" → Galaxy S/Z content')
  console.log('  • descriptionSection = "qa" → Q&A examples')
  console.log('  • styleElement = "qa_format" → Q:/A: format examples')
  console.log('  • styleElement = "hashtag_order" → Hashtag ordering examples')
  console.log('  • hasCorrections = true → Samsung-corrected content')
  console.log()
}

main().catch(console.error)
